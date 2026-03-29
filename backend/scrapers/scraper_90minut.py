"""
Scraper for 90minut.pl — B-klasa Bytom
League URL: http://www.90minut.pl/liga/1/liga14619.html
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import Optional

BASE_URL = "http://www.90minut.pl"
LEAGUE_URL = f"{BASE_URL}/liga/1/liga14619.html"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _get_soup(url: str) -> Optional[BeautifulSoup]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.encoding = "iso-8859-2"
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        print(f"[90minut] Error fetching {url}: {e}")
        return None


def _parse_int(text: str) -> int:
    try:
        return int(re.sub(r"[^\d-]", "", text.strip()) or 0)
    except ValueError:
        return 0


def fetch_standings() -> list[dict]:
    soup = _get_soup(LEAGUE_URL)
    if not soup:
        return []

    standings = []
    # 90minut.pl uses a table with class 'liga' or similar for standings
    # The main standings table has rows with team data
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        parsed = []
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 8:
                continue
            texts = [c.get_text(strip=True) for c in cells]
            # Detect header row
            if any(t in ("Pkt", "PKT", "Pts") for t in texts):
                continue
            # Position should be a number
            if not texts[0].isdigit():
                continue

            team_link = row.find("a")
            team_name = team_link.get_text(strip=True) if team_link else texts[1]
            team_href = team_link.get("href", "") if team_link else ""
            club_id_match = re.search(r"id_klub=(\d+)", team_href)
            club_id = club_id_match.group(1) if club_id_match else None

            # Try to parse goals "GF:GA" or "GF-GA" pattern
            goals_cell = texts[7] if len(texts) > 7 else "0:0"
            gf, ga = 0, 0
            goals_match = re.search(r"(\d+)[:\-](\d+)", goals_cell)
            if goals_match:
                gf, ga = int(goals_match.group(1)), int(goals_match.group(2))
            else:
                # Goals might be in separate cells
                try:
                    gf = _parse_int(texts[7])
                    ga = _parse_int(texts[8]) if len(texts) > 8 else 0
                except Exception:
                    pass

            # Try to find column layout: pos, team, played, won, drawn, lost, gf, ga, pts
            # or: pos, team, played, pts, won, drawn, lost, gf:ga, gd
            try:
                entry = {
                    "position": _parse_int(texts[0]),
                    "name": team_name,
                    "club_id": club_id,
                    "played": _parse_int(texts[2]),
                    "points": _parse_int(texts[3]),
                    "won": _parse_int(texts[4]),
                    "drawn": _parse_int(texts[5]),
                    "lost": _parse_int(texts[6]),
                    "goals_for": gf,
                    "goals_against": ga,
                    "goal_difference": gf - ga,
                    "source": "90minut",
                }
                parsed.append(entry)
            except Exception:
                continue

        if len(parsed) >= 6:
            standings = parsed
            break

    return standings


def fetch_results() -> list[dict]:
    """Fetch match results from 90minut league page.

    The page renders all fixtures as a flat list of cells:
      'Kolejka N - <date range>'
      team1, score (e.g. '3-1' or '-' for unplayed), team2, date_str, ...
    We walk the tokens and parse played matches (score != '-').
    """
    soup = _get_soup(LEAGUE_URL)
    if not soup:
        return []

    # Find the main data table (the one with 300+ rows)
    main_table = None
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) > 50:
            main_table = t
            break
    if not main_table:
        return []

    # Collect all non-empty cell texts from the table
    tokens = []
    for td in main_table.find_all("td"):
        text = td.get_text(strip=True)
        if text:
            tokens.append(text)

    results = []
    current_round = None
    i = 0
    score_re = re.compile(r"^(\d+)-(\d+)$")
    round_re = re.compile(r"Kolejka\s+(\d+)", re.IGNORECASE)

    while i < len(tokens):
        tok = tokens[i]

        # Detect round header: "Kolejka 18 - 28-29 marca"
        m = round_re.search(tok)
        if m:
            current_round = int(m.group(1))
            i += 1
            continue

        # Detect score token: "3-1", "10-1", "0-0"
        sm = score_re.match(tok)
        if sm and current_round is not None:
            home_goals = int(sm.group(1))
            away_goals = int(sm.group(2))
            # Sanity check: realistic B-klasa single-match score
            if home_goals <= 20 and away_goals <= 20 and i >= 1 and i + 1 < len(tokens):
                home_team = tokens[i - 1]
                away_team = tokens[i + 1]
                # Team names must look like team names, not stat columns
                # (reject pure numbers, rank tokens like "1.", short codes)
                def _looks_like_team(t: str) -> bool:
                    t = t.strip()
                    if len(t) < 4:
                        return False
                    if re.match(r"^\d+[\.\)]*$", t):  # "1.", "16", "2)"
                        return False
                    if re.match(r"^\d+-\d+", t):  # score-like "3-1", "0-3*"
                        return False
                    if round_re.search(t):
                        return False
                    if t in ("-", "(wo)"):
                        return False
                    return True

                if _looks_like_team(home_team) and _looks_like_team(away_team):
                    results.append({
                        "date": "",
                        "round": current_round,
                        "home_team": home_team,
                        "away_team": away_team,
                        "home_goals": home_goals,
                        "away_goals": away_goals,
                        "source": "90minut",
                    })
            i += 2  # skip score + away_team (home_team already consumed)
            continue

        i += 1

    return results


def fetch_scorers(club_id: str, season_id: str = "20") -> list[dict]:
    """Fetch top scorers for a given club."""
    url = f"{BASE_URL}/bilans.php?id_klub={club_id}&id_sezon={season_id}"
    soup = _get_soup(url)
    if not soup:
        return []

    scorers = []
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        texts = [c.get_text(strip=True) for c in cells]
        player_link = row.find("a")
        if not player_link:
            continue
        player_name = player_link.get_text(strip=True)
        goals = _parse_int(texts[-1]) if texts else 0
        if goals > 0:
            scorers.append({"name": player_name, "goals": goals})

    return sorted(scorers, key=lambda x: x["goals"], reverse=True)
