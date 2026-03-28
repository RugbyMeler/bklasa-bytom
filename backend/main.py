"""
FastAPI backend for B-klasa Bytom Football Dashboard.
Aggregates data from 90minut.pl and regionalnyfutbol.pl.
"""

import re
import time
from functools import lru_cache
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from scrapers.scraper_90minut import (
    fetch_standings as fetch_standings_90,
    fetch_results as fetch_results_90,
)
from scrapers.scraper_lnp import (
    get_match_ids_from_90minut,
    fetch_match_data,
    fetch_all_players_stats,
    _load_cache as lnp_cache_load,
)
from scrapers.scraper_regionalnyfutbol import (
    fetch_standings as fetch_standings_rf,
    fetch_results as fetch_results_rf,
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

# Teams that have withdrawn from the competition this season.
# Their results are annulled and they are excluded from all stats.
WITHDRAWN_TEAMS: set[str] = {"Nadzieja II Bytom"}


def _filter_withdrawn(standings: list[dict], results: list[dict]) -> tuple[list[dict], list[dict]]:
    """Remove withdrawn teams and all their matches from the data."""
    clean_standings = [t for t in standings if t.get("name", "") not in WITHDRAWN_TEAMS]
    clean_results = [
        r for r in results
        if r.get("home_team", "") not in WITHDRAWN_TEAMS
        and r.get("away_team", "") not in WITHDRAWN_TEAMS
    ]
    # Re-number positions after removal
    for i, t in enumerate(clean_standings, 1):
        t["position"] = i
    return clean_standings, clean_results


def _cached(key: str, fn, *args, **kwargs):
    now = time.time()
    if key in _cache:
        value, ts = _cache[key]
        if now - ts < CACHE_TTL:
            return value
    value = fn(*args, **kwargs)
    _cache[key] = (value, now)
    return value


def _merge_standings(primary: list[dict], secondary: list[dict]) -> list[dict]:
    """Use primary source if available and has sufficient data, else fall back to secondary."""
    if len(primary) >= 6:
        return primary
    if len(secondary) >= 6:
        return secondary
    # Merge: use longer list
    return primary if len(primary) >= len(secondary) else secondary


def _merge_results(r1: list[dict], r2: list[dict]) -> list[dict]:
    """De-duplicate results across sources by matching teams + score."""
    seen = set()
    merged = []
    for r in r1 + r2:
        hg = r.get("home_goals")
        ag = r.get("away_goals")
        # Filter out walkover/scraper artifacts: no realistic B-klasa match has >12 goals per side
        if hg is not None and ag is not None and (hg > 12 or ag > 12):
            continue
        key = (
            r.get("home_team", "").strip().lower(),
            r.get("away_team", "").strip().lower(),
            hg,
            ag,
        )
        if key not in seen and None not in key:
            seen.add(key)
            merged.append(r)
    # Sort by round if available
    merged.sort(key=lambda x: (x.get("round") or 0))
    return merged


@app.get("/api/health")
def health():
    return {"status": "ok", "sources": ["90minut.pl", "regionalnyfutbol.pl"]}


@app.get("/api/standings")
def get_standings():
    s90 = _cached("standings_90", fetch_standings_90)
    srf = _cached("standings_rf", fetch_standings_rf)
    merged = _merge_standings(srf, s90)  # prefer regionalnyfutbol as it's more accessible
    if not merged:
        raise HTTPException(503, "Could not fetch standings from any source")
    return {"standings": merged, "count": len(merged)}


@app.get("/api/results")
def get_results():
    r90 = _cached("results_90", fetch_results_90)
    rrf = _cached("results_rf", fetch_results_rf)
    merged = _merge_results(r90, rrf)
    return {"results": merged, "count": len(merged)}


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
    standings = _cached("standings_rf", fetch_standings_rf)
    if not standings:
        standings = _cached("standings_90", fetch_standings_90)

    r90 = _cached("results_90", fetch_results_90)
    rrf = _cached("results_rf", fetch_results_rf)
    results = _merge_results(r90, rrf)

    if not standings:
        raise HTTPException(503, "Could not compute advanced stats — no standings data")

    advanced = compute_all_advanced_stats(standings, results)
    league = compute_league_stats(results)

    return {
        "teams": advanced,
        "league": league,
        "results_count": len(results),
    }


@app.get("/api/team/{team_name}")
def get_team(team_name: str):
    standings = _cached("standings_rf", fetch_standings_rf) or _cached("standings_90", fetch_standings_90)
    r90 = _cached("results_90", fetch_results_90)
    rrf = _cached("results_rf", fetch_results_rf)
    results = _merge_results(r90, rrf)

    # Find team (fuzzy match)
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


def _get_clean_data() -> tuple[list[dict], list[dict]]:
    """Return standings and results with withdrawn teams removed."""
    standings = _cached("standings_rf", fetch_standings_rf) or _cached("standings_90", fetch_standings_90)
    r90 = _cached("results_90", fetch_results_90)
    rrf = _cached("results_rf", fetch_results_rf)
    results = _merge_results(r90, rrf)
    return _filter_withdrawn(standings, results)


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


@app.get("/api/all")
def get_all():
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
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
