# User-Requested Games — Future Season Schedules

Running log of games league members have asked to have built into future
schedules. Consult this file whenever building a new season's schedule.

Status key: **Pending** = not yet placed on a schedule · **Scheduled** = built
into the season file · **Deferred** = requested, couldn't fit, pushed to a later
season · **Dropped** = withdrawn/superseded · **Complete** = series finished.

**Standing rule:** requested matchups are home-and-home series across two
consecutive seasons unless Josh says otherwise. If only one season's host is
given, the return leg the following season goes to the other team.

---

## Build rules (applied from 2027 onward)

These were settled while building the 2027 slate. They constrain every future
season, not just that one.

1. **Twelve games exactly** for every coached team, weeks 0–13. Two byes.
2. **No FCS opponents** on any user's schedule.
3. **Users in the same conference cannot schedule a non-conference head-to-head.**
   Their meetings have to come from the locked conference slate. This is the rule
   that kills most otherwise-attractive user matchups — check it first.
4. **Locked (greyed-out) games can't move.** Conference games and fixed rivalry
   games are fixed; open weeks and non-greyed games are the only editable slots.
   **An `OPEN` week is always schedulable, even when it shows a padlock.** The
   padlock on an `OPEN` row only means the team is at its 12-game capacity — to
   use that week, drop one of the team's non-greyed games. So a team's usable
   weeks are its `OPEN` weeks plus its non-greyed games, and the number of new
   games it can take is its count of non-greyed games. The one exception is
   **week 14 (Army-Navy Week)** — never schedule over it.
5. **Every user gets at least three head-to-head games.** Users short of that get
   paired with opponents of similar strength, matched on the site's computed
   **power ranking score** (not raw H2H win-loss record).
6. **Prefer 6–7 home games** per team; 6 is acceptable. Avoid long homestands.
7. **Neutral-site traditions stay neutral:** SMU–South Carolina at Mercedes-Benz
   Stadium, Red River (Texas–Oklahoma) at the Cotton Bowl, Florida–Georgia at
   Raymond James Stadium.
8. Non-requested open weeks get **historically accurate** opponents — real,
   plausible series for that program.
9. Week 14 is **Army-Navy Week** and week 15 is the **conference championship**
   for every team; both are marked as note rows in the season file. Notre Dame's
   week 15 reads "No conference championship (Independent)".

---

## 2027 Season — BUILT

Written to `main/schedule-data.js` on 2026-09-09. All 21 coached teams, 252 game
rows, byes and week 14/15 notes included. Member preview page lives at
`main/2027-preview.html` (temporary — remove from the repo once the season starts).

| Matchup | Requested site | Built as | Status |
|---|---|---|---|
| TCU (oldarmy) at Michigan (projekt) | Michigan | Week 2, at Michigan | **Scheduled** |
| Colorado (turt17) at Oregon (Davey) | Oregon | Week 2, at Oregon | **Scheduled** |
| Washington (texan_hog) at Clemson (temptiger) | Clemson | Week 0, at Clemson | **Scheduled** |
| Georgia (Miles) at Clemson (temptiger) | Clemson | Week 3, **at Georgia — legs flipped** | **Scheduled** |
| Notre Dame (brian) at TCU (oldarmy) | TCU | Week 3, at TCU | **Scheduled** |
| Ohio State (RekenCrew) at Notre Dame (brian) | Notre Dame | Week 2, at Notre Dame | **Scheduled** |
| Oregon (Davey) at Notre Dame (brian) | Notre Dame | Week 5, at Notre Dame | **Scheduled** |
| Oklahoma (Pointdexter) at WVU (diabeticsnail22) | WVU | Week 1, at WVU | **Scheduled** |
| WVU (diabeticsnail22) at LSU (chompdaddy) | LSU | Week 2, at LSU | **Scheduled** |
| Cal (BlueMiniMeaniee) at UCLA (Dway) | UCLA | Week 1, at UCLA | **Scheduled** — leg 2 of the 2026–27 series |
| Oregon (Davey) at WVU (diabeticsnail22) | WVU | — not placed — | **Deferred to 2028** |

### Why the Clemson–Georgia legs flipped

Clemson's editable weeks left him hosting a seven-game homestand, and Georgia
came out at six home games. Flipping the series fixed both: Clemson's home run
dropped from seven straight to three, and Georgia got to seven. **2027 is at
Georgia; the 2028 return leg is at Clemson.** This was the option the old
version of this file had already flagged as the fix.

### Why Oregon–WVU was deferred

Oregon had three requested games (Colorado, Notre Dame, WVU) against only two
editable slots — ten of his twelve games were locked conference games. WVU also
carried three requests. Dropping the Oregon–WVU leg relieved both teams at once.
Josh approved. **The series restarts in 2028 at WVU, with the return in 2029 at
Oregon.**

### Additional head-to-head games added in 2027

Not requested — added to get every user to three-plus H2H games and to fill open
weeks. Listed so 2028 can vary opponents rather than repeat these.

| Week | Game |
|---|---|
| 2 | Oklahoma at SMU |
| 4 | Notre Dame at Washington |
| 4 | Oregon at Michigan |
| 6 | SMU at California |
| 7 | Ohio State at Oregon |
| 7 | Oklahoma at Georgia |
| 8 | Florida at Oklahoma |
| 8 | SMU at Colorado |
| 9 | West Virginia at Colorado |
| 10 | SMU at Miami |
| 12 | TCU at Colorado |

Everything else on the 2027 H2H board is a locked conference or fixed rivalry
game (Texas–Michigan, the ACC slate, the SEC slate, Ohio State–Michigan, etc.).

### Coach-specific requests honored in 2027

- **Florida State (undefined):** wanted ranked CPU opponents where the open weeks
  allowed. Filled against the preseason top 25 Josh supplied.
- **South Carolina (Bl00dVayN3):** asked for App State week 0 before SMU, then
  changed it to **North Carolina week 0** as a rivalry game. UNC is what shipped.
- **Ohio State (RekenCrew):** Alabama week 1 restored (a real scheduled series)
  in place of Bowling Green.
- **West Virginia (diabeticsnail22):** Marshall at home week 7 as a rivalry game,
  replacing Ohio.
- **Colorado (turt17):** Colorado State week 1 instead of Central Michigan.
- **Texas (Big_Ry):** Texas Tech week 11; New Mexico State moved off to a bye.
- **Oklahoma (Pointdexter):** Nebraska and Oklahoma State penciled in over UTEP
  and San Diego State; week 10 is a bye.
- **TCU (oldarmy):** Arkansas week 4 (Stanford wasn't available that week).
- **Wake Forest (brewma):** Tulane removed, Kentucky added week 8.
- **Notre Dame (brian):** Boston College wasn't available week 11 — Army at
  Michie Stadium week 12 instead.
- **Florida (Alex):** USF wasn't available — North Carolina instead.
- **SMU / Colorado:** Colorado home vs SMU week 8; Western Kentucky dropped from
  SMU and Northern Illinois from Colorado.

---

## 2028 Season

| Matchup | Requested site | Notes | Status |
|---|---|---|---|
| Michigan (projekt) at TCU (oldarmy) | TCU | Leg 2 of the 2027–2028 home-and-home | Pending |
| Oregon (Davey) at Colorado (turt17) | Colorado | Leg 2 of the 2027–2028 home-and-home | Pending |
| Clemson (temptiger) at TCU (oldarmy) | TCU | **Replaces the Clemson–Washington return leg.** One-off, not a home-and-home — the 2027 leg was blocked. | Pending |
| Georgia (Miles) at Clemson (temptiger) | Clemson | Leg 2 — **reversed from the old plan** because the 2027 leg flipped | Pending |
| TCU (oldarmy) at Notre Dame (brian) | Notre Dame | Leg 2 of the 2027–2028 home-and-home | Pending |
| Notre Dame (brian) at Ohio State (RekenCrew) | Ohio State | Leg 2 of the 2027–2028 home-and-home | Pending |
| Notre Dame (brian) at Oregon (Davey) | Oregon | Leg 2 of the 2027–2028 home-and-home | Pending |
| WVU (diabeticsnail22) at Oklahoma (Pointdexter) | Oklahoma | Leg 2 of the 2027–2028 home-and-home | Pending |
| LSU (chompdaddy) at WVU (diabeticsnail22) | WVU | Leg 2 of the 2027–2028 home-and-home | Pending |
| Cal (BlueMiniMeaniee) at WVU (diabeticsnail22) | WVU | Leg 1 of a 2028–2029 home-and-home | Pending |
| UCLA (Dway) at Cal (BlueMiniMeaniee) | Cal | **Leg 1 of a new 2028–2029 home-and-home.** Alternates from 2027, which was at UCLA. | Pending |
| Ohio State (RekenCrew) at LSU (chompdaddy) | LSU | Leg 1 of a 2028–2029 home-and-home | Pending |
| Clemson (temptiger) at Ohio State (RekenCrew) | Ohio State | Leg 1 — **moved up from 2029** on 2026-10-28. Replaces the in-game default Clemson at Notre Dame (100.7 vs 59.7 power score); Ohio State drops at Alabama to fit it. | Pending |
| USC (Bl00dVayN3) at Arkansas (texan_hog) | Arkansas | Leg 1 of a 2028–2029 home-and-home. Added 2026-10-28 to work texan_hog's return and Bl00dVayN3's first full USC season in. | Pending |

The 2026–2027 Cal–UCLA home-and-home closed out in 2027; a **new** Cal–UCLA
series runs 2028–2029, continuing the alternation (2027 at UCLA → 2028 at Cal).

## 2029 Season

> **Home/away priority for 2029 (Josh, 2026-10-28):** these coaches were 6H/6A
> in both 2027 and 2028 — give them **7 home / 5 away** in 2029 where the slots
> allow: **Clemson (temptiger), Colorado (turt17), Michigan (projekt), Oregon
> (Davey)**. Check their 2029 requested legs first: Clemson is already at home
> for Ohio State, and Oregon–WVU is at WVU, so both need home CPU games in
> their open slots to get there.

| Matchup | Requested site | Notes | Status |
|---|---|---|---|
| Oregon (Davey) at Clemson (temptiger) | Clemson | Leg 1 of a 2029–2030 home-and-home | Pending |
| Ohio State (RekenCrew) at Clemson (temptiger) | Clemson | Leg 2 — series **moved up a year** on 2026-10-28 (was 2029 at OSU / 2030 at Clemson) | Pending |
| Oregon (Davey) at WVU (diabeticsnail22) | WVU | **Leg 1** — deferred twice (out of 2027, then out of 2028). Return leg 2030 at Oregon. | Pending |
| WVU (diabeticsnail22) at Cal (BlueMiniMeaniee) | Cal | Leg 2 of the 2028–2029 home-and-home | Pending |
| Cal (BlueMiniMeaniee) at UCLA (Dway) | UCLA | Leg 2 of the 2028–2029 home-and-home | Pending |
| LSU (chompdaddy) at Ohio State (RekenCrew) | Ohio State | Leg 2 of the 2028–2029 home-and-home | Pending |
| Arkansas (texan_hog) at USC (Bl00dVayN3) | USC | Leg 2 of the 2028–2029 home-and-home | Pending |

## 2030 Season

| Matchup | Requested site | Notes | Status |
|---|---|---|---|
| Clemson (temptiger) at Oregon (Davey) | Oregon | Leg 2 of the 2029–2030 home-and-home | Pending |
| WVU (diabeticsnail22) at Oregon (Davey) | Oregon | Leg 2 of the twice-deferred Oregon–WVU series | Pending |

---

> **Note — heavy loads in 2028:** Notre Dame (brian) carries **three** requested
> non-conference games (TCU, Ohio State, Oregon), TCU (oldarmy) **three**
> (Michigan, Notre Dame, Clemson), WVU (diabeticsnail22) **three** (Oklahoma,
> LSU, Cal), and LSU (chompdaddy) **two** (WVU, Ohio State) after LSU–Texas was
> withdrawn. Oregon
> (Davey) is down to **two** (Colorado, Notre Dame) after the WVU deferral.
> Clemson (temptiger) carries two. Check editable-slot counts before promising
> anything new to Oregon or WVU — both have already lost a leg once.
>
> **Oregon–WVU has now slipped twice** (2027 → 2028 → 2029). If it slips a third
> time, consider dropping it rather than deferring again.
>
> **Home/away in 2028:** Clemson hosts Georgia and travels to TCU — 1H/1A.
> Washington is left with **no requested game in 2028** after his return leg was
> dropped. LSU (chompdaddy) carries **two** (WVU, Ohio State) — 1H/1A in 2028,
> 1H in 2029. Ohio State is **1H/1A in 2029** (LSU home, at Clemson) now that
> the Clemson series moved up a year — this fixed the old 2H/0A problem.

## Restrictions — do not schedule

| Matchup | Seasons | Reason |
|---|---|---|
| Clemson (temptiger) vs TCU (oldarmy) | 2027 only | Scheduling restrictions blocked the 2027 leg. **Lifted for 2028** — the game is now on the 2028 board at TCU. |
| Florida State vs Ohio State (RekenCrew) | 2027+ | FSU doesn't want the matchup. Removed from the 2027 build. |
| Florida State vs Georgia (Miles) | 2027+ | FSU doesn't want the matchup. Removed from the 2027 build. |
| Any same-conference user pair, non-conference | all | See build rule 3. Their meetings come from the locked conference slate only. |
| LSU (chompdaddy) vs Texas (Big_Ry), non-conference | 2028+ | Both SEC — the requested 2028–2029 home-and-home broke build rule 3 and was withdrawn 2026-10-28. |

---

## Series detail

### TCU (oldarmy) ↔ Michigan (projekt) — home-and-home
- 2027: at Michigan — **played (week 2)**
- 2028: at TCU

### Colorado (turt17) ↔ Oregon (Davey) — home-and-home
- 2027: at Oregon — **played (week 2)**
- 2028: at Colorado

### Clemson (temptiger) ↔ Washington (texan_hog) — **series cut short**
- 2027: at Clemson — **played (week 0)**
- 2028: return leg at Washington was **dropped**, replaced by Clemson at TCU.
  Washington never gets his home game — raise with texan_hog, or reschedule the
  return in 2029+.

### Clemson (temptiger) at TCU (oldarmy) — single game, 2028
- 2028: at TCU
- Not a home-and-home: the 2027 leg was blocked by scheduling restrictions and
  was never played. No return leg assigned.

### Clemson (temptiger) ↔ Georgia (Miles) — home-and-home — **legs flipped**
- 2027: at Georgia — **played (week 3)**
- 2028: at Clemson
- Flipped from the original request to break up a Clemson homestand and get
  Georgia to seven home games.

### TCU (oldarmy) ↔ Notre Dame (brian) — home-and-home
- 2027: at TCU — **played (week 3)**
- 2028: at Notre Dame

### Notre Dame (brian) ↔ Ohio State (RekenCrew) — home-and-home
- 2027: at Notre Dame — **played (week 2)**
- 2028: at Ohio State

### Notre Dame (brian) ↔ Oregon (Davey) — home-and-home
- 2027: at Notre Dame — **played (week 5)**
- 2028: at Oregon

### WVU (diabeticsnail22) ↔ Oklahoma (Pointdexter) — home-and-home
- 2027: at WVU — **played (week 1)**
- 2028: at Oklahoma

### WVU (diabeticsnail22) ↔ LSU (chompdaddy) — home-and-home
- 2027: at LSU — **played (week 2)**. chompdaddy joined the league in the 2027
  preseason and now has a full entry in `main/schedule-data.js`.
- 2028: at WVU

### WVU (diabeticsnail22) ↔ Oregon (Davey) — home-and-home — **shifted twice**
- 2027: **deferred** — both teams were over-subscribed on editable slots.
- 2028: **deferred again** — WVU's 2028 slots went to LSU, Oklahoma and Cal.
- 2029: at WVU (leg 1)
- 2030: at Oregon (leg 2)

### Cal (BlueMiniMeaniee) ↔ WVU (diabeticsnail22) — home-and-home
- 2028: at WVU
- 2029: at Cal

### Clemson (temptiger) ↔ Oregon (Davey) — home-and-home
- 2029: at Clemson
- 2030: at Oregon

### Clemson (temptiger) ↔ Ohio State (RekenCrew) — home-and-home — **moved up a year**
- 2028: at Ohio State
- 2029: at Clemson
- Originally 2029 at OSU / 2030 at Clemson. Pulled forward on 2026-10-28 to give
  Clemson a power-matched 2028 opponent in place of Notre Dame; 2030 is freed.

### LSU (chompdaddy) ↔ Ohio State (RekenCrew) — home-and-home
- 2028: at LSU
- 2029: at Ohio State

### USC (Bl00dVayN3) ↔ Arkansas (texan_hog) — home-and-home
- 2028: at Arkansas
- 2029: at USC

### Cal (BlueMiniMeaniee) ↔ UCLA (Dway) — ongoing, alternating
- 2026: at Cal — played
- 2027: at UCLA — **played (week 1)**
- 2028: at Cal (new series, leg 1)
- 2029: at UCLA (leg 2)
- Sites keep alternating year to year across both series.

---

*Last updated: 2026-10-27 — Clemson's 2028 return at Washington replaced by
Clemson at TCU; Cal–UCLA renewed as a 2028–2029 home-and-home; LSU–Ohio State
and LSU–Texas added for 2028–2029; Cal–WVU added for 2028–2029; Oregon–WVU
deferred again to 2029–2030.*
