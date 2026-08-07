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
  cfp-data.js
  postseason-data.js
  seasons/
    2026/
      league-data.js      <- exactly the files above, frozen
      schedule-data.js
      top25-data.js
      cfp-data.js
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

Games where either side is a CPU team or a departed coach are dropped — the
same rule `buildWeek` applies to the regular season. A coach-vs-CPU bowl is real
but isn't head-to-head.

`buildWeek`'s version of that rule is week-scoped (a coach carrying
`departedAfterWeek: N` is a league team through week N and CPU after it), but
the postseason has no week number to scope by. It asks the unscoped question —
"is this a league team now?" — which reads a departure as already having
happened. That is the right answer: a coach who quit in week 5 is not in the
playoff.

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
| Window | last 5 games | none |

Merging them would mean a pile of flags and the two would drift.

---

## 4b. Power Rankings now span seasons

**The poll ranks the last 5 head-to-head games a COACH has played, regardless
of in-game year.** Previously it was one season, keyed on the team.

A per-season poll resets every autumn and spends the first month of each year
ranking nobody. Over 8–10 seasons that's most of the dynasty's life spent with a
poll that isn't live. A window that follows the person is live all the time.

### What this means when a coach changes schools

The row shows their **current** team, and the games behind the number may have
been won somewhere else. A coach who moves carries their window with them.

That's a real trade, made deliberately: resetting the window on a move breaks it
exactly when a coach is most interesting to look at. The output carries
`windowSpansSeasons: true` so the UI can mark a row whose L5 reaches back past
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
| `l5` | record over the rolling window — **can span seasons** |
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

Both shapes are supported. Since 2026-08 the weekly array is what actually gets
written, by `tools/cfp.js` — see §7. A season with an empty `CFP_POLL` falls
through to step 2, which is why a league that never reached the CFP era degrades
quietly instead of punishing playoff teams.

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
to 6dp, records and L5 all identical.

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

---

## 7. The CFP era (added 2026-08)

The in-game poll is the AP Top 25 through week 9 and the **CFP Top 25** from
week 10, and from week 10 the game also shows a projected 12-team bracket. Both
live in a new optional `<league>/cfp-data.js`:

```js
const CFP_POLL = [
  { week: 10, teams: [ { rank, team, record }, ... x25 ] },
];

const CFP_BRACKET = [
  { week: 10, projected: true, seeds: [
      { seed: 1, team: "Ohio State", record: "8-0", auto: true },
      ... x12
  ]},
];
```

`CFP_ERA_WEEK = 10` is the boundary. It is stated in three places that must
agree: `script.js`, `tools/lib/league.js`, and `tools/cfp.js`.

### One timeline, two sources

`CFP_POLL` blocks are the same shape as `TOP25` blocks, deliberately, and the
two never cover the same week. Everything downstream folds them into a single
week-keyed lookup — `POLL_BLOCKS` in `script.js`, `makePollLookup` in
`week-core.js` — so the `#N` schedule badges, the movement arrows and
regular-season strength of schedule all keep asking "what was the poll in week
N" and get the right answer on either side of the boundary. CFP wins any week
both somehow claim.

Without that fold, weeks 10–15 would have no poll at all and every game in the
back third of the season would score as if played against unranked opponents.

The only user-facing difference is the name: the tab button and section title
retitle themselves to **CFP Top 25**, driven by the block's `kind`, not by
comparing the week to `CFP_ERA_WEEK` — so a league that hasn't uploaded its
week-10 CFP poll yet still correctly calls what it's showing the AP poll.

### The bracket is twelve seeds

Nothing else is transcribed. The 12-team bracket's structure is fixed — seeds
1–4 bye, first round 5v12 / 6v11 / 7v10 / 8v9, feeding 4 / 1 / 3 / 2 — so the
matchups are derived. There is no second copy of the pairings that can fall out
of sync with the seeds, which is the failure mode a hand-drawn bracket has.

`auto` is the in-game asterisk (conference champion, automatic bid) and is
display-only — the game has already applied it to the seed. It renders **only on
the box where a team enters the bracket**, not on every box it reaches
afterwards: how a team qualified is a fact about the first round, and repeating
it would grow exactly as the bracket narrows and the boxes matter more.
`projected` is true from week 10 through the conference championships and false
on the bracket entered after the CCGs.

### The layout is integer arithmetic, not measurement

Every box sits on one shared row grid measured in **half-slots**, so "centred
between the two boxes that feed me" is a whole number of rows rather than a
fraction:

```
first round   game i: rows 4i+1 and 4i+3      (i = 0..3)
quarterfinal  winner  4i+2 (centred on game i), bye 4i+4
semifinal     box     4i+3 (centred on qf group i)
final         rows 5 and 13
champion      row 9
```

Seventeen rows, one rule applied four times. The connector lines fall out of it:
a box that receives draws an elbow in the left gutter (`::before`) whose height
is `2 x --drop`, and because the box is exactly midway between its feeders that
one symmetric shape lands on both. A box that feeds draws a stub to its right
(`::after`). No SVG overlay, nothing measured after layout — a long team name or
a late-loading font can't knock the lines out of true.

The champion gets a fifth column, and only once there is one. An empty fifth
column for most of the season would read as a round nobody has played rather
than a trophy nobody has won.

The bracket tracks `SEASON.currentWeek`, **not** the poll's week. They move
together in practice — the gate wants both — but tying the bracket to the poll
would mean a missing week of transcription silently blanks the playoff panel,
and the bracket is its own record.

### Boxes are painted in the school's colour

`team-colors.js` (repo root, shared by all three leagues) holds one primary hex
per school. It is deliberately **not** the `color` field in `league-data.js`:
that one is an accent, sized for a 3px bar against a dark panel, and several are
brightened away from the school's real shade to stay visible at that size.
Painting a whole box in one gives a box that glows. Where both exist, a filled
surface uses the table and a hairline accent uses the roster colour — which is
why a coached team's box is the school's colour with the coach's accent on its
left edge.

Text colour is **computed** from the fill's WCAG contrast rather than stored, so
a pale primary (Colorado gold, Carolina blue) gets dark ink without anyone
maintaining a second column that can disagree with the first. Logos sit on a
pale chip because ESPN marks are drawn for white backgrounds and half of them
vanish against their own school's primary.

Schools with no entry fall back to the roster accent — which is what the 1-star
dynasty's invented schools use, since they have no real primary.

### Bowl names merge forward

`bowls` on a bracket carries `r1` / `qf` / `sf` (lists), `nc` and `site`
(strings). They are merged across every bracket up to the week being rendered,
**key by key**, not taken from the newest bracket whole: the quarterfinal bowls
are named in week 10 and the semifinal bowls only later, so replacing wholesale
would blank the quarterfinals the week the semifinals arrive.

Each label renders between the two boxes that play the game — at the
destination box's row, one column left, which is that pair's midpoint. Same
one-line rule places all seven.

### It fills in from `postseason-data.js`

The bracket advances a slot by looking for a played game between two known teams
in the `cfp-r1`, `cfp-qf`, `cfp-sf` and `cfp-nc` rounds, in that order. **Those
four ids are load-bearing** — rename one and the bracket quietly stops filling
past that round rather than erroring. A winner advances as its own seed entry, so
seed, record and star travel with it to the title game.

The same renderer draws the week-10 projection and the finished bracket; there
is no separate results mode.

`postseason-data.js` now exists (empty) in all three leagues and is loaded by
each `index.html` — previously the format was documented but no page ever read
it, so `POSTSEASON` was permanently undefined on the site.

### The advance gate follows the game

`top25GateError` requires that week's CFP poll **and** bracket for weeks ≥ 10 in
main, instead of an AP block that by then doesn't exist. Both, because the
bracket is the headline of the tab in the CFP era. Same leniency as the AP side:
a league that has never entered a CFP week isn't behind on it, so the first
advance into the era is waved through.

### Writing it

`tools/cfp.js`, documented in `tools/README.md`. Same guardrails as
`tools/top25.js` plus a poll↔bracket cross-check, and it refuses a week < 10 the
way `top25.js` refuses a week ≥ 10.

---

## 8. The season calendar and the bowl weeks (added 2026-08)

The game plays **four weeks after the conference championships**, one per
playoff round, and calls them Bowl Week 1 through 4. So the week axis runs
**0–19**, not 0–15:

| Weeks | What |
|---|---|
| 0–13 | regular season |
| 14 | Army-Navy |
| 15 | conference championships — `REGULAR_FINAL_WEEK` |
| 16–19 | Bowl Weeks 1–4 → `cfp-r1`, `cfp-qf`, `cfp-sf`, `cfp-nc` |

`REGULAR_FINAL_WEEK` and `FINAL_WEEK` live in `week-core.js` and are re-exported
through `tools/lib/league.js`, so the eight places that used to say `15` now say
one of the two and mean it.

### Schedules still stop at 15

Bowl weeks have no entries in `schedule-data.js` and aren't expected to — a
playoff game is a one-off neutral-site game and belongs in `postseason-data.js`,
in the per-game shape that exists precisely because the per-team week shape is
wrong for it. So anything walking the schedules loops to `REGULAR_FINAL_WEEK`,
and the admin page's **score** picker stops at 15 while its **advance** picker
runs to 19. Sharing one list is what would let someone pick "Bowl Week 2" on a
page that can only write regular-season scores; `worker/admin-api.js` rejects
that combination server-side as well.

### Rounds now have a week, for gating only

`roundWeek(id)` maps `ccg → 15`, the four CFP rounds to 16–19, and anything else
(the non-playoff bowls) to 16. Rounds still carry **no `week` field** — a round
is a round, and numbering it would invite someone to look up "week 17's poll".

What the map buys is `seasonMeetings`. It used to include the postseason
all-or-nothing at `throughWeek >= 15`, which had to call the *whole* postseason
unplayed during championship week — the week the conference championships are
actually played — and then count a national championship as having happened the
moment the regular season ended. Now each round is in or out on its own, so "the
season as it stood in week 17" means through the quarterfinals.

One consequence worth knowing: `computeRankings` caps non-current seasons at
`FINAL_WEEK` rather than 15, because an archived season is finished and taking
it to 15 would drop its playoff out of every career number.

### The poll freezes; the bracket doesn't need re-entering

From Bowl Week 1 the committee stops publishing. The site shows the last CFP
Top 25 — the seeding poll — and tags it `FINAL SEEDING · WEEK 15` rather than a
bare week number, which would read as stale data instead of as the final poll.

`tools/cfp.js` refuses weeks above 15 and says why: there is nothing to
transcribe in a bowl week. Results go in `postseason-data.js`, and the bracket
fills itself in from them.

### The gate for weeks 16–19

Not the poll — it's frozen, so requiring one would block on a screenshot that
will never exist. What's required is a **settled** bracket: at least one entry
with `projected: false`. Advancing into Bowl Week 1 on a projection would
publish a field the games are about to contradict.

Results are deliberately **not** gated. `postseason-data.js` has no writer yet,
so a gate there would be a wall with no door. `bowlWeekWarning()` prints an
advisory instead — "CFP First Round: 3 of 4 results are in postseason-data.js" —
and the advance proceeds.

**Still to do:** a writer for `postseason-data.js`. Until then playoff results
are hand-entered, which is the one remaining hand-edited file in the postseason
path. Worth building before the first playoff, not before.
