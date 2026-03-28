"""
Scraper for laczynaspilka.pl (PZPN official) using Playwright.
Fetches match lineups, scorers, cards and substitutions for each match.

The site uses Angular + reCAPTCHA protected API, so we:
1. Collect match UUIDs from 90minut.pl (which links to LNP for each match)
2. Use Playwright with stealth to render each match page and extract DOM data
3. Cache results aggressively (match data never changes)

API discovered: https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1/
  GET /matches/{matchId}         - match summary
  GET /matches/{matchId}/events  - goals, cards, subs
"""

import asyncio
import json
import re
import time
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
LNP_BASE = "https://competition-api-pro.laczynaspilka.pl/api/bus/competition/v1"
MINUT90_LEAGUE = "http://www.90minut.pl/liga/1/liga14619.html"

# On-disk cache for match data
CACHE_DIR = Path(__file__).parent.parent / "data" / "matches"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def get_match_ids_from_90minut() -> list[str]:
    """Scrape all LNP match UUIDs linked from the 90minut.pl league page."""
    try:
        r = requests.get(MINUT90_LEAGUE, headers=HEADERS, timeout=15)
        r.encoding = "iso-8859-2"
        soup = BeautifulSoup(r.text, "lxml")
        uuids = list(dict.fromkeys([
            re.search(r"/mecz/([a-f0-9-]{36})", a["href"]).group(1)
            for a in soup.find_all("a", href=True)
            if "laczynaspilka.pl/rozgrywki/mecz/" in a.get("href", "")
            and re.search(r"/mecz/([a-f0-9-]{36})", a["href"])
        ]))
        return uuids
    except Exception as e:
        print(f"[lnp] Error getting match IDs: {e}")
        return []


def _cache_path(match_id: str) -> Path:
    return CACHE_DIR / f"{match_id}.json"


def _load_cache(match_id: str) -> Optional[dict]:
    p = _cache_path(match_id)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def _save_cache(match_id: str, data: dict):
    _cache_path(match_id).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


async def _fetch_match_playwright(match_id: str) -> Optional[dict]:
    """Use Playwright to render the LNP match page and extract player data from DOM."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return None

    url = f"https://www.laczynaspilka.pl/rozgrywki/mecz/{match_id}"
    api_data = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="pl-PL",
            extra_http_headers={"Accept-Language": "pl-PL,pl;q=0.9"},
        )
        await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        page = await ctx.new_page()

        # Intercept API responses
        async def handle_response(response):
            if "competition-api-pro" in response.url and response.status == 200:
                try:
                    ct = response.headers.get("content-type", "")
                    if "json" in ct:
                        body = await response.json()
                        key = response.url.split("/v1/")[-1].replace(f"matches/{match_id}", "")
                        api_data[key or "match"] = body
                except Exception:
                    pass

        page.on("response", handle_response)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await asyncio.sleep(10)
        except Exception:
            pass

        # Try to extract data from rendered DOM as fallback
        if not api_data:
            try:
                dom_data = await page.evaluate("""() => {
                    // Extract all player entries from rendered Angular DOM
                    const result = {events: [], lineups: {home: [], away: []}};

                    // Events: goals, cards, substitutions
                    document.querySelectorAll('[class*="event"], [class*="match-event"]').forEach(el => {
                        const text = el.textContent.trim();
                        if (text.length > 2) result.events.push(text);
                    });

                    // Lineups
                    const lineupContainers = document.querySelectorAll('[class*="lineup"], [class*="formation"], [class*="squad"]');
                    lineupContainers.forEach((c, i) => {
                        const players = Array.from(c.querySelectorAll('[class*="player"], [class*="name"]'))
                            .map(p => p.textContent.trim()).filter(t => t.length > 2);
                        if (i === 0) result.lineups.home = players;
                        else result.lineups.away = players;
                    });

                    // Score
                    const scoreEl = document.querySelector('[class*="score"], [class*="result"]');
                    if (scoreEl) result.score = scoreEl.textContent.trim();

                    // Teams
                    const teamEls = document.querySelectorAll('[class*="team-name"], [class*="club-name"]');
                    result.teams = Array.from(teamEls).map(t => t.textContent.trim()).slice(0, 2);

                    return result;
                }""")
                if dom_data.get("events") or dom_data.get("teams"):
                    api_data["dom"] = dom_data
            except Exception:
                pass

        await browser.close()

    return api_data if api_data else None


def _parse_api_response(match_id: str, raw: dict) -> dict:
    """Parse the raw API response into a clean match data structure."""
    result: dict = {
        "match_id": match_id,
        "home_team": "",
        "away_team": "",
        "home_goals": 0,
        "away_goals": 0,
        "date": "",
        "events": [],
        "home_lineup": [],
        "away_lineup": [],
    }

    # Parse match summary
    match_data = raw.get("match") or raw.get("") or {}
    if isinstance(match_data, dict):
        home = match_data.get("homeTeam") or match_data.get("home", {})
        away = match_data.get("awayTeam") or match_data.get("away", {})
        if isinstance(home, dict):
            result["home_team"] = home.get("name", "")
        if isinstance(away, dict):
            result["away_team"] = away.get("name", "")
        score = match_data.get("score") or match_data.get("result", {})
        if isinstance(score, dict):
            result["home_goals"] = score.get("home", 0) or score.get("homeGoals", 0)
            result["away_goals"] = score.get("away", 0) or score.get("awayGoals", 0)
        result["date"] = match_data.get("date", "")

    # Parse events (goals, cards, subs)
    events_raw = raw.get("/events") or raw.get("events") or []
    if isinstance(events_raw, list):
        for ev in events_raw:
            if not isinstance(ev, dict):
                continue
            ev_type = ev.get("type", ev.get("eventType", "")).lower()
            player = ev.get("player", ev.get("playerName", {}))
            player_name = player.get("name", "") if isinstance(player, dict) else str(player)
            minute = ev.get("minute", ev.get("time", 0))
            team_side = ev.get("team", ev.get("teamSide", ""))

            result["events"].append({
                "type": ev_type,
                "player": player_name,
                "minute": minute,
                "team": team_side,
            })

    return result


def fetch_match_data(match_id: str) -> Optional[dict]:
    """Fetch match data, using cache if available."""
    cached = _load_cache(match_id)
    if cached:
        return cached

    # Try to fetch via Playwright
    try:
        raw = asyncio.run(_fetch_match_playwright(match_id))
    except Exception:
        raw = None

    if not raw:
        return None

    parsed = _parse_api_response(match_id, raw)
    _save_cache(match_id, parsed)
    return parsed


def fetch_all_players_stats(match_ids: list[str]) -> dict:
    """
    Aggregate player-level stats across all matches.
    Returns a dict of player_name -> {goals, cards, matches, ...}
    Only processes cached matches to avoid long scraping times.
    """
    players: dict = {}

    for mid in match_ids:
        data = _load_cache(mid)
        if not data:
            continue
        for ev in data.get("events", []):
            name = ev.get("player", "")
            if not name:
                continue
            if name not in players:
                players[name] = {"name": name, "goals": 0, "yellow_cards": 0, "red_cards": 0, "assists": 0}
            ev_type = ev.get("type", "").lower()
            if "goal" in ev_type:
                players[name]["goals"] += 1
            elif "yellow" in ev_type:
                players[name]["yellow_cards"] += 1
            elif "red" in ev_type or "dismissal" in ev_type:
                players[name]["red_cards"] += 1

    return dict(sorted(players.items(), key=lambda x: x[1]["goals"], reverse=True))


def get_all_match_ids() -> list[str]:
    """Get match IDs from 90minut.pl."""
    return get_match_ids_from_90minut()
