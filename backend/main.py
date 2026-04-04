"""
FastAPI backend for B-klasa Bytom Football Dashboard.
Results scraped exclusively from 90minut.pl; all stats computed from those results.
Schedule (upcoming fixtures) still fetched from regionalnyfutbol.pl.
"""

import json
import os
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
load_dotenv()  # loads .env from project root if present

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scrapers.scraper_90minut import (
    fetch_results as fetch_results_90,
)
from scrapers.scraper_lnp import (
    get_match_ids_from_90minut,
    fetch_match_data,
    fetch_all_players_stats,
    _load_cache as lnp_cache_load,
)
from scrapers.scraper_regionalnyfutbol import (
    fetch_scorers as fetch_scorers_rf,
    fetch_cards as fetch_cards_rf,
    fetch_schedule as fetch_schedule_rf,
)
from stats.advanced import (
    compute_all_advanced_stats,
    compute_league_stats,
    compute_elo_ratings,
    compute_form_table,
    compute_scoreline_stats,
    compute_h2h_matrix,
    compute_title_relegation,
    compute_positions_over_time,
)
from stats.round_summary import generate_round_summary

app = FastAPI(title="B-klasa Bytom API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory cache with TTL
_cache: dict[str, tuple[Any, float]] = {}
CACHE_TTL = 900  # 15 minutes

# Manual results: scores entered by the user before they appear on 90minut.pl.
# Stored as a JSON list; merged into results in _get_clean_data().
# Scraped data always wins — if the same fixture exists in 90minut data the
# manual entry is silently ignored.
_MANUAL_RESULTS_FILE = Path(__file__).parent / "manual_results.json"

def _load_manual_results() -> list[dict]:
    try:
        if _MANUAL_RESULTS_FILE.exists():
            return json.loads(_MANUAL_RESULTS_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[manual_results] Failed to load: {exc}")
    return []

def _save_manual_results(results: list[dict]) -> None:
    try:
        _MANUAL_RESULTS_FILE.write_text(
            json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as exc:
        print(f"[manual_results] Failed to save: {exc}")


_MANUAL_PASSPHRASE = os.environ.get("MANUAL_PASSPHRASE", "")


def _check_passphrase(x_passphrase: str | None) -> None:
    if not _MANUAL_PASSPHRASE:
        raise HTTPException(503, "MANUAL_PASSPHRASE not configured on server")
    if x_passphrase != _MANUAL_PASSPHRASE:
        raise HTTPException(403, "Invalid passphrase")


class ManualResultIn(BaseModel):
    round: int
    home_team: str
    home_goals: int
    away_goals: int
    away_team: str
    date: str = ""


@app.get("/api/manual-results")
def list_manual_results():
    return {"manual_results": _load_manual_results()}


@app.post("/api/manual-results", status_code=201)
def add_manual_result(body: ManualResultIn, x_passphrase: str | None = Header(default=None)):
    _check_passphrase(x_passphrase)
    results = _load_manual_results()
    entry = {
        "round": body.round,
        "home_team": body.home_team,
        "home_goals": body.home_goals,
        "away_goals": body.away_goals,
        "away_team": body.away_team,
        "date": body.date,
        "source": "manual",
    }
    results.append(entry)
    _save_manual_results(results)
    return {"added": entry, "total": len(results)}


@app.delete("/api/manual-results/{idx}")
def delete_manual_result(idx: int, x_passphrase: str | None = Header(default=None)):
    _check_passphrase(x_passphrase)
    results = _load_manual_results()
    if idx < 0 or idx >= len(results):
        raise HTTPException(404, "Manual result not found")
    removed = results.pop(idx)
    _save_manual_results(results)
    return {"removed": removed, "total": len(results)}


# Round-summary cache: keyed by round number so it never expires
# unless new round data arrives (different round key = new generation).
# Also persisted to disk so server restarts don't waste API quota.
_SUMMARY_CACHE_FILE = Path(__file__).parent / "round_summary_cache.json"

def _load_summary_cache() -> dict[int, dict]:
    """Load persisted round summaries from disk on startup."""
    try:
        if _SUMMARY_CACHE_FILE.exists():
            raw = json.loads(_SUMMARY_CACHE_FILE.read_text(encoding="utf-8"))
            return {int(k): v for k, v in raw.items()}
    except Exception as exc:
        print(f"[summary_cache] Failed to load cache from disk: {exc}")
    return {}

def _save_summary_cache(cache: dict[int, dict]) -> None:
    """Persist round summaries to disk."""
    try:
        _SUMMARY_CACHE_FILE.write_text(
            json.dumps({str(k): v for k, v in cache.items()}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as exc:
        print(f"[summary_cache] Failed to save cache to disk: {exc}")

_summary_by_round: dict[int, dict] = _load_summary_cache()

# Teams that have withdrawn from the competition this season.
# Their results are annulled and they are excluded from all stats.
WITHDRAWN_TEAMS: set[str] = {"Nadzieja II Bytom"}
# First-half results (rounds 1–16) involving withdrawn teams still count.
# Only unplayed return fixtures (round 17+) are cancelled.
WITHDRAWAL_FROM_ROUND: int = 17


def compute_standings_from_results(results: list[dict]) -> list[dict]:
    """Build a full standings table purely from match results.

    Only includes teams that appear in results (excluding WITHDRAWN_TEAMS).
    Stats are computed from scratch — no external standings source needed.
    """
    stats: dict = defaultdict(lambda: {
        "played": 0, "won": 0, "drawn": 0, "lost": 0,
        "gf": 0, "ga": 0, "points": 0,
    })

    for r in results:
        ht = r.get("home_team", "")
        at = r.get("away_team", "")
        hg = r.get("home_goals")
        ag = r.get("away_goals")
        if not ht or not at or hg is None or ag is None:
            continue
        # Skip withdrawn teams themselves from appearing in the standings,
        # but their first-half results still count for opponents (already
        # handled by _filter_results — don't double-filter here).
        for team, gf, ga in [(ht, hg, ag), (at, ag, hg)]:
            s = stats[team]
            s["played"] += 1
            s["gf"] += gf
            s["ga"] += ga
            if gf > ga:
                s["won"] += 1
                s["points"] += 3
            elif gf == ga:
                s["drawn"] += 1
                s["points"] += 1
            else:
                s["lost"] += 1

    standings = []
    for name, s in stats.items():
        if name in WITHDRAWN_TEAMS:
            continue  # don't include withdrawn teams in the table
        gf, ga = s["gf"], s["ga"]
        standings.append({
            "position": 0,  # filled below
            "name": name,
            "club_id": None,
            "played": s["played"],
            "won": s["won"],
            "drawn": s["drawn"],
            "lost": s["lost"],
            "goals_for": gf,
            "goals_against": ga,
            "goal_difference": gf - ga,
            "points": s["points"],
            "source": "computed",
        })

    standings.sort(key=lambda t: (t["points"], t["goal_difference"], t["goals_for"]), reverse=True)
    for i, t in enumerate(standings, 1):
        t["position"] = i

    return standings


def _filter_results(results: list[dict]) -> list[dict]:
    """Keep all results as-is — walkovers for withdrawn teams' spring fixtures
    are already recorded as 3-0 on 90minut.pl and count toward opponents' stats.
    Nadzieja is excluded from the standings table in compute_standings_from_results.
    """
    return results


def _cached(key: str, fn, *args, **kwargs):
    now = time.time()
    if key in _cache:
        value, ts = _cache[key]
        if now - ts < CACHE_TTL:
            return value
    value = fn(*args, **kwargs)
    _cache[key] = (value, now)
    return value


@app.get("/api/health")
def health():
    return {"status": "ok", "sources": ["90minut.pl"]}


@app.get("/api/standings")
def get_standings():
    standings, _ = _get_clean_data()
    if not standings:
        raise HTTPException(503, "Could not compute standings from results")
    return {"standings": standings, "count": len(standings)}


@app.get("/api/results")
def get_results():
    _, results = _get_clean_data()
    return {"results": results, "count": len(results)}


@app.get("/api/scorers")
def get_scorers():
    scorers = _cached("scorers_rf", fetch_scorers_rf)
    return {"scorers": scorers, "count": len(scorers)}


@app.get("/api/cards")
def get_cards():
    cards = _cached("cards_rf", fetch_cards_rf)
    return {"cards": cards, "count": len(cards)}


@app.get("/api/schedule")
def get_schedule():
    schedule = _cached("schedule_rf", fetch_schedule_rf)
    return {"schedule": schedule, "count": len(schedule)}


@app.get("/api/advanced-stats")
def get_advanced_stats():
    standings, results = _get_clean_data()
    if not standings:
        raise HTTPException(503, "Could not compute advanced stats — no results data")
    advanced = compute_all_advanced_stats(standings, results)
    league = compute_league_stats(results)
    return {
        "teams": advanced,
        "league": league,
        "results_count": len(results),
    }


@app.get("/api/team/{team_name}")
def get_team(team_name: str):
    standings, results = _get_clean_data()
    team_name_lower = team_name.lower()
    team_standing = next(
        (t for t in standings if team_name_lower in t.get("name", "").lower()),
        None
    )
    if not team_standing:
        raise HTTPException(404, f"Team '{team_name}' not found")
    advanced = compute_all_advanced_stats([team_standing], results)
    team_results = [
        r for r in results
        if team_name_lower in r.get("home_team", "").lower()
        or team_name_lower in r.get("away_team", "").lower()
    ]
    return {
        "team": advanced[0] if advanced else team_standing,
        "matches": team_results,
    }


@app.get("/api/match-ids")
def get_match_ids():
    """Return all LNP match UUIDs found on 90minut.pl."""
    ids = _cached("lnp_match_ids", get_match_ids_from_90minut)
    return {"match_ids": ids, "count": len(ids)}


@app.get("/api/players")
def get_players():
    """Return aggregated player stats from cached LNP match data."""
    ids = _cached("lnp_match_ids", get_match_ids_from_90minut)
    stats = fetch_all_players_stats(ids)
    players_list = list(stats.values())
    return {"players": players_list, "count": len(players_list)}


@app.get("/api/match/{match_id}")
def get_match(match_id: str):
    """Return detailed data for a single LNP match (cached or freshly scraped)."""
    if not re.match(r"^[a-f0-9\-]{36}$", match_id):
        raise HTTPException(400, "Invalid match ID format")
    data = fetch_match_data(match_id)
    if not data:
        raise HTTPException(404, f"Match '{match_id}' not found or not yet scraped")
    return data


@app.post("/api/refresh")
def refresh_cache():
    """Force clear all cached data."""
    _cache.clear()
    return {"status": "cache cleared"}


def _latest_completed_round(results: list[dict], schedule: list[dict]) -> int:
    """Return the highest round number where all fixtures have been played.

    A round is 'complete' when it has at least one result AND has no truly
    future unplayed fixtures. We exclude:
      - fixtures involving withdrawn teams (walkovers, may linger in schedule)
      - fixtures whose date is today or in the past (regionalnyfutbol is slow
        to remove same-day results from the upcoming schedule)
    """
    import datetime
    today = datetime.date.today().isoformat()

    played_rounds = {r.get("round") for r in results if r.get("round")}

    real_unplayed = set()
    for f in schedule:
        rnd = f.get("round")
        if not rnd:
            continue
        if f.get("home_team", "") in WITHDRAWN_TEAMS or f.get("away_team", "") in WITHDRAWN_TEAMS:
            continue
        fixture_date = f.get("date", "")
        if fixture_date and fixture_date <= today:
            continue  # already happened (or today) — regionalnyfutbol just hasn't removed it yet
        real_unplayed.add(rnd)

    completed = played_rounds - real_unplayed
    return max(completed, default=0)


def _get_round_summary(standings, results, schedule, advanced, form_table) -> dict:
    """Auto-generate and cache a summary for the latest fully-completed round.

    Never regenerates a round that already has a cached summary — the cache
    is keyed by round number so it persists for the lifetime of the process.
    """
    target_round = _latest_completed_round(results, schedule)
    if not target_round:
        return {"round": None, "text": None, "error": "no completed round found"}

    # Serve from cache if already generated for this round
    if target_round in _summary_by_round:
        return _summary_by_round[target_round]

    # Generate once for this round
    summary = generate_round_summary(standings, results, advanced, form_table)
    if summary and summary.get("round") and not summary.get("error"):
        _summary_by_round[summary["round"]] = summary
        _save_summary_cache(_summary_by_round)
        return summary

    return summary or {"round": target_round, "text": None, "error": "generation failed"}


@app.get("/api/round-summary")
def get_round_summary():
    """Return AI-generated summary for the latest fully-completed round.
    Generated once automatically; cached indefinitely until a new round completes.
    """
    standings, results = _get_clean_data()
    schedule = _cached("schedule_rf", fetch_schedule_rf)
    advanced = compute_all_advanced_stats(standings, results) if standings else []
    form_table = compute_form_table(results, last_n=5)
    return _get_round_summary(standings, results, schedule, advanced, form_table)


def _get_clean_data() -> tuple[list[dict], list[dict]]:
    """Return standings and results computed purely from 90minut.pl results,
    supplemented by any manually entered results that haven't yet been scraped.

    Scraped data always wins: a manual entry is dropped if a result with the
    same (round, home_team, away_team) already exists in the scraped data.
    """
    raw_results = _cached("results_90", fetch_results_90)
    results = _filter_results(raw_results)

    # Build a lookup key set for deduplication
    scraped_keys = {
        (r.get("round"), r.get("home_team"), r.get("away_team"))
        for r in results
    }

    for m in _load_manual_results():
        key = (m.get("round"), m.get("home_team"), m.get("away_team"))
        if key not in scraped_keys:
            results = results + [m]

    standings = compute_standings_from_results(results)
    return standings, results


@app.get("/api/elo")
def get_elo():
    _, results = _get_clean_data()
    elo = compute_elo_ratings(results)
    return {"elo": elo, "count": len(elo)}


@app.get("/api/form-table")
def get_form_table():
    _, results = _get_clean_data()
    ft = compute_form_table(results, last_n=5)
    return {"form_table": ft, "count": len(ft)}


@app.get("/api/scoreline-stats")
def get_scoreline_stats():
    _, results = _get_clean_data()
    return compute_scoreline_stats(results)


@app.get("/api/h2h-matrix")
def get_h2h_matrix():
    standings, results = _get_clean_data()
    return compute_h2h_matrix(results, standings)


@app.get("/api/title-relegation")
def get_title_relegation():
    standings, results = _get_clean_data()
    tr = compute_title_relegation(standings, results)
    return {"title_relegation": tr, "count": len(tr)}


def _warm_summary_cache(standings, results, schedule, advanced, form_table):
    """Background task: generate summary if not already cached for the latest completed round."""
    target = _latest_completed_round(results, schedule)
    if target and target not in _summary_by_round:
        _get_round_summary(standings, results, schedule, advanced, form_table)


@app.get("/api/all")
def get_all(background_tasks: BackgroundTasks):
    """Single endpoint to fetch everything at once (for dashboard init)."""
    standings, results = _get_clean_data()
    schedule = _cached("schedule_rf", fetch_schedule_rf)

    advanced = compute_all_advanced_stats(standings, results) if standings else []
    league = compute_league_stats(results)
    elo = compute_elo_ratings(results)
    form_table = compute_form_table(results, last_n=5)
    scoreline_stats = compute_scoreline_stats(results)
    h2h = compute_h2h_matrix(results, standings) if standings else {"teams": [], "matrix": {}}
    title_relegation = compute_title_relegation(standings, results) if standings else []

    positions_over_time = compute_positions_over_time(results)

    # Include summary if already cached; otherwise kick off generation in background
    completed_round = _latest_completed_round(results, schedule)
    round_summary = _summary_by_round.get(completed_round)
    if not round_summary:
        background_tasks.add_task(
            _warm_summary_cache, standings, results, schedule, advanced, form_table
        )

    return {
        "standings": standings,
        "advanced_teams": advanced,
        "results": results,
        "schedule": schedule,
        "league": league,
        "elo": elo,
        "form_table": form_table,
        "scoreline_stats": scoreline_stats,
        "h2h_matrix": h2h,
        "title_relegation": title_relegation,
        "positions_over_time": positions_over_time,
        "round_summary": round_summary,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
