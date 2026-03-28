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
    """Fetch recent match results from the league page."""
    soup = _get_soup(LEAGUE_URL)
    if not soup:
        return []

    results = []
    # Results are usually in a table with date, home team, score, away team
    # Look for score pattern like "2:1", "0:0" etc.
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        texts = [c.get_text(strip=True) for c in cells]
        full_text = " ".join(texts)
        # Score pattern
        score_match = re.search(r"\b(\d+):(\d+)\b", full_text)
        if not score_match:
            continue

        links = row.find_all("a")
        team_names = [a.get_text(strip=True) for a in links if a.get_text(strip=True)]
        if len(team_names) < 2:
            continue

        # Find date — look for DD.MM.YYYY or similar
        date_match = re.search(r"\d{1,2}[./]\d{1,2}[./]\d{2,4}", full_text)
        date_str = date_match.group(0) if date_match else ""

        # Find round
        round_match = re.search(r"(\d+)\s*kol", full_text, re.IGNORECASE)
        round_num = int(round_match.group(1)) if round_match else None

        results.append({
            "date": date_str,
            "round": round_num,
            "home_team": team_names[0],
            "away_team": team_names[-1],
            "home_goals": int(score_match.group(1)),
            "away_goals": int(score_match.group(2)),
            "source": "90minut",
        })

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
