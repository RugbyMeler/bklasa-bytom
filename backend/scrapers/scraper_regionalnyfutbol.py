"""
Scraper for regionalnyfutbol.pl — B-klasa Bytom
Base: https://regionalnyfutbol.pl/liga,klasa-b-slaska-grupa-bytom-sezon-2025-2026,{section}.html
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import Optional

BASE = "https://regionalnyfutbol.pl"
SLUG = "klasa-b-slaska-grupa-bytom-sezon-2025-2026"

URLS = {
    "standings": f"{BASE}/liga,{SLUG},tabela-terminarz.html",
    "results":   f"{BASE}/liga,{SLUG},tabela-terminarz.html",  # results are in the same page (table 1)
    "scorers":   f"{BASE}/liga,{SLUG},strzelcy.html",
    "cards":     f"{BASE}/liga,{SLUG},kartki.html",
    "schedule":  f"{BASE}/liga,{SLUG},tabela-terminarz.html",  # schedule also in same page
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
    "Referer": "https://regionalnyfutbol.pl/",
}


def _get_soup(url: str) -> Optional[BeautifulSoup]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        print(f"[regionalnyfutbol] Error fetching {url}: {e}")
        return None


def _parse_int(text: str) -> int:
    try:
        cleaned = re.sub(r"[^\d]", "", text.strip())
        return int(cleaned) if cleaned else 0
    except ValueError:
        return 0


def _parse_goals(text: str) -> tuple[int, int]:
    """Parse '80 - 16', '80:16', '80-16' into (80, 16)."""
    # Handle space-padded format like "80 - 16" or "2 - 0"
    m = re.search(r"(\d+)\s*[-:]\s*(\d+)", text)
    if m:
        return int(m.group(1)), int(m.group(2))
    return 0, 0


def _find_header_row(rows) -> tuple[Optional[int], dict]:
    """
    Scan table rows to find the actual column header row.
    Returns (header_row_index, col_map).
    """
    # Column name → field key mapping (case-insensitive, handles Polish)
    KNOWN_COLS = {
        "M.": "pos", "#": "pos", "LP.": "pos", "LP": "pos",
        "DRUŻYNA": "name", "DRUZYNA": "name", "KLUB": "name",
        "ZESPÓŁ": "name", "ZESPOL": "name", "TEAM": "name",
        # Matches played — "M" appears twice (pos="M." and played="M"), take second
        "Z": "won", "ZW": "won",
        "R": "drawn", "REM": "drawn",
        "P": "lost", "POR": "lost",
        "PKT": "points", "PTS": "points", "PUNKTY": "points",
        "BRAMKI": "goals", "BG": "goals", "GF": "goals",
    }

    for i, row in enumerate(rows):
        cells = row.find_all(["th", "td"])
        texts = [c.get_text(strip=True) for c in cells]
        texts_upper = [t.upper() for t in texts]

        # Must have PKT to be a standings header
        if "PKT" not in texts_upper:
            continue

        col_map: dict = {}
        seen_m = 0  # "M" appears as both position label and played
        for idx, t in enumerate(texts_upper):
            if t == "M.":
                col_map.setdefault("pos", idx)
            elif t in ("M", "MP"):
                seen_m += 1
                if seen_m == 2 or "pos" in col_map:
                    # Second "M" is matches played
                    col_map.setdefault("played", idx)
                elif seen_m == 1 and "pos" not in col_map:
                    col_map["pos"] = idx
            elif t in KNOWN_COLS:
                key = KNOWN_COLS[t]
                col_map.setdefault(key, idx)

        # Ensure we have at least name + points
        if "name" not in col_map:
            # Try to find name column (usually index 1)
            col_map["name"] = 1
        if "played" not in col_map and seen_m >= 1:
            # Find first "M" that isn't pos
            for idx, t in enumerate(texts_upper):
                if t == "M" and idx != col_map.get("pos"):
                    col_map["played"] = idx
                    break

        if "points" in col_map:
            return i, col_map

    return None, {}


def fetch_standings() -> list[dict]:
    soup = _get_soup(URLS["standings"])
    if not soup:
        return []

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 3:
            continue

        header_idx, col_map = _find_header_row(rows)
        if header_idx is None:
            continue

        parsed = []
        for i, row in enumerate(rows[header_idx + 1:], 1):
            cells = row.find_all(["td", "th"])
            if len(cells) < 4:
                continue
            texts = [c.get_text(strip=True) for c in cells]

            def get(key: str, default: str = "0") -> str:
                idx = col_map.get(key)
                if idx is None or idx >= len(texts):
                    return default
                return texts[idx]

            # Team name — prefer link text
            name_idx = col_map.get("name", 1)
            name_cell = cells[name_idx] if name_idx < len(cells) else None
            team_link = name_cell.find("a") if name_cell else None
            team_name = team_link.get_text(strip=True) if team_link else get("name")
            if not team_name or len(team_name) < 2:
                continue

            # Goals: "80 - 16" or "80:16"
            goals_text = get("goals", "")
            if re.search(r"\d+\s*[-:]\s*\d+", goals_text):
                gf, ga = _parse_goals(goals_text)
            else:
                gf, ga = 0, 0

            pos_text = get("pos", str(i))
            position = _parse_int(pos_text) or i

            entry = {
                "position": position,
                "name": team_name,
                "played": _parse_int(get("played", "0")),
                "won":    _parse_int(get("won",    "0")),
                "drawn":  _parse_int(get("drawn",  "0")),
                "lost":   _parse_int(get("lost",   "0")),
                "points": _parse_int(get("points", "0")),
                "goals_for":      gf,
                "goals_against":  ga,
                "goal_difference": gf - ga,
                "source": "regionalnyfutbol",
            }
            parsed.append(entry)

        if len(parsed) >= 4:
            return parsed

    return []


def fetch_results() -> list[dict]:
    """
    Results and schedule live in table index 1 of the standings page.
    Row format:
      - Round header: ['Kolejka N  - DD/DD. miesiąca YYYY[szczegóły]', '']
      - Match result:  ['Home Team', '2 - 0', 'Away Team', 'date string']
      - Upcoming:      ['Home Team', '-', 'Away Team', 'date string']
    """
    soup = _get_soup(URLS["results"])
    if not soup:
        return []

    tables = soup.find_all("table")
    if len(tables) < 2:
        return []

    results_table = tables[1]  # second table contains results+schedule
    results = []
    current_round = None

    for row in results_table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        texts = [c.get_text(strip=True) for c in cells]

        # Round header row: 1-2 cells, first cell contains "Kolejka N"
        if len(cells) <= 2:
            round_match = re.search(r"[Kk]olejka\s+(\d+)", texts[0])
            if round_match:
                current_round = int(round_match.group(1))
            continue

        # Result row: [home_team, score, away_team, date]
        if len(cells) < 3:
            continue

        # Find score cell
        score_idx = None
        for j, t in enumerate(texts):
            if re.match(r"^\d+\s*[-:]\s*\d+$", t):
                score_idx = j
                break

        if score_idx is None:
            continue  # upcoming match or non-result row

        home_goals, away_goals = _parse_goals(texts[score_idx])

        # Team names: prefer link text, fallback to adjacent cells
        links = row.find_all("a")
        link_texts = [a.get_text(strip=True) for a in links if a.get_text(strip=True)]
        if len(link_texts) >= 2:
            home_team = link_texts[0]
            away_team = link_texts[1]
        else:
            home_team = texts[score_idx - 1] if score_idx > 0 else ""
            away_team = texts[score_idx + 1] if score_idx + 1 < len(texts) else ""

        if not home_team or not away_team:
            continue

        full = " ".join(texts)
        date_m = re.search(r"\d{1,2}[./]\d{1,2}[./]\d{2,4}", full)

        results.append({
            "round": current_round,
            "date": date_m.group(0) if date_m else "",
            "home_team": home_team.strip(),
            "away_team": away_team.strip(),
            "home_goals": home_goals,
            "away_goals": away_goals,
            "source": "regionalnyfutbol",
        })

    return results


def fetch_scorers() -> list[dict]:
    soup = _get_soup(URLS["scorers"])
    if not soup:
        return []

    scorers = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        parsed = []
        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue
            texts = [c.get_text(strip=True) for c in cells]

            player_link = row.find("a")
            name = player_link.get_text(strip=True) if player_link else (texts[1] if len(texts) > 1 else "")
            if not name or len(name) < 2:
                continue

            # Goals — last numeric value
            goals = 0
            for t in reversed(texts):
                if t.isdigit():
                    goals = int(t)
                    break

            # Club — second link or third cell
            links = row.find_all("a")
            club = links[1].get_text(strip=True) if len(links) >= 2 else (texts[2] if len(texts) > 2 else "")

            parsed.append({
                "rank": _parse_int(texts[0]),
                "name": name,
                "club": club,
                "goals": goals,
                "source": "regionalnyfutbol",
            })

        if len(parsed) >= 3:
            scorers = parsed
            break

    return sorted(scorers, key=lambda x: x["goals"], reverse=True)


def fetch_cards() -> list[dict]:
    soup = _get_soup(URLS["cards"])
    if not soup:
        return []

    cards = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        parsed = []
        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue
            texts = [c.get_text(strip=True) for c in cells]
            player_link = row.find("a")
            name = player_link.get_text(strip=True) if player_link else (texts[1] if len(texts) > 1 else "")
            if not name or len(name) < 2:
                continue

            # Find yellow/red card counts — look for small integers
            nums = [int(t) for t in texts if t.isdigit()]
            yellow = nums[0] if len(nums) > 0 else 0
            red = nums[1] if len(nums) > 1 else 0

            parsed.append({
                "name": name,
                "yellow_cards": yellow,
                "red_cards": red,
                "source": "regionalnyfutbol",
            })

        if len(parsed) >= 3:
            cards = parsed
            break

    return cards


_POLISH_MONTHS = {
    "stycznia": "01", "lutego": "02", "marca": "03", "kwietnia": "04",
    "maja": "05", "czerwca": "06", "lipca": "07", "sierpnia": "08",
    "września": "09", "października": "10", "listopada": "11", "grudnia": "12",
}


def _parse_fixture_date(raw: str) -> tuple[str, str]:
    """
    Parse the date cell from an upcoming fixture row.
    Raw text looks like: '5  kwietnia 20265.04- 17:00'
    Returns (date_str, time_str) e.g. ('2026-04-05', '17:00').
    """
    # Extract time
    time_m = re.search(r"(\d{1,2}:\d{2})\s*$", raw)
    time_str = time_m.group(1) if time_m else ""

    # Try "DD  Month YYYY" pattern with Polish month names
    for pl, num in _POLISH_MONTHS.items():
        m = re.search(rf"(\d{{1,2}})\s+{pl}\s+(\d{{4}})", raw, re.IGNORECASE)
        if m:
            day = m.group(1).zfill(2)
            year = m.group(2)
            return f"{year}-{num}-{day}", time_str

    # Fallback: DD.MM pattern (extract year from 4-digit number nearby)
    dm = re.search(r"(\d{1,2})\.(\d{2})", raw)
    yr = re.search(r"(\d{4})", raw)
    if dm:
        day = dm.group(1).zfill(2)
        month = dm.group(2)
        year = yr.group(1) if yr else "2026"
        return f"{year}-{month}-{day}", time_str

    return "", time_str


def fetch_schedule() -> list[dict]:
    """Upcoming fixtures — rows with druzyna-1/druzyna-2 cells and no numeric score."""
    soup = _get_soup(URLS["schedule"])
    if not soup:
        return []

    tables = soup.find_all("table")
    if len(tables) < 2:
        return []

    fixtures = []
    current_round = None

    for row in tables[1].find_all("tr"):
        # Round header rows (≤2 cells)
        cells = row.find_all("td")
        if not cells:
            continue

        if len(cells) <= 2:
            round_match = re.search(r"[Kk]olejka\s+(\d+)", cells[0].get_text(strip=True))
            if round_match:
                current_round = int(round_match.group(1))
            continue

        # Use CSS classes to locate home/away team cells reliably
        home_td = row.find("td", class_="druzyna-1")
        away_td = row.find("td", class_="druzyna-2")
        score_td = row.find("td", class_="wynik")
        date_td = row.find("td", class_="data-meczu")

        if not home_td or not away_td or not score_td:
            continue

        score_text = score_td.get_text(strip=True)

        # Skip played matches (score contains digits)
        if re.search(r"\d", score_text):
            continue

        home_team = home_td.get_text(strip=True)
        away_team = away_td.get_text(strip=True)
        if not home_team or not away_team:
            continue

        # Parse date from span.normal-date and time from trailing text
        date_str, time_str = "", ""
        if date_td:
            normal = date_td.find("span", class_="normal-date")
            date_raw = normal.get_text(strip=True) if normal else date_td.get_text(strip=True)
            date_str, time_str = _parse_fixture_date(date_raw)
            # Time is in the td text after the span
            time_m = re.search(r"(\d{1,2}:\d{2})", date_td.get_text())
            if time_m:
                time_str = time_m.group(1)

        fixtures.append({
            "round":     current_round,
            "date":      date_str,
            "time":      time_str,
            "home_team": home_team,
            "away_team": away_team,
        })

    return fixtures
