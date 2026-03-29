"""
AI-generated round summary using Google Gemini 2.0 Flash (free tier).
Generates a Polish sports-journalist summary of the latest round.

Uses the google-genai package (newer SDK, replaces google-generativeai).
Free tier limits (as of 2025): 1500 requests/day, 15 RPM — more than
enough since the summary is cached per round number and only regenerated
when new round data arrives.

Get a free API key at: https://aistudio.google.com/apikey
Set env var: GOOGLE_API_KEY=<your key>
"""

import os
from typing import Optional

try:
    from google import genai
    from google.genai import types as genai_types
    _GEMINI_AVAILABLE = True
except ImportError as _import_err:
    _GEMINI_AVAILABLE = False
    _IMPORT_ERROR = str(_import_err)
else:
    _IMPORT_ERROR = None


# ── Formatting helpers ────────────────────────────────────────────────────────

def _fmt_standings(standings: list[dict]) -> str:
    lines = []
    for t in standings[:12]:
        pos  = t.get("position", "-")
        name = t.get("name", "")
        p    = t.get("played", 0)
        w    = t.get("won", 0)
        d    = t.get("drawn", 0)
        l    = t.get("lost", 0)
        gf   = t.get("goals_for", 0)
        ga   = t.get("goals_against", 0)
        gd   = t.get("goal_difference", 0)
        pts  = t.get("points", 0)
        lines.append(
            f"  {pos:>2}. {name:<28} {p:>2}m  {w}W/{d}R/{l}P  {gf}:{ga} ({gd:+d})  {pts}pkt"
        )
    return "\n".join(lines)


def _fmt_results(results: list[dict]) -> str:
    if not results:
        return "  (brak wyników)"
    lines = []
    for r in results:
        ht = r.get("home_team", "?")
        at = r.get("away_team", "?")
        hg = r.get("home_goals", "?")
        ag = r.get("away_goals", "?")
        lines.append(f"  {ht} {hg}–{ag} {at}")
    return "\n".join(lines)


def _fmt_form(form_table: list[dict]) -> str:
    lines = []
    for entry in sorted(form_table, key=lambda e: -e.get("points", 0))[:14]:
        team    = entry.get("team", "")
        results = entry.get("form", [])
        sym_map = {"W": "W", "D": "R", "L": "P"}
        form_str = " ".join(sym_map.get(r.get("result", ""), "?") for r in results[-5:])
        pts5 = entry.get("points", 0)
        lines.append(f"  {team:<28} {form_str}  ({pts5} pkt)")
    return "\n".join(lines)


def _fmt_streaks(advanced_teams: list[dict]) -> str:
    lines = []

    win_s = sorted(
        [(t.get("name", ""), t.get("win_streak", 0)) for t in advanced_teams],
        key=lambda x: -x[1],
    )
    if win_s and win_s[0][1] >= 3:
        top = [f"{n} ({s} meczów)" for n, s in win_s[:4] if s >= 3]
        if top:
            lines.append(f"  Serie zwycięstw (≥3):   {',  '.join(top)}")

    unb_s = sorted(
        [(t.get("name", ""), t.get("unbeaten_streak", 0)) for t in advanced_teams],
        key=lambda x: -x[1],
    )
    if unb_s and unb_s[0][1] >= 4:
        top = [f"{n} ({s})" for n, s in unb_s[:4] if s >= 4]
        if top:
            lines.append(f"  Serie bez porażki (≥4): {',  '.join(top)}")

    score_s = sorted(
        [(t.get("name", ""), t.get("scoring_streak", 0)) for t in advanced_teams],
        key=lambda x: -x[1],
    )
    if score_s and score_s[0][1] >= 5:
        top = [f"{n} ({s})" for n, s in score_s[:3] if s >= 5]
        if top:
            lines.append(f"  Serie strzeleckie (≥5): {',  '.join(top)}")

    if not lines:
        lines.append("  (brak wyróżniających serii)")
    return "\n".join(lines)


def _season_records(results: list[dict]) -> str:
    if not results:
        return "  (brak danych)"
    lines = []
    best = max(results, key=lambda r: r.get("home_goals", 0) + r.get("away_goals", 0), default=None)
    if best:
        total = best.get("home_goals", 0) + best.get("away_goals", 0)
        rnd = best.get("round", "?")
        lines.append(
            f"  Najbardziej bramkostrzelny mecz sezonu (runda {rnd}): "
            f"{best.get('home_team','')} {best.get('home_goals','')}–{best.get('away_goals','')} {best.get('away_team','')}  ({total} goli)"
        )
    biggest = max(
        results,
        key=lambda r: abs(r.get("home_goals", 0) - r.get("away_goals", 0)),
        default=None,
    )
    if biggest:
        diff = abs(biggest.get("home_goals", 0) - biggest.get("away_goals", 0))
        rnd = biggest.get("round", "?")
        lines.append(
            f"  Największa różnica goli sezonu (runda {rnd}): "
            f"{biggest.get('home_team','')} {biggest.get('home_goals','')}–{biggest.get('away_goals','')} {biggest.get('away_team','')}  ({diff:+d})"
        )
    return "\n".join(lines) if lines else "  (brak danych)"


def _build_prompt(standings, results, advanced_teams, form_table, latest_round, prev_text) -> str:
    return f"""Jesteś redaktorem sportowym specjalizującym się w piłce nożnej. Piszesz dla serwisu śledzącego B-klasę Bytom (sezon 2025/2026, Śląski ZPN, Polska).

Masz do dyspozycji dane z rundy {latest_round} oraz kontekst z poprzednich rund. Napisz angażujące podsumowanie po polsku.

══════════════════════════════════════════
WYNIKI RUNDY {latest_round}
══════════════════════════════════════════
{_fmt_results([r for r in results if (r.get("round") or 0) == latest_round])}

══════════════════════════════════════════
POPRZEDNIE RUNDY (kontekst)
══════════════════════════════════════════
{prev_text}

══════════════════════════════════════════
TABELA PO RUNDZIE {latest_round}
══════════════════════════════════════════
{_fmt_standings(standings)}
(Awans bezpośredni: miejsca 1–2 | Play-offy: miejsca 3–6)

══════════════════════════════════════════
FORMA DRUŻYN – ostatnie 5 meczów (W=wygrana, R=remis, P=porażka, punkty zdobyte)
══════════════════════════════════════════
{_fmt_form(form_table)}

══════════════════════════════════════════
SERIE
══════════════════════════════════════════
{_fmt_streaks(advanced_teams)}

══════════════════════════════════════════
REKORDY SEZONU
══════════════════════════════════════════
{_season_records(results)}

══════════════════════════════════════════
ZADANIE
══════════════════════════════════════════
Napisz podsumowanie kolejki {latest_round} (ok. 220–280 słów) w stylu dziennikarza sportowego. Wymagania:

1. Zacznij od uderzającego leadu — najważniejszy lub najbardziej zaskakujący wynik rundy.
2. Omów walkę o czołowe miejsca — lider tabeli, pretendenci, różnice punktowe.
3. Wyróżnij drużyny w świetnej formie i wspomnij o bieżących seriach.
4. Zwróć uwagę na drużyny w kryzysie (seria porażek, słaba forma).
5. Jeśli w tej rundzie padł rekord (bramkostrzelny mecz, wysoka wygrana), odnotuj go.
6. Zakończ krótką zapowiedzią walki w kolejnych rundach lub kluczowymi potyczkami.

Styl: płynna proza, emocjonalny język, bez używania markdown (żadnych **, ## ani list punktorowanych). Pisz jak artykuł prasowy — ciągłym tekstem."""


# ── Main generation function ──────────────────────────────────────────────────

def generate_round_summary(
    standings: list[dict],
    results: list[dict],
    advanced_teams: list[dict],
    form_table: list[dict],
) -> Optional[dict]:
    """
    Use Google Gemini (free tier) to generate a Polish sports summary.
    Returns dict with keys: round, text, model, error.
    Returns error dict if API key missing or call fails.
    """
    if not _GEMINI_AVAILABLE:
        return {"error": f"google-genai import failed: {_IMPORT_ERROR}", "round": None, "text": None}

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_API_KEY not set", "round": None, "text": None}

    if not results:
        return {"error": "no results data", "round": None, "text": None}

    latest_round = max((r.get("round") or 0 for r in results), default=0)
    if latest_round == 0:
        return {"error": "round numbers missing", "round": None, "text": None}

    # Previous 4 rounds for context
    prev_rounds: dict[int, list[dict]] = {}
    for rnd in range(max(1, latest_round - 4), latest_round):
        prev_rounds[rnd] = [r for r in results if (r.get("round") or 0) == rnd]

    prev_text_parts = []
    for rnd in sorted(prev_rounds.keys(), reverse=True):
        prev_text_parts.append(f"Runda {rnd}:\n{_fmt_results(prev_rounds[rnd])}")
    prev_text = "\n\n".join(prev_text_parts) if prev_text_parts else "  (brak danych)"

    prompt = _build_prompt(standings, results, advanced_teams, form_table, latest_round, prev_text)

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                max_output_tokens=2048,
                temperature=0.8,
                # Disable chain-of-thought thinking so all tokens go to the response
                thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
            ),
        )
        text = response.text.strip()
        return {
            "round": latest_round,
            "text": text,
            "model": "Gemini 2.5 Flash",
            "error": None,
        }
    except Exception as exc:
        print(f"[round_summary] Gemini API error: {exc}")
        return {"error": str(exc), "round": latest_round, "text": None}
