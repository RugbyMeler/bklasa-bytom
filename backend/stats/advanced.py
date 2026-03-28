"""
Advanced football statistics calculations for B-klasa Bytom dashboard.
"""

import math
from collections import Counter, defaultdict
from typing import Any


# Pythagorean exponent — 1.5–1.83 for football (we use 1.7 as empirical best fit)
PYTH_EXP = 1.7


def pythagorean_expectation(goals_for: int, goals_against: int) -> float:
    """
    Expected win percentage based on goals scored and conceded.
    Formula: GF^k / (GF^k + GA^k)  where k ≈ 1.7 for football.
    Returns value in [0, 1].
    """
    if goals_for == 0 and goals_against == 0:
        return 0.5
    if goals_against == 0:
        return 1.0
    if goals_for == 0:
        return 0.0
    gf_k = goals_for ** PYTH_EXP
    ga_k = goals_against ** PYTH_EXP
    return round(gf_k / (gf_k + ga_k), 4)


def pythagorean_points(goals_for: int, goals_against: int, played: int) -> float:
    """Expected points based on Pythagorean win expectation (3 pts per win)."""
    win_pct = pythagorean_expectation(goals_for, goals_against)
    # In football with draws: approximate expected pts as win_pct * 3 * played
    # More refined: split into win/draw/loss probs
    # Using simple scaling: win_pct maps to 0-3 pts per game
    return round(win_pct * 3 * played, 1)


def points_above_expectation(actual_points: int, goals_for: int, goals_against: int, played: int) -> float:
    """Difference between actual points and Pythagorean expected points."""
    expected = pythagorean_points(goals_for, goals_against, played)
    return round(actual_points - expected, 1)


def _results_from_matches(results: list[dict], team_name: str) -> list[str]:
    """Return chronological list of 'W'/'D'/'L' for given team from match results."""
    outcomes = []
    for r in results:
        hg = r.get("home_goals", 0)
        ag = r.get("away_goals", 0)
        is_home = r.get("home_team", "").strip().lower() == team_name.strip().lower()
        is_away = r.get("away_team", "").strip().lower() == team_name.strip().lower()
        if not is_home and not is_away:
            continue
        if hg == ag:
            outcomes.append("D")
        elif (is_home and hg > ag) or (is_away and ag > hg):
            outcomes.append("W")
        else:
            outcomes.append("L")
    return outcomes


def form_guide(results: list[dict], team_name: str, n: int = 5) -> list[str]:
    """Return last N results for a team as list of 'W'/'D'/'L'."""
    outcomes = _results_from_matches(results, team_name)
    return outcomes[-n:]


def form_points(results: list[dict], team_name: str, n: int = 5) -> int:
    """Points earned in last N matches."""
    form = form_guide(results, team_name, n)
    return sum(3 if r == "W" else 1 if r == "D" else 0 for r in form)


def home_away_split(results: list[dict], team_name: str) -> dict:
    """Calculate home and away stats separately."""
    home = {"played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0}
    away = {"played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0}

    for r in results:
        hg = r.get("home_goals", 0)
        ag = r.get("away_goals", 0)
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()

        if ht == name:
            home["played"] += 1
            home["gf"] += hg
            home["ga"] += ag
            if hg > ag:
                home["won"] += 1
            elif hg == ag:
                home["drawn"] += 1
            else:
                home["lost"] += 1
        elif at == name:
            away["played"] += 1
            away["gf"] += ag
            away["ga"] += hg
            if ag > hg:
                away["won"] += 1
            elif ag == hg:
                away["drawn"] += 1
            else:
                away["lost"] += 1

    for split in (home, away):
        p = split["played"]
        split["points"] = split["won"] * 3 + split["drawn"]
        split["ppg"] = round(split["points"] / p, 2) if p else 0.0
        split["gf_per_game"] = round(split["gf"] / p, 2) if p else 0.0
        split["ga_per_game"] = round(split["ga"] / p, 2) if p else 0.0

    return {"home": home, "away": away}


def clean_sheets(results: list[dict], team_name: str) -> int:
    """Number of matches where team conceded 0 goals."""
    count = 0
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if ht == name and ag == 0:
            count += 1
        elif at == name and hg == 0:
            count += 1
    return count


def failed_to_score(results: list[dict], team_name: str) -> int:
    """Number of matches where team scored 0 goals."""
    count = 0
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if ht == name and hg == 0:
            count += 1
        elif at == name and ag == 0:
            count += 1
    return count


def btts_count(results: list[dict], team_name: str) -> int:
    """Both Teams to Score — matches where both sides scored."""
    count = 0
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if (ht == name or at == name) and hg > 0 and ag > 0:
            count += 1
    return count


def over_x5_count(results: list[dict], team_name: str, threshold: float = 2.5) -> int:
    """Matches involving team that had total goals > threshold."""
    count = 0
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if (ht == name or at == name) and (hg + ag) > threshold:
            count += 1
    return count


def scoring_streak(results: list[dict], team_name: str) -> int:
    """Current consecutive matches where team scored at least 1 goal."""
    outcomes = []
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if ht == name:
            outcomes.append(hg > 0)
        elif at == name:
            outcomes.append(ag > 0)

    streak = 0
    for scored in reversed(outcomes):
        if scored:
            streak += 1
        else:
            break
    return streak


def win_streak(results: list[dict], team_name: str) -> int:
    """Current consecutive wins."""
    form = _results_from_matches(results, team_name)
    streak = 0
    for r in reversed(form):
        if r == "W":
            streak += 1
        else:
            break
    return streak


def unbeaten_streak(results: list[dict], team_name: str) -> int:
    """Current unbeaten streak (W or D)."""
    form = _results_from_matches(results, team_name)
    streak = 0
    for r in reversed(form):
        if r in ("W", "D"):
            streak += 1
        else:
            break
    return streak


def points_per_game(points: int, played: int) -> float:
    return round(points / played, 2) if played else 0.0


def scoring_consistency(results: list[dict], team_name: str) -> float:
    """Percentage of matches where team scored."""
    total = 0
    scored_in = 0
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if ht == name:
            total += 1
            if hg > 0:
                scored_in += 1
        elif at == name:
            total += 1
            if ag > 0:
                scored_in += 1
    return round(scored_in / total * 100, 1) if total else 0.0


def goals_per_match_trend(results: list[dict], team_name: str) -> list[dict]:
    """Goals scored and conceded per match in chronological order."""
    trend = []
    for r in results:
        ht = r.get("home_team", "").strip().lower()
        at = r.get("away_team", "").strip().lower()
        name = team_name.strip().lower()
        hg, ag = r.get("home_goals", 0), r.get("away_goals", 0)
        if ht == name:
            trend.append({"round": r.get("round"), "gf": hg, "ga": ag, "venue": "H", "opponent": r.get("away_team", "")})
        elif at == name:
            trend.append({"round": r.get("round"), "gf": ag, "ga": hg, "venue": "A", "opponent": r.get("home_team", "")})
    return trend


def compute_all_advanced_stats(standings: list[dict], results: list[dict]) -> list[dict]:
    """
    Enrich each standings entry with all advanced statistics.
    Returns list of dicts with full stats.
    """
    enriched = []
    for team in standings:
        name = team["name"]
        gf = team.get("goals_for", 0)
        ga = team.get("goals_against", 0)
        played = team.get("played", 0)
        points = team.get("points", 0)

        pyth_exp = pythagorean_expectation(gf, ga)
        pyth_pts = pythagorean_points(gf, ga, played)
        ha = home_away_split(results, name)

        enriched.append({
            **team,
            # Efficiency
            "ppg": points_per_game(points, played),
            "gf_per_game": round(gf / played, 2) if played else 0.0,
            "ga_per_game": round(ga / played, 2) if played else 0.0,
            # Pythagorean
            "pythagorean_expectation": pyth_exp,
            "pythagorean_points": pyth_pts,
            "points_above_expectation": round(points - pyth_pts, 1),
            # Form
            "form": form_guide(results, name, 5),
            "form_points": form_points(results, name, 5),
            # Streaks
            "win_streak": win_streak(results, name),
            "unbeaten_streak": unbeaten_streak(results, name),
            "scoring_streak": scoring_streak(results, name),
            # Match stats
            "clean_sheets": clean_sheets(results, name),
            "failed_to_score": failed_to_score(results, name),
            "btts": btts_count(results, name),
            "over_2_5": over_x5_count(results, name, 2.5),
            "over_3_5": over_x5_count(results, name, 3.5),
            "scoring_consistency": scoring_consistency(results, name),
            # Home/Away
            "home": ha["home"],
            "away": ha["away"],
            # Trend
            "goals_trend": goals_per_match_trend(results, name),
        })

    return enriched


def compute_league_stats(results: list[dict]) -> dict:
    """Aggregate stats for the entire league."""
    if not results:
        return {}

    total_goals = sum(r.get("home_goals", 0) + r.get("away_goals", 0) for r in results)
    total_matches = len(results)
    home_wins = sum(1 for r in results if r.get("home_goals", 0) > r.get("away_goals", 0))
    draws = sum(1 for r in results if r.get("home_goals", 0) == r.get("away_goals", 0))
    away_wins = sum(1 for r in results if r.get("home_goals", 0) < r.get("away_goals", 0))
    btts = sum(1 for r in results if r.get("home_goals", 0) > 0 and r.get("away_goals", 0) > 0)
    over_25 = sum(1 for r in results if r.get("home_goals", 0) + r.get("away_goals", 0) > 2.5)
    over_35 = sum(1 for r in results if r.get("home_goals", 0) + r.get("away_goals", 0) > 3.5)

    highest_score = max(results, key=lambda r: r.get("home_goals", 0) + r.get("away_goals", 0), default=None)

    return {
        "total_matches": total_matches,
        "total_goals": total_goals,
        "avg_goals_per_match": round(total_goals / total_matches, 2) if total_matches else 0,
        "home_wins": home_wins,
        "draws": draws,
        "away_wins": away_wins,
        "home_win_pct": round(home_wins / total_matches * 100, 1) if total_matches else 0,
        "draw_pct": round(draws / total_matches * 100, 1) if total_matches else 0,
        "away_win_pct": round(away_wins / total_matches * 100, 1) if total_matches else 0,
        "btts_pct": round(btts / total_matches * 100, 1) if total_matches else 0,
        "over_25_pct": round(over_25 / total_matches * 100, 1) if total_matches else 0,
        "over_35_pct": round(over_35 / total_matches * 100, 1) if total_matches else 0,
        "highest_scoring_match": highest_score,
    }


# ── NEW ADVANCED STATS ────────────────────────────────────────────────────────

def compute_elo_ratings(results: list[dict]) -> list[dict]:
    """
    Elo ratings based on match results (K=32, start=1000).
    Processes matches in round order so early results don't distort later ones.
    """
    elos: dict[str, float] = {}
    K = 32

    for r in sorted(results, key=lambda x: (x.get("round") or 0)):
        home = r.get("home_team", "")
        away = r.get("away_team", "")
        hg = r.get("home_goals")
        ag = r.get("away_goals")
        if not home or not away or hg is None or ag is None:
            continue
        elos.setdefault(home, 1000.0)
        elos.setdefault(away, 1000.0)

        exp_h = 1 / (1 + 10 ** ((elos[away] - elos[home]) / 400))
        s_h = 1.0 if hg > ag else 0.0 if hg < ag else 0.5
        s_a = 1.0 - s_h
        exp_a = 1.0 - exp_h

        elos[home] += K * (s_h - exp_h)
        elos[away] += K * (s_a - exp_a)

    ranked = sorted(elos.items(), key=lambda x: x[1], reverse=True)
    return [{"rank": i + 1, "team": t, "elo": round(e, 1)} for i, (t, e) in enumerate(ranked)]


def compute_form_table(results: list[dict], last_n: int = 5) -> list[dict]:
    """Mini standings for the last N matches per team."""
    team_recent: dict[str, list[tuple]] = defaultdict(list)

    for r in sorted(results, key=lambda x: x.get("round") or 0, reverse=True):
        home = r.get("home_team", "")
        away = r.get("away_team", "")
        hg = r.get("home_goals")
        ag = r.get("away_goals")
        if not home or not away or hg is None or ag is None:
            continue
        if len(team_recent[home]) < last_n:
            team_recent[home].append((hg, ag, away))
        if len(team_recent[away]) < last_n:
            team_recent[away].append((ag, hg, home))

    rows = []
    for team, matches in team_recent.items():
        w = sum(1 for gf, ga, _ in matches if gf > ga)
        d = sum(1 for gf, ga, _ in matches if gf == ga)
        l = sum(1 for gf, ga, _ in matches if gf < ga)
        gf_t = sum(gf for gf, _, __ in matches)
        ga_t = sum(ga for _, ga, __ in matches)
        pts = w * 3 + d
        form = [
            {"result": "W" if gf > ga else "D" if gf == ga else "L", "gf": gf, "ga": ga, "opponent": opp}
            for gf, ga, opp in matches
        ]
        rows.append({
            "team": team,
            "played": len(matches),
            "won": w, "drawn": d, "lost": l,
            "gf": gf_t, "ga": ga_t, "gd": gf_t - ga_t,
            "points": pts,
            "form": form,
        })

    return sorted(rows, key=lambda x: (x["points"], x["gd"]), reverse=True)


def compute_scoreline_stats(results: list[dict]) -> dict:
    """Frequency of exact scorelines and summary stats."""
    scorelines: Counter = Counter()
    margins = []
    totals = []

    for r in results:
        hg = r.get("home_goals")
        ag = r.get("away_goals")
        if hg is None or ag is None:
            continue
        scorelines[f"{hg}-{ag}"] += 1
        totals.append(hg + ag)
        if hg != ag:
            margins.append(abs(hg - ag))

    return {
        "most_common": [{"score": s, "count": c} for s, c in scorelines.most_common(12)],
        "avg_margin": round(sum(margins) / len(margins), 2) if margins else 0,
        "avg_total_goals": round(sum(totals) / len(totals), 2) if totals else 0,
        "zero_zero": scorelines.get("0-0", 0),
        "one_nil": scorelines.get("1-0", 0) + scorelines.get("0-1", 0),
        "total_matches": len(results),
    }


def compute_h2h_matrix(results: list[dict], teams: list[dict]) -> dict:
    """
    Head-to-head matrix: for each pair (A, B), list of A's results vs B.
    Returns {"teams": [...], "matrix": {teamA: {teamB: ["W","L",...]}}}
    """
    team_names = [t.get("name", "") for t in teams]
    name_set = set(team_names)
    matrix: dict[str, dict[str, list[str]]] = {t: {o: [] for o in team_names} for t in team_names}

    for r in results:
        home = r.get("home_team", "")
        away = r.get("away_team", "")
        hg = r.get("home_goals")
        ag = r.get("away_goals")
        if not home or not away or hg is None or ag is None:
            continue
        if home not in name_set or away not in name_set:
            continue
        if hg > ag:
            matrix[home][away].append("W")
            matrix[away][home].append("L")
        elif hg < ag:
            matrix[home][away].append("L")
            matrix[away][home].append("W")
        else:
            matrix[home][away].append("D")
            matrix[away][home].append("D")

    return {"teams": team_names, "matrix": matrix}


def compute_title_relegation(standings: list[dict], results: list[dict]) -> list[dict]:
    """
    For each team: max possible points, projected final points (based on PPG),
    and whether they're in title/relegation contention.
    """
    if not standings:
        return []

    n_teams = len(standings)
    max_played = max(t.get("played", 0) for t in standings)
    max_round = max((r.get("round") or 0) for r in results) if results else 0
    # Full season = (n-1)*2 rounds for a double round-robin
    total_rounds = max(max_round, max_played, (n_teams - 1) * 2)

    rows = []
    for t in standings:
        played = t.get("played", 0)
        pts = t.get("points", 0)
        remaining = max(0, total_rounds - played)
        ppg = pts / played if played else 0.0
        projected = round(ppg * total_rounds, 1)

        rows.append({
            "team": t.get("name", ""),
            "position": t.get("position", 0),
            "points": pts,
            "played": played,
            "remaining": remaining,
            "max_points": pts + remaining * 3,
            "ppg": round(ppg, 2),
            "projected": projected,
            "total_rounds": total_rounds,
        })

    return rows
