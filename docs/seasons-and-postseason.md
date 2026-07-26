# Seasons and the Postseason

Two data conventions added 2026-07-26 so that the dynasty's history is
recoverable across 8–10 seasons. Both are **future-proofing**: no season has
been archived yet and no postseason data exists in any league.

---

## 1. Season identity

Every `league-data.js` now carries an in-game year:

```js
const SEASON = {
  year: 2026,
  currentWeek: 2,
  ...
};
```

In-game year, not real-world. All three leagues are `2026` today; next season is
`2027`, and so on.

This has to be set **before** the first archive happens. A season archived
without a year can't be placed on the timeline afterwards.

---

## 2. Season archive

The league folder always holds the **current** season. A finished season moves
wholesale into `seasons/<year>/`, keeping the same filenames:

```
main/
  league-data.js          <- the season being played now
  schedule-data.js
  top25-data.js
  postseason-data.js
  seasons/
    2026/
      league-data.js      <- exactly the files above, frozen
      schedule-data.js
      top25-data.js
      postseason-data.js
```

**Whole files, not a diff.** A season's roster is part of its history: who
coached which school in 2026 is the only way to render a 2026 meeting correctly
once someone has changed teams. Archiving a schedule without the roster beside
it leaves games whose participants can't be resolved. The files are small and
the redundancy is deliberate — an archived season stays readable on its own
forever, regardless of what the league looks like later.

**The archive is read-only.** Nothing writes into `seasons/` except the rollover,
and the live site never edits it. A past season is history in exactly the sense
a Top 25 week is history: adding is fine, editing is not.

If a folder's name and its file's `SEASON.year` disagree, **the folder name
wins** — it's the thing a human can see and sort.

Loading, from Node:

```js
const { resolveLeague, loadCareer } = require("./tools/lib/league");
const career = loadCareer(resolveLeague("main"));
// [{ year: 2026, data }, ...] oldest first, current season LAST
```

Current season last is what `computeH2H`'s `throughWeek` option expects — it
caps the season actually being played and takes earlier ones whole.

**Not yet built:** the rollover tool itself. Archiving today means creating
`seasons/<year>/`, copying the four files in, and bumping `SEASON.year`. Worth
automating before the first rollover, not before.

---

## 3. Postseason format

Optional `<league>/postseason-data.js`. Absent everywhere today; absent is a
valid state and returns no games.

```js
const POSTSEASON = {
  rounds: [
    { id: "ccg", label: "Conference Championships", games: [
      { home: "Georgia", away: "Texas", title: "SEC Championship",
        neutral: true, stadium: "Mercedes-Benz Stadium",
        homeScore: 31, awayScore: 24 },
    ]},
    { id: "cfp-r1", label: "CFP First Round",       games: [ ... ] },
    { id: "cfp-qf", label: "CFP Quarterfinal",      games: [ ... ] },
    { id: "cfp-sf", label: "CFP Semifinal",         games: [ ... ] },
    { id: "cfp-nc", label: "National Championship", games: [ ... ] },
    { id: "bowl",   label: "Bowl Games",            games: [ ... ] },
  ],
};
```

### Why this shape differs from the regular season

The regular season is stored **per team** — each team owns a 16-entry week list,
and a league game appears twice, once on each side. The postseason is stored
**per game**, one row.

That redundancy is a liability for a handful of one-off neutral-site games.
Writing a game twice is how home/away disagreements and half-entered scores get
in; the regular-season files already need hand-deduping (see the header of any
`schedule-data.js`). One row per game removes the entire class of error.

### Field notes

| Field | Meaning |
|---|---|
| `id` | stable machine name — never rendered |
| `label` | what the site shows for the round |
| `title` | the specific game name, e.g. `"Rose Bowl"`. Falls back to the round label |
| `neutral` | no true home team. `home`/`away` still decide which score is which; the site renders "vs" at a named site rather than "at" |
| `homeScore` / `awayScore` | omit both for an unplayed game |
| `sim` | force-sim or forfeit — counts for the record, excluded from the power score |

**Rounds are ordered by their position in the array.** There is no `order`
field; inserting a round means putting it in the right place.

Games where either side is a CPU team or an inactive coach are dropped — the
same rule `buildWeek` applies to the regular season. A coach-vs-CPU bowl is real
but isn't head-to-head.

### Still to do when real data arrives

The week axis is hard-capped at 15 in eight places (`tools/lib/league.js`,
`worker/admin-api.js`, `tools/top25.js`, `admin/admin.js`, and others). The
postseason format sidesteps that cap by not using week numbers at all — but the
**site's schedule views** don't render postseason games yet, and the admin
score-entry page can't enter them. Both are downstream of this format, not
blocked by it.

---

## 4. New functions

All in `week-core.js`, re-exported from `tools/lib/league.js`.

| Function | Purpose |
|---|---|
| `buildPostseason(data)` | postseason games as matchups, same shape as `buildWeek().league` |
| `seasonMeetings(data, opts)` | one season flattened — regular weeks + postseason — into uniform records |
| `computeH2H(seasons, opts)` | career head-to-head, keyed by **coach** |
| `computeRankings(seasons, opts)` | **rewritten** — see §4b |
| `auditScheduleSides(data)` | data integrity — see §5 |

### `computeH2H` keys on the coach, not the team

Everywhere else in `week-core.js` the join key is the team. Here it's the
coach's handle, normalised exactly as `personKey()` in `people.js` does it:
trimmed, lowercased, then run through an optional alias map.

Coaches change schools between seasons. A career record has to follow the
person, not the program. `opts.coachAliases` handles someone who changed
handles — same table shape as `PEOPLE_ALIASES`.

`people.js` is the site's identity authority but isn't loaded in Node, so the
rule is restated in `week-core.js` rather than imported. **If you change one,
change the other.**

### Why it isn't part of `computeRankings`

The power poll answers "how good is this team right now". Every one of its
choices is wrong for a career record:

| | `computeRankings` | `computeH2H` |
|---|---|---|
| Seasons | current only | all |
| Unplayed games | dropped | **included** |
| Sims | excluded | included, flagged |
| Keyed on | team | **coach** |
| Window | last 10 games | none |

Merging them would mean a pile of flags and the two would drift.

---

## 4b. Power Rankings now span seasons

**The poll ranks the last 10 head-to-head games a COACH has played, regardless
of in-game year.** Previously it was one season, keyed on the team.

A per-season poll resets every autumn and spends the first month of each year
ranking nobody. Over 8–10 seasons that's most of the dynasty's life spent with a
poll that isn't live. A window that follows the person is live all the time.

### What this means when a coach changes schools

The row shows their **current** team, and the games behind the number may have
been won somewhere else. A coach who moves carries their window with them.

That's a real trade, made deliberately: resetting the window on a move breaks it
exactly when a coach is most interesting to look at. The output carries
`windowSpansSeasons: true` so the UI can mark a row whose L10 reaches back past
this year.

### Identity comes from the current roster, not the game log

Everything in the poll is derived from played games, so a coach whose most
recent result is two seasons old would otherwise show the handle and school they
had back then. After aggregating, the current season's roster overrides both.

A coach who has left the league isn't on the current roster, so they keep their
last known identity — which is the right answer for them.

### Fields

| Field | Meaning |
|---|---|
| `key` | **coach** key now, was the roster key |
| `team` / `coach` | current identity |
| `l10` | record over the rolling window — **can span seasons** |
| `record` | career H2H, sims included |
| `seasonRecord` / `seasonYear` | most recent season only |
| `playedGames` | games inside the window (sims excluded) |
| `windowSpansSeasons` | window reaches into an earlier season |

### Strength of schedule in the postseason

Regular-season SoS reads the AP poll for the week a game was played, in the
season it was played — frozen history, the same rule the `#N` schedule badges
use.

Postseason games have no week, so there's no weekly poll to read. Scoring a
national championship win as if it were against an unranked cupcake would be
actively wrong — winning the title would *lower* a coach's rating. So a season
may carry a `CFP_POLL`:

```js
const CFP_POLL = { teams: [ { rank: 1, team: "Georgia" }, ... ] };
```

or, if the in-game playoff rankings are transcribed weekly as they update, an
array — the **last entry wins**, because that's the bracket the postseason was
actually seeded from:

```js
const CFP_POLL = [ { week: 12, teams: [...] }, { week: 14, teams: [...] } ];
```

Fallback order for a postseason opponent's rank:

1. `CFP_POLL` for that season
2. that season's **last available AP week** — the most recent measurement that exists
3. `cfg.unrankedRank` (26)

No league has a `CFP_POLL` today, so step 2 runs. That's why a missing file
degrades quietly instead of punishing playoff teams.

**Either shape above works — no code change needed when the poll arrives.** Drop
a `CFP_POLL` into the league folder (or the archived season's folder) and it's
picked up.

### `throughWeek` gates the postseason

Capping at week 6 means "the season as it stood in week 6", and in week 6 no
bowl has been played. `seasonMeetings` therefore includes postseason games only
when `throughWeek >= 15`. This matters directly: the up/down arrows compute the
previous poll with `throughWeek: week - 1`, and at week 0 of a new season that's
`-1` — every archived season whole, nothing from the current one.

### Back-compatibility

`computeRankings` accepts a single data object or an array of seasons, so
existing single-season calls are unchanged. Verified against `week-core.js` at
`HEAD` across all three leagues at `throughWeek` = null/0/1/2/15: ranks, scores
to 6dp, records and L10 all identical.

---

## 5. A real hole this surfaced

`buildWeek` reads a league game from **whichever team appears first in
`TEAM_SCHEDULES`** and discards the other side entirely — only `sim` is OR'd in.

So if Michigan's entry says it won 24–14 and Oklahoma's says it lost 14–41, the
site displays one of them silently, chosen by file order, which has nothing to
do with which is correct. Both halves are hand-transcribed from two different
coaches' screenshots, so this is a realistic error, not a hypothetical.

Tolerable for a live scoreboard. **Not** tolerable for a permanent career record.

`auditScheduleSides(data)` reads the raw week entries rather than the built
matchups — which is the entire point, since two values derived from a single
entry can never disagree. It reports:

| kind | meaning |
|---|---|
| `missing` | one side lists the game, the other doesn't |
| `location` | both call it home, or both call it away |
| `score` | the two sides report different scores |
| `half` | one side has a score, the other doesn't |
| `sim` | only one side is flagged as a sim |

All three leagues pass clean today. Verified by corrupting a copy of `main/` in
each of the four ways above and confirming each is caught, then confirming the
restored copy is clean again.

---

## 6. The probe

`tools/h2h.js` — read-only, no network, no writes.

```
node tools/h2h.js --league main                  every coach
node tools/h2h.js --league main --coach Projekt  one coach, every meeting
node tools/h2h.js --league main --summary        one line per coach
node tools/h2h.js --league main --check          assertions; exits non-zero on failure
```

It renders in text what the roster-card modal will render in HTML, so the
numbers can be checked against the data files by eye before any markup exists.

`--check` runs seven assertions, including agreement with `computeRankings` on
the current season — the guard that stops the two traversals drifting apart.
