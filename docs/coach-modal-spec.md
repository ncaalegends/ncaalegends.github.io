# Coach Card Modal — Spec

**Status:** Phase 1 COMPLETE (data layer + CLI probe). Phases 2–5 not started.
**Scope:** v1 — same-league data only. Cross-league (via `people.js`) is explicitly deferred.

> **Multi-season note, added after the first draft.** This dynasty is expected to
> run 8–10 seasons per league. The card is a career record, not a season card.
> Phase 1 was therefore built season-aware and postseason-ready from the start,
> which changed the data layer substantially from §3 below — see
> `docs/seasons-and-postseason.md` for what actually shipped. The reality-check
> numbers in §2 remain accurate **for season 2026 only**, and the "a matrix grid
> is the wrong shape" conclusion still holds: at ~4 H2H opponents per coach per
> season, even ten seasons leaves a coach with far fewer opponents than a full
> matrix implies, just with much deeper history against each.
**Files touched:** `week-core.js`, `script.js`, `style.css`, all three `index.html`
**Files NOT touched:** `league-data.js`, `schedule-data.js` (no new data capture required)

---

## 1. What this is

Clicking a roster card opens a modal showing that coach's head-to-head record
against every other coach in the league, plus a small set of derived season
stats. Escape / backdrop click / close button dismisses it.

Everything in v1 is computed from data already in the repo. There is no new
per-game transcription burden.

---

## 2. Reality check — read this before designing anything

These numbers were measured against `main/` on 2026-07-26 by running
`WeekCore.buildWeek` over weeks 0–15 with the same filtering `script.js` applies
(`ROSTER` / `SCHEDULES`, inactive coaches removed).

| Measure | main | 3star | 1star |
|---|---|---|---|
| Active coaches | 23 | 14 | 8 |
| League (coach-vs-coach) matchups scheduled, whole season | **42** | 14 | 8 |
| League matchups **played** so far | **3** | **0** | 1 |
| `latestH2HWeek` | 2 | `null` | 1 |
| Coaches appearing in the Power Rankings | **6 of 23** | **0 of 14** | 2 of 8 |
| Coaches with ≥1 H2H matchup all season | 22 of 23 | 14 of 14 | 8 of 8 |
| H2H opponents per coach — avg / min / max | **3.8 / 1 / 6** | 2.0 / 1 / 3 | 2.0 / 1 / 3 |
| Weeks of AP poll on file | 2 | **0** | **0** |

The three games played in `main` are Cal 22–9 UCLA and SMU 28–21 FSU (W1), and
Michigan 24–14 Oklahoma (W2). `Turt17` (Colorado) is the one coach in any league
with **zero** H2H matchups scheduled all season — a full CPU slate.

Three consequences that drive the whole design:

**2a. A matrix grid is the wrong shape.** A 23 × 23 grid is 506 cells of which
at most 84 will *ever* be populated — 83% permanently blank. The "H2H matchup
grid" must be an **opponent list** (3–6 rows per coach), not a matrix. It reads
better, fits a modal without scrolling, and doesn't lie about how much data
exists.

**2b. Most of the modal is empty at Week 2.** Three games played across all
three dynasties combined. Seventeen of twenty-three `main` coaches have no power
rank, `3star` has **no played H2H games at all** (every stat tile blank for all
fourteen coaches), and `Turt17` will never have an H2H row. Every stat needs an
explicit empty state, and the modal has to look *deliberate* when empty, not
broken. This is the single biggest risk in the feature: it launches at its worst
and improves weekly.

**2c. Scheduled-but-unplayed matchups are the only content that exists right
now.** So the opponent list must show *upcoming* matchups too, not just results.
That turns the grid from "mostly blank" into "here's your season slate, with
results filling in" — useful in Week 2 and still useful in Week 14.

---

## 3. Data layer

### 3.1 New function: `WeekCore.computeH2H(data, opts)`

Lives in `week-core.js` beside `computeRankings`, exported in the same return
block. Node and browser both get it for free via the existing UMD wrapper.

Reuses `makeResolver` and `buildWeek` — **no new name-resolution logic**. That
rule is the whole reason `week-core.js` exists (see its header comment); adding
a fourth place that matches roster names would be the exact failure it was
created to prevent.

```
computeH2H(data, { throughWeek = 15 })
  -> Map(rosterKey -> {
       key, team, coach,
       opponents: [ {
         key, team, coach,
         wins, losses,              // played + simmed results
         games: [ {
           week, played, sim,
           home,                    // bool: was this coach at home
           pf, pa,                  // null when unplayed
           win,                     // null when unplayed
           stadium
         } ],
         nextWeek                   // earliest unplayed week, or null
       } ]
     })
```

Build rule, mirroring `computeRankings` exactly so the two can never disagree:

- Iterate `buildWeek(data, w)` for `w` in `0..throughWeek`.
- For each `wk.league` matchup, push a game onto **both** coaches' entries.
- `m.scored` present → `played: true`, split into pf/pa from that coach's side.
- `m.scored` absent → `played: false`, pf/pa null. **This is the change from
  `computeRankings`, which drops unplayed games entirely.**
- `m.sim === true` → counts toward `wins`/`losses`, flagged `sim: true`.
- CPU games (`wk.cpu`) are **not** included. H2H means coach-vs-coach.
- Sort `opponents` by: played games desc, then coach name asc.

### 3.2 New function: `coachStatsFor(key)` in `script.js`

Thin assembly layer over things that already exist. Not in `week-core.js` —
it's presentation-shaped, and `week-core.js` is deliberately logic-only.

| Field | Source | Notes |
|---|---|---|
| `record` | `computeRankings` → `r.record` | H2H only, sims included |
| `overallRecord` | `buildWeek` → `wk.cpu` scored + H2H | includes CPU games; **new** — currently nowhere on the site |
| `powerRank` / `powerScore` | `computeRankings({throughWeek: latestH2HWeek})` | null when unranked |
| `peakRank` | loop `computeRankings({throughWeek: w})` for `w` in `0..latestH2HWeek`, take min rank | cheap: ≤16 calls over ≤23 teams |
| `avgMargin` | `computeH2H` played games | **raw, unclamped** — see §6 |
| `pf` / `pa` | `computeH2H` played games | per-game averages |
| `streak` | `computeH2H`, most recent played games | `"W3"` / `"L2"` / `null` |
| `bestWin` | played wins, min `oppRankIn(week, oppKey)` | uses that week's frozen poll; falls back to biggest margin where there is no poll (§6b) |
| `pollRank` / `peakPollRank` | `TOP25_DATA` | in-game AP, distinct from power rank. **`main` only** — see §6b |
| `nextGame` | first unplayed entry in that coach's schedule | opponent, week, home/away, CPU-or-coach |

**Caching:** compute once on first modal open, memoise in a module-level `Map`.
`peakRank` is the only non-trivial cost and it's still trivial at this scale.
Do **not** recompute per card render.

---

## 4. Modal — behaviour

### 4.1 Element

Use native `<dialog>` with `showModal()`. It gives focus trapping, inertness of
the background, Escape-to-close, and the `::backdrop` pseudo-element for free.
Baseline across all current browsers; no polyfill.

This matches how `renderLeagueSwitch` uses `<details>` — lean on the platform
element, add only what it lacks.

One dialog element in each `index.html`, contents re-rendered per open:

```html
<dialog id="coach-modal" class="coach-modal" aria-labelledby="cm-title">
  <div id="coach-modal-body"></div>
</dialog>
```

### 4.2 Open

Roster cards become `<button class="roster-card">` — **not** `<article>` with a
click handler. A button is keyboard-focusable and screen-reader-announced for
free.

Conflict to resolve: the card contains an `<a class="twitch-link">`. Nested
interactive elements are invalid HTML and the anchor click would bubble into the
modal. **Fix:** keep the card an `<article>`, add a full-bleed
`<button class="r-open">` positioned absolutely behind the content with the
Twitch link raised above it via `z-index`. The button carries
`aria-label="View ${coach} details"`.

### 4.3 Close

- `Escape` — free from `<dialog>`.
- Close button, top-right, `aria-label="Close"`.
- Backdrop click — needs a handler; `<dialog>` does not do this by default:
  ```js
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  ```
  (works because the backdrop registers as a click on the dialog itself, so the
  inner wrapper `<div>` in §4.1 is load-bearing, not decoration.)
- On close, return focus to the card that opened it. `<dialog>` mostly handles
  this; store the trigger anyway since the roster re-renders on live-status
  refresh and the original node may be gone.

### 4.4 Deep link

`#roster/coach/<personKey>` opens the modal directly. Uses `personKey()` from
`people.js`, which is already the canonical join key — so the URL survives a
display-name spelling change.

Must not break `setupTabs()` (`script.js:1489`), which passes
`location.hash.slice(1)` straight into `showTab` from both the `hashchange`
listener and the initial call. `showTab` would not recognise
`roster/coach/miles` as a tab. Split on `/` at both call sites and pass only the
first segment; the coach segment is read separately. `personKey()` is available
because `people.js` is loaded before `script.js` in all three `index.html`
files.

Value: someone can paste "here's my card" into Discord. That's the feature's
main distribution path.

---

## 5. Modal — layout

Three stacked sections. Desktop `min(680px, 92vw)`, full-screen sheet under
640px.

### 5.1 Header

Team mark (`teamMarkHtml(team, "lg")` — exists), team name, coach handle,
conference chip, LIVE badge if `isLive(c)`, Twitch button if `safeUrl(c.twitch)`.
Left border in `--team`, matching the roster card. Close button top-right.

### 5.2 Stat strip

Six mono-font figures in a responsive grid (3 × 2 desktop, 2 × 3 mobile):

```
H2H RECORD    POWER RANK    PEAK RANK
1-0           #3            #1

AVG MARGIN    STREAK        AP POLL
+13.0         W1            —
```

Each tile renders `—` in `--steel` when its value is null. Never hide a tile —
the grid must not reflow between coaches, or the modal jumps as you page
through cards.

**Minimum-games gate:** `avgMargin`, `streak`, and `bestWin` render `—` until
`playedGames >= 2`. A single game producing "avg margin +13.0" is technically
true and informationally worthless, and it makes the site look like it's
padding. Constant at the top of `script.js`:
`const MIN_GAMES_FOR_STATS = 2;`

### 5.3 H2H opponent list (the "grid")

One row per opponent — 3 to 6 rows, per §2. Rows are ordered played-first.

```
┌────────────────────────────────────────────────────────┐
│ HEAD-TO-HEAD                                           │
├────────────────────────────────────────────────────────┤
│ [logo] SMU        EYEDONTPULL19    1-0   W 28-21  W1   │
│ [logo] Clemson    Temptiger        0-0   Wk 6  at      │
│ [logo] Miami      wacky9speedy     0-0   Wk 9  vs      │
└────────────────────────────────────────────────────────┘
```

Columns: team mark + name, coach handle, series record, result-or-upcoming.

- Played: `W 28-21` in `--win`, `L 21-28` in `--crimson`, week badge after.
- Simmed: same, with a `SIM` chip. Sims count for the record but not the power
  score — the chip is how a reader reconciles the two without reading source.
- Unplayed: `Wk 6` + `at`/`vs` in `--steel`, no colour.
- Multiple meetings (championship rematch): stack the results in one row rather
  than duplicating the opponent.
- Rows are **not** clickable in v1. Opponent-to-opponent navigation is a nice
  idea and a scope trap; note it as future work.

**Empty state**, for `Turt17` and for anyone before their first matchup:

> No head-to-head matchups scheduled. Colorado plays a full CPU slate this
> season.

Not a generic "no data" — say the true, specific thing.

### 5.4 Footer line

`Next: vs Ole Miss (II_PROGGY_II) — Week 3` or `Next: at Kansas — Week 3 (CPU)`.
Small, `--steel`. This is the one thing a coach checks every week and it costs
nothing.

---

## 6. Two correctness rules

**6.1 Show raw margin, label the clamped one separately.**
`computeRankings` clamps margins at `maxMarginPerGame: 21` before scoring. If
the modal shows "AVG MARGIN +34.0" from a 41-7 win while the power score used
+21, someone will do the arithmetic and conclude the rankings are broken. Show
the true average margin in the stat strip. Where the power score is explained,
say so explicitly:

> Margins above 21 are capped when scoring the poll, so a 70-0 isn't worth
> three 21-0s.

**6.2 Distinguish the two "ranks".** The site has an in-game AP Top 25
(`top25-data.js`, CPU teams included) and its own computed Power Ranking
(`computeRankings`, coaches only). They are unrelated numbers and the modal
shows both. Label them `POWER RANK` and `AP POLL` — never bare "Rank".

---

## 6b. The other two leagues have no AP poll

`main/` has `top25-data.js`. **`3star/` and `1star/` do not** — no file, not
referenced in their `index.html`, `TOP25` is undefined and `TOP25_DATA` falls
back to `[]`. This is easy to miss because all three leagues share `script.js`.

Consequences for the modal:

- The `AP POLL` and `PEAK AP` values are permanently `—` in two of three
  leagues. **Don't ship a tile that is structurally always empty there** — build
  the stat strip from a list filtered on `TOP25_DATA.length > 0`, so those
  leagues get a 5-tile strip rather than a dead one. The "never reflow between
  coaches" rule in §5.2 still holds; the strip is fixed *per league*.
- `bestWin` is defined as "highest-ranked opponent beaten" via `oppRankIn()`,
  which returns `unrankedRank: 26` for everyone when there's no poll. In those
  leagues it must fall back to **biggest win by margin**, with the label
  changing to match (`BEST WIN` → `BIGGEST WIN`). Silently ranking six opponents
  all tied at 26 and picking the alphabetical first is the failure mode here.
- Not a modal problem, but worth knowing: with no poll, `sosBonus` is always
  zero in those leagues, so their power rankings are win% + margin + road wins
  only.

Also: **no schedule entry in any league currently carries `sim: true`.** The SIM
chip in §5.3 is untested against real data — it is correct per `buildWeek`, but
verify it with a hand-made fixture rather than assuming.

---

## 7. Accessibility

- `<dialog>` + `showModal()` handles focus trap, background inertness, Escape.
- `aria-labelledby` points at the coach/team heading.
- The full-bleed open button has an `aria-label`; the Twitch link keeps its own
  accessible name and sits above the button in the stacking order.
- Result colours are never the sole signal — every result carries a literal
  `W` / `L` character. Required for the ~8% of male players with red-green
  colour deficiency, which `--win` green vs `--crimson` red would otherwise
  fail outright.
- `--steel` (4.9:1) for muted text. **Never `--steel-dim`** — it is 2.4:1 and
  the token comment in `style.css` says borders only.
- Add modal transitions to the existing `@media (prefers-reduced-motion: reduce)`
  block at `style.css:1915`.

---

## 8. CSS

New block in `style.css`, after the roster-card / live-state rules (which end
around line 1460, just before the `SCHEDULE — Weekly / By Team` banner). Uses
existing tokens only — `--navy-panel`, `--line`, `--team`, `--chalk`, `--steel`,
`--win`, `--crimson`, `--font-mono`, `--cut`. No new design tokens.

Backdrop: `rgba(6, 11, 22, 0.82)` (`--navy-deep` at 82%) + `backdrop-filter:
blur(3px)`. Panel gets the standard `--cut` diagonal clip so it reads as part of
the same HUD language as every other panel.

Stat figures in `--font-mono`, matching how digits are set everywhere else on
the site.

---

## 9. Build order

Each phase ships independently and leaves the site working.

| Phase | Work | Why this order |
|---|---|---|
| ~~**1**~~ | ~~`computeH2H` in `week-core.js` + a Node probe script under `tools/`~~ **DONE** — shipped season-aware and postseason-ready; see `docs/seasons-and-postseason.md` | Pure logic, testable from the CLI with zero UI. Verify against known games before any markup exists. |
| **2** | Modal shell — `<dialog>`, open/close, focus return, header only | Proves the interaction on all three leagues before content complexity lands. Test `3star` explicitly: zero played games is the true worst case. |
| **3** | H2H opponent list | The actual feature. |
| **4** | Stat strip + `coachStatsFor` + min-games gates | Depends on nothing in phase 3; can slip without blocking. |
| **5** | Deep-link hash, footer next-game | Polish. |

**Deferred, deliberately:**

- Cross-league H2H via `people.js` — requires loading two other leagues' data
  files on demand. Real value (13 coaches play in more than one dynasty), real
  architecture. Its own spec.
- Rank sparkline over weeks — needs ~6 weeks of data to not look silly.
- Career/dynasty history — needs a new hand-maintained `history: []` field.
- Box-score stats (yards, turnovers, TOP) — needs a schema change to every
  schedule entry and per-game transcription. Recommend against.
- Clickable opponent rows.

---

## 10. ~~Open issue~~ FIXED 2026-07-26 (was unrelated to this feature)

`week-core.js` has its own inactive-coach handling: `makeResolver` builds
`inactiveKeys` from `ALL_COACHES.filter(c => c.active === false)`, and
`buildWeek` uses `isInactiveTeam` to skip those schedule blocks.

That code is currently **dead**. `script.js:740` passes
`RANKING_DATA = { COACHES: ROSTER, ... }`, and `ROSTER` is already filtered to
active coaches — so `inactiveKeys` is always empty by the time `makeResolver`
sees it.

Production is fine today, because `script.js:71` *also* filters `SCHEDULES`,
which removes Louisville's stale block by a second route. But the two guards are
redundant, and only the weaker one is doing the work.

Confirmed by probe: passing filtered `COACHES` with **unfiltered**
`TEAM_SCHEDULES` resurrects Jake/Louisville as a league opponent in weeks 1, 3,
4 and 6, producing four matchups with an empty coach name. Passing unfiltered
`COACHES` behaves correctly.

Not a bug you could hit from the website. It was a live trap for the next
caller — including `computeH2H`.

`tools/lib/league.js:135` and `admin/admin.js:147` both pass **raw, unfiltered**
`COACHES`, so the guard was already working correctly for the CLI and the admin
page. `script.js` was the only pre-filtering caller.

**Fix applied.** `RANKING_DATA` now passes `ROSTER_RAW` and `SCHEDULES_RAW`,
letting `week-core.js` apply its own `active: false` rules as designed. The
filtered `ROSTER` / `SCHEDULES` handles are unchanged and still drive everything
else in `script.js` — this is the one place that hands data to another module.

Verification:

1. **Equivalence** — loaded the real `script.js` at `HEAD` and after the change,
   in all three leagues, and compared every `buildWeek` result for weeks 0–15
   (league matchups with scores *and* resolved coach names, CPU games, notes,
   missing), plus `latestH2HWeek` and the full `computeRankings` output to 6
   decimal places. Byte-identical in all three.
2. **The guard is now armed** — `isInactiveTeam("Louisville")` returns `true`
   (it returned `false` before, which was the bug), `isLeagueTeam("Louisville")`
   returns `false`, Louisville appears as a league matchup 0 times and as a CPU
   opponent 4 times — exactly the four weeks that were being resurrected.
