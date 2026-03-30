"""
AI-generated round summary using Claude Haiku 3.5 (Anthropic API).
Generates a Polish sports-journalist summary of the latest round.

Cost: ~$0.004 per summary (well under $5 for an entire season).
Summary is cached per round number (in memory + on disk) and only
regenerated when new round data arrives.

Set env var: ANTHROPIC_API_KEY=<your key>
"""

import os
from typing import Optional

try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError as _import_err:
    _ANTHROPIC_AVAILABLE = False
    _IMPORT_ERROR = str(_import_err)
else:
    _IMPORT_ERROR = None


# ── Formatting helpers ────────────────────────────────────────────────────────

def _fmt_standings(standings: list[dict]) -> str:
    lines = []
    for t in standings[:15]:
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
            f"  {pos:>2}. {name:<30} {p:>2}m  {w}W/{d}R/{l}P  {gf}:{ga} ({gd:+d})  {pts}pkt"
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
    for entry in sorted(form_table, key=lambda e: -e.get("points", 0))[:15]:
        team    = entry.get("team", "")
        results = entry.get("form", [])
        sym_map = {"W": "W", "D": "R", "L": "P"}
        form_str = " ".join(sym_map.get(r.get("result", ""), "?") for r in results[-5:])
        pts5 = entry.get("points", 0)
        lines.append(f"  {team:<30} {form_str}  ({pts5} pkt)")
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
            f"  Najbardziej bramkostrzelny mecz sezonu (kolejka {rnd}): "
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
            f"  Największa różnica goli sezonu (kolejka {rnd}): "
            f"{biggest.get('home_team','')} {biggest.get('home_goals','')}–{biggest.get('away_goals','')} {biggest.get('away_team','')}  ({diff:+d})"
        )
    return "\n".join(lines) if lines else "  (brak danych)"


def _build_prompt(standings, results, advanced_teams, form_table, latest_round, prev_text) -> str:
    data_block = f"""WYNIKI KOLEJKI {latest_round}:
{_fmt_results([r for r in results if (r.get("round") or 0) == latest_round])}

TABELA PO KOLEJCE {latest_round} (kolumny: miejsce, drużyna, mecze, W/R/P, bramki, różnica, punkty):
{_fmt_standings(standings)}
Awans bezpośredni: miejsca 1–2 | Play-offy: miejsca 3–6

FORMA DRUŻYN – ostatnie 5 meczów (W=wygrana, R=remis, P=porażka; liczba punktów zdobytych w tych 5 meczach):
{_fmt_form(form_table)}

SERIE:
{_fmt_streaks(advanced_teams)}

REKORDY SEZONU:
{_season_records(results)}

POPRZEDNIE KOLEJKI (kontekst):
{prev_text}"""

    return f"""Wcielasz się w rolę Marka Wiśniewskiego — doświadczonego dziennikarza sportowego z wieloletnim stażem w regionalnej prasie śląskiej, specjalizującego się w amatorskiej piłce nożnej. Twoje teksty ukazują się w wydaniu powiatowym i cieszą się uznaniem czytelników za rzetelność, klasyczny styl i nienaganną polszczyznę. Nigdy nie pozwalasz sobie na żaden błąd językowy, stylistyczny ani interpunkcyjny.

ZASADY ŻELAZNE — BEZWZGLĘDNIE OBOWIĄZUJĄCE:
1. Piszesz WYŁĄCZNIE na podstawie danych przekazanych poniżej w sekcji DANE. Nie wolno Ci niczego dopisywać, zgadywać ani wymyślać — żadnych nazwisk, wyników, wydarzeń ani kontekstów, których nie ma w przekazanych danych.
2. Jeżeli jakiś mecz nie ma opisu przebiegu gry — ograniczasz się do podania wyniku i ogólnego skomentowania pozycji tabeli. Nie opisujesz bramek, sytuacji ani wydarzeń, o których nie masz informacji.
3. Dbasz o czystość języka polskiego na najwyższym poziomie: bezbłędna ortografia, interpunkcja, odmiana przez przypadki, właściwy szyk zdania, brak anglicyzmów tam, gdzie istnieje polskie słowo, brak pleonazmów i kalek językowych.
4. Styl jest prasowy: obiektywny, rzeczowy, a zarazem angażujący czytelnika. Unikasz zarówno suchej statystyki, jak i nadmiernie emocjonalnego języka.
5. Artykuł liczy od 500 do 700 słów (bez tytułu i lidu).
6. Struktura tekstu: tytuł → lid (1–2 zdania) → omówienie poszczególnych meczów → akapit o sytuacji w tabeli → zdanie zamykające (zapowiedź kolejnej kolejki lub refleksja o sezonie).
7. Bez markdown — żadnych **, ## ani list punktorowanych. Ciągły tekst prasowy podzielony na akapity.

---
DANE (wyniki kolejki {latest_round}, tabela, forma drużyn, serie i kontekst poprzednich kolejek):

{data_block}

---
Napisz artykuł zgodnie z powyższymi wytycznymi, korzystając wyłącznie z przekazanych danych."""


# ── Main generation function ──────────────────────────────────────────────────

def generate_round_summary(
    standings: list[dict],
    results: list[dict],
    advanced_teams: list[dict],
    form_table: list[dict],
) -> Optional[dict]:
    """
    Use Claude Haiku 3.5 (Anthropic API) to generate a Polish sports summary.
    Returns dict with keys: round, text, model, error.
    """
    if not _ANTHROPIC_AVAILABLE:
        return {"error": f"anthropic import failed: {_IMPORT_ERROR}", "round": None, "text": None}

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not set", "round": None, "text": None}

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
        prev_text_parts.append(f"Kolejka {rnd}:\n{_fmt_results(prev_rounds[rnd])}")
    prev_text = "\n\n".join(prev_text_parts) if prev_text_parts else "  (brak danych)"

    prompt = _build_prompt(standings, results, advanced_teams, form_table, latest_round, prev_text)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        return {
            "round": latest_round,
            "text": text,
            "model": "Claude Sonnet 4.5",
            "error": None,
        }
    except Exception as exc:
        print(f"[round_summary] Claude API error: {exc}")
        return {"error": str(exc), "round": latest_round, "text": None}
