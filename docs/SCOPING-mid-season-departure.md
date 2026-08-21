# Scoping — departures, and the line between history and the current league

Status: **BUILT 2026-07-30.** Both halves shipped — the roster gate in
§3a and `departedAfterWeek` in §3b — and `DiabeticSnail22` is flagged
`departedAfterWeek: 4` in 3-star. Kept as the written record of why
the two-flag design is what it is; §5 has the verification results.
Written 2026-07-30, revised the same day after the 2029 finding in §2.

Trigger case: `DiabeticSnail22` has gone inactive in **3-star** (North
Texas) while staying active in **main** (West Virginia). No one is
expected to take over North Texas.

The long-term case, which is the one that actually shapes the design:
by 2029 this league will have coaches who have come and gone. Games
played between two humans in 2026 must stay in their career histories
forever, whatever either of them does later.

---

## 1. The principle

Two questions that today are answered by one flag, and shouldn't be:

> **Did this game happen between two humans?**
> A fact about the past. Permanent. Nothing that happens later can
> change it.

> **Should this coach have a row in the current power poll?**
> A statement about the league right now. Answered by the current
> roster, not by the game log.

Everything below follows from separating those two. Career history
(`computeH2H`, the coach modal, the annals) reads the first question
and should never consult roster status. The poll reads the second.

---

## 2. Both sides are currently wrong, in opposite directions

**Backward (the snail case).** `active: false` answers question 1 with
question 2's data. Setting it demotes North Texas to CPU *retroactively*,
so `buildWeek` stops emitting the Week 4 meeting and every consumer
agrees it never happened. Measured on real 3-star data:

```
BEFORE                          AFTER active:false
 1 RonRicoFSU   63.50            1 RonRicoFSU   63.50
 2 Snail        62.00            2 Brian52682  -10.50
 3 Brian52682  -10.50            (Texan_hog gone — 0 qualifying games)
 4 Texan_hog   -12.00
```

Texan_hog's 0-1 becomes 0-0 and he falls off the poll, because that
loss was his only H2H game. A played result is erased to solve a
roster problem.

**Forward (the 2029 case).** `computeRankings` answers question 2 with
question 1's data. It builds its coach list from *meetings*, never
from the roster — so a coach who has left entirely still gets a row.
Verified by simulating a 2029 season with snail absent from both the
roster and the schedules, and no flags set anywhere:

```
 1 RonRicoFSU   63.50
 2 DiabeticSnail22 (North Texas)  62.00   <-- ranked on 2026 games
 3 Brian52682  -10.50
 4 Texan_hog   -12.00
```

The rolling window is "the last N games regardless of season." A coach
who stops playing keeps the same N games forever, so this never ages
out on its own. In 2029 the 3-star poll would be part current league,
part ghosts.

Note the comment at `week-core.js:637` — *"A coach who has left the
league entirely isn't in the current roster, so they keep their last
known identity, which is the correct answer for them."* The identity
handling is right. It just never occurred to that code that such a
coach shouldn't be in the list at all.

---

## 3. The fix

### 3a. Gate the poll on the current roster

In `computeRankings`, at `ranked.push` (~line 650-690) — not at ingest.
A coach gets a row only if they appear in the **last** season's roster
with `active !== false`. The aggregation loop must still run for
everyone, because a departed coach's games are the same objects that
feed his opponents' logs; only the row is dropped at the end. Ranks
renumber automatically.

This one change solves the 2029 case completely and for free: a coach
who isn't in the 2029 roster file simply has no row, no flag required.
It also does half the snail case.

Verified: Texan_hog's score is unchanged at `-12.00` under this
approach — `oppRank` comes from `TOP25` by team name and never consults
the roster — so he keeps his loss and lands at #3.

`computeH2H` gets **no** such gate. Career histories are question 1,
and they should keep every meeting forever. That asymmetry is the
whole design and is worth a comment in the code saying so.

### 3b. `departedAfterWeek: N` for the mid-season case

Only needed when someone leaves *partway through a season they have
already played games in* — snail today. A coach who leaves between
seasons is just absent from the next roster and needs nothing.

```js
// 3star/league-data.js
{ name: "DiabeticSnail22", team: "North Texas", ...,
  departedAfterWeek: 4 },   // played through wk4; CPU from wk5 on
```

- weeks `<= N` — North Texas is a league team, exactly as now
- weeks `> N` — CPU opponent, own schedule block skipped, off the
  roster grid and the By Team dropdown
- the poll — no row, via the 3a gate (`departedAfterWeek` counts as
  "not in the current roster" for that purpose)

**The flag is per-season and self-limiting.** It lives in the roster
file for the season the departure happened in, gets frozen into
`seasons/2026/` at rollover, and is simply not carried into 2027.
It never accumulates.

### 3c. Touch list

1. **`week-core.js` `makeResolver`** (~60-121) — `inactiveKeys` becomes
   a `Map` of team key → cutoff week (`-1` for plain `active: false`,
   so "every week is after the cutoff" falls out of the same
   comparison). `isLeagueTeam` / `isInactiveTeam` take a `week`.
   Load-bearing; everything else follows.
   - Also called by `computeH2H`, `buildPostseason`, `latestH2HWeek`.
     The postseason has no week number — treat the cutoff as passed
     (`week = Infinity`), since a departed coach can't be in it.
   - A `departedAfterWeek` coach must stay in `rosterKeys`, or
     `entryFor`/`coachFor` return nothing and the Week 4 game renders
     with an empty coach name — the exact failure mode in
     `coach-modal-spec.md` §10.
2. **`week-core.js` `buildWeek`** (~137-145) — the
   `if (R.isInactiveTeam(t.team)) return;` skip becomes week-aware.
3. **`week-core.js` `computeRankings`** — the 3a roster gate.
4. **`script.js:59-71`** — `ROSTER` and `SCHEDULES` are filtered once,
   globally, with no week in scope. `SCHEDULES` must stop dropping
   North Texas wholesale. `ROSTER` should still drop snail from the
   roster grid, live-stream row and dropdown — but `coachFor` /
   `isLeagueTeam` (110-125) read `ROSTER`, so past schedule rows lose
   snail's name and colour unless they read a third handle that
   includes departed coaches. **This is the least obvious part and
   probably where the time goes.**
5. **`tools/nudge.js`** — shouldn't chase a departed coach for unplayed
   games. Builds on `buildWeek`, so likely inherits the fix; needs a
   check, not a change.
6. **CLI + admin** — `tools/lib/league.js:135` and `admin/admin.js:147`
   already pass raw unfiltered `COACHES` and let `week-core.js` apply
   its own rules. Should need no change.

You said you're less worried about whether schedules render the game
as a league game. If that holds, **3a alone is most of the value** and
is a much smaller change than 3c items 1-2-4. A staged build is
viable: ship the roster gate first, live with North Texas showing as a
league team in weeks 5-15, add the week-aware resolver later.

### 3d. Not in scope

- Cross-league anything. 3-star and main have separate rosters and
  separate polls; the main West Virginia entry is untouched.
- Surfacing departure on the site — a "departed wk4" chip on old
  schedule rows, a greyed roster card. Its own small piece of work.
- Whether a departed coach should appear in *archived* season polls
  when those get rendered. The 3a gate reads the last season in the
  career, so a 2026 archive page would gate on the 2026 roster and
  show snail correctly. Worth a verification pass, not a design change.

---

## 4. Recommendation

Build 3a regardless — it's the smaller change, it fixes the 2029
problem before there are ghosts to clean up, and it's the half of the
snail case you care most about. `departedAfterWeek` can follow.

Don't ship plain `active: false` on 3-star. It's the one option that
erases a played result, which is precisely the thing that has to
survive into the annals.

---

## 5. What was built, and how it was checked

Both halves went in together. `makeResolver` now collapses both flags
to one number — the last week a team counts as a league team, `-1` for
`active: false` and `Infinity` for everyone else — so every question is
a single comparison and the old flag needed no special case.
`isLeagueTeam`/`isInactiveTeam` take an optional week, defaulting to
"now". `entryFor` resolves departed coaches (names and colours survive
on played rows) but still not `active: false` ones. `script.js` grew a
third handle, `ROSTER_HISTORY`.

Verification, all against real league data:

**Nothing else moved.** Snapshotted every `buildWeek` output for weeks
0-15 (league matchups with scores and resolved coach names, CPU games,
notes, missing), plus `latestH2HWeek` and full `computeRankings` to 6
decimal places, for all three leagues, before and after. **main and
1-star are byte-identical.** 3-star differs in exactly the intended
places: weeks 0-4 untouched, North Texas gone from weeks 5-15, and the
Week 8 JMU fixture moved from `league` to `cpu`.

**The poll.** 3-star went from four rows to three — RonRicoFSU,
Brian52682, Texan_hog — with Texan_hog holding rank #3, `0-1`, and
`-12.00`, the same score he had before.

**The annals.** `computeH2H` still returns the Texan_hog vs
DiabeticSnail22 meeting, 0-1 over 1 game.

**The 2029 ghost.** Re-ran the simulation from §2: a coach absent from
the later roster now holds no row, while the opponent he beat in 2026
is still ranked on that game.

**The pages.** Loaded all three leagues in jsdom through their real
`index.html` script order — no errors, polls render as above. In
3-star: no roster card, no By Team entry, `isLeagueTeam('North Texas', 4)`
true and `(…, 5)` false, NDSU's Week 4 row still reads
`AT North Texas · League · DiabeticSnail22 · L 48-56`, and JMU's Week 8
row now reads as a plain CPU game.

**The tools.** `h2h.js --check` passes all checks including "agrees
with computeRankings on this season's records"; `nudge.js` runs clean
and no longer has anyone to chase at North Texas.

Two harness notes for whoever writes the next test: `const` declared
inside `eval()` is scoped to that eval, so the data files and the
assertions have to be evaluated as one string; and `people.js` has to
be in the bundle or `script.js` dies on `personKey`.

---

## 6. Handovers — the case both flags together

**2026, main, Alabama.** Woogity left after Week 4
(`departedAfterWeek: 4`). Trick whitey took the school over in Week 11
(`joinedAtWeek: 11`). Both entries name the same team, which is a case
neither flag was written for and which the resolvers got wrong in two
different ways.

**What was broken.**

- `week-core.js` merged the two coaches into ONE widened interval —
  `teamCutoff` took the later cutoff and `teamArrival` the earlier
  arrival, on the reasoning that "a handover should leave no dead week
  in the middle". Here the dead week is real: nobody held Alabama in
  Weeks 5-10. The merge would have turned Miles's Week 6 CPU win over
  an unmanned Alabama into a head-to-head result against a coach who
  had already quit.
- `entryFor` returned the FIRST roster entry matching the team, with
  no week in scope, so every one of Trick whitey's games would have
  rendered under Woogity's name.
- `script.js` was worse in both directions. `ARRIVED_TEAM_FROM`
  collected only coaches carrying `joinedAtWeek`, so Alabama's arrival
  read as Week 11 flat and Woogity's Weeks 0-4 stopped being league
  games. And `SCHEDULES` dropped any team key present in
  `DEPARTED_TEAM_UNTIL`, so Alabama's schedule block stayed off the
  site even though somebody was playing it again.

**What replaced it.** One `TEAM_WINDOWS` map in each file: team key ->
a LIST of `[from, until]` windows, one per coach who has held the team,
never merged. A week counts if it falls inside any window; windows that
abut still leave no dead week, which was the whole point of the old
merging rule, minus the invented middle. `entryFor` / `coachFor` /
`rosterEntryFor` / `colorFor` take an optional week and use it only to
pick between two entries on the same team — a lookup with one match
short-circuits, so nothing that isn't a handover changes shape. A week
in a gap between holders falls back to the first entry, so a played row
never loses its coach chip; `isLeagueTeam` is what decides whether the
name is shown at all. `script.js` now keeps a schedule block when
anyone holds the team TODAY, which drops departed and `active: false`
blocks exactly as before and keeps a handed-over one.

`ROSTER_KEYS` in `script.js` is gone. It short-circuited `isLeagueTeam`
to `true` on roster membership before the window was consulted, which
is precisely the bug for a team with two holders.

**Verification.** Snapshotted `buildWeek` for Weeks 0-15 (league
matchups with scores and resolved coach names, CPU games, notes,
missing), plus `computeRankings` to 6 decimal places and every
`computeH2H` pair, for all three leagues. The resolver refactor alone,
before the roster edit, is **byte-identical across all three**. A
second harness ran the real `script.js` in a VM and dumped
`isLeagueTeam` / `coachFor` for every team in every week: identical
except Alabama.

After the roster edit, main differs in exactly five lines — Alabama's
Weeks 11, 12, 13 CPU fixtures and its Weeks 14, 15 notes, all under
Trick whitey. Weeks 0-4 still read Woogity. Weeks 5-10 still read as no
team at all, and Miles's Week 6 win is still a CPU win. 3-star and
1-star are unchanged. `nudge.js` now chases Trick whitey for Alabama's
Week 11 game; `h2h.js` still shows Woogity 0-2 with Alabama (2026).

**Also done in the same pass.** Alabama's own Week 6 row was blank
while Georgia's recorded the same game 31-10, an artifact of the school
sitting unmanned. Backfilled as `teamScore: 10, opponentScore: 31` so
the By Team page agrees with itself. Weeks 5, 7, 8 and 10 stay blank —
those opponents are CPU and no score exists anywhere to copy.
