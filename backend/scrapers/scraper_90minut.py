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
    """Fetch standings from 90minut.pl.

    The standings table on 90minut has the layout (RAZEM section):
      col 0: position ("1.", "2.", ...)
      col 1: team name
      col 2: M.  — matches played
      col 3: Pkt. — points
      col 4: Z.  — won
      col 5: R.  — drawn
      col 6: P.  — lost
      col 7: Bramki — "GF-GA" (e.g. "85-16")
      col 8+: home/away splits (ignored)

    We find the right table by locating the header row that contains "Nazwa"
    and "Pkt." (with period), then parse data rows whose first cell matches
    the "N." pattern.  This avoids accidentally parsing the H2H matrix which
    has bare numbers ("1", "2") and no "Pkt." header.
    """
    soup = _get_soup(LEAGUE_URL)
    if not soup:
        return []

    pos_re = re.compile(r"^(\d+)\.$")   # matches "1.", "16." etc.

    for table in soup.find_all("table"):
        rows = table.find_all("tr")

        # Identify the standings table: it must contain a header row with "Nazwa" and "Pkt."
        header_found = False
        for row in rows:
            texts = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
            if "Nazwa" in texts and "Pkt." in texts:
                header_found = True
                break
        if not header_found:
            continue

        # Parse data rows
        parsed = []
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 8:
                continue
            texts = [c.get_text(strip=True) for c in cells]

            # Position cell must be "N." format
            m = pos_re.match(texts[0].strip())
            if not m:
                continue

            team_link = row.find("a")
            team_name = team_link.get_text(strip=True) if team_link else texts[1]
            team_href = team_link.get("href", "") if team_link else ""
            club_id_match = re.search(r"id_klub=(\d+)", team_href)
            club_id = club_id_match.group(1) if club_id_match else None

            # Goals cell is "GF-GA" e.g. "85-16"
            goals_cell = texts[7] if len(texts) > 7 else "0-0"
            gf, ga = 0, 0
            goals_match = re.search(r"(\d+)[:\-](\d+)", goals_cell)
            if goals_match:
                gf, ga = int(goals_match.group(1)), int(goals_match.group(2))

            try:
                entry = {
                    "position": int(m.group(1)),
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
            return parsed

    return []


def fetch_results() -> list[dict]:
    """Fetch match results from 90minut league page.

    The page contains one table per round.  Each round table has 4-column rows:
      col 0: home team name
      col 1: score  ("3-1" for played, "-" for unplayed, "(wo)" for walkover)
      col 2: away team name
      col 3: date string (e.g. "29 marca, 16:00")

    The round number is identified from the nearest preceding "Kolejka N" text
    node in the document, which appears as a link/header just above the table.
    """
    soup = _get_soup(LEAGUE_URL)
    if not soup:
        return []

    score_re = re.compile(r"^(\d+)-(\d+)$")
    round_re = re.compile(r"Kolejka\s+(\d+)", re.IGNORECASE)

    results = []

    for table in soup.find_all("table"):
        rows = table.find_all("tr")

        # A round table has mostly 4-column rows and at least 4 rows
        four_col_rows = [r for r in rows if len(r.find_all("td")) == 4]
        if len(four_col_rows) < 4:
            continue

        # Determine round number from the nearest preceding "Kolejka N" text
        prev_round_texts = table.find_all_previous(string=round_re)
        if not prev_round_texts:
            continue
        round_match = round_re.search(prev_round_texts[0])
        if not round_match:
            continue
        round_num = int(round_match.group(1))

        for row in four_col_rows:
            cells = row.find_all("td")
            texts = [c.get_text(strip=True) for c in cells]
            home_team, score_str, away_team, date_str = texts[0], texts[1], texts[2], texts[3]

            sm = score_re.match(score_str)
            if not sm:
                continue  # unplayed ("-") or walkover — skip

            results.append({
                "date": date_str,
                "round": round_num,
                "home_team": home_team,
                "away_team": away_team,
                "home_goals": int(sm.group(1)),
                "away_goals": int(sm.group(2)),
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
