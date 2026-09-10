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
| Cal (BlueMiniMeaniee) at UCLA (Dway) | UCLA | Week 1, at UCLA | **Scheduled** — series **Complete** |
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
| Clemson (temptiger) at Washington (texan_hog) | Washington | Leg 2 of the 2027–2028 home-and-home | Pending |
| Georgia (Miles) at Clemson (temptiger) | Clemson | Leg 2 — **reversed from the old plan** because the 2027 leg flipped | Pending |
| TCU (oldarmy) at Notre Dame (brian) | Notre Dame | Leg 2 of the 2027–2028 home-and-home | Pending |
| Notre Dame (brian) at Ohio State (RekenCrew) | Ohio State | Leg 2 of the 2027–2028 home-and-home | Pending |
| Notre Dame (brian) at Oregon (Davey) | Oregon | Leg 2 of the 2027–2028 home-and-home | Pending |
| WVU (diabeticsnail22) at Oklahoma (Pointdexter) | Oklahoma | Leg 2 of the 2027–2028 home-and-home | Pending |
| LSU (chompdaddy) at WVU (diabeticsnail22) | WVU | Leg 2 of the 2027–2028 home-and-home | Pending |
| Oregon (Davey) at WVU (diabeticsnail22) | WVU | **Leg 1**, deferred out of 2027. Return leg 2029 at Oregon. | Pending |

Cal–UCLA is **not** on the 2028 board — that series closed out in 2027.

## 2029 Season

| Matchup | Requested site | Notes | Status |
|---|---|---|---|
| Oregon (Davey) at Clemson (temptiger) | Clemson | Leg 1 of a 2029–2030 home-and-home | Pending |
| Clemson (temptiger) at Ohio State (RekenCrew) | Ohio State | Leg 1 of a 2029–2030 home-and-home | Pending |
| WVU (diabeticsnail22) at Oregon (Davey) | Oregon | Leg 2 of the deferred Oregon–WVU series | Pending |

## 2030 Season

| Matchup | Requested site | Notes | Status |
|---|---|---|---|
| Clemson (temptiger) at Oregon (Davey) | Oregon | Leg 2 of the 2029–2030 home-and-home | Pending |
| Ohio State (RekenCrew) at Clemson (temptiger) | Clemson | Leg 2 of the 2029–2030 home-and-home | Pending |

---

> **Note — heavy loads in 2028:** Notre Dame (brian) carries **three** requested
> non-conference games (TCU, Ohio State, Oregon), Oregon (Davey) **three**
> (Colorado, Notre Dame, WVU), and WVU (diabeticsnail22) **three** (Oklahoma,
> LSU, Oregon). Clemson (temptiger) and TCU (oldarmy) carry two each. Oregon and
> WVU were both over-subscribed in 2027 and needed a leg dropped — expect the
> same squeeze in 2028 and check editable-slot counts before promising anything
> new to either of them.
>
> **Home/away in 2028:** the 2027 flip means Clemson now **hosts** both of his
> requested games in 2028 (Washington, Georgia) after traveling for both in 2027.
> Balanced across the two years.

## Restrictions — do not schedule

| Matchup | Seasons | Reason |
|---|---|---|
| Clemson (temptiger) vs TCU (oldarmy) | 2027, 2028 | Scheduling restrictions. Series was requested and then withdrawn. Not blocked for 2029+. |
| Florida State vs Ohio State (RekenCrew) | 2027+ | FSU doesn't want the matchup. Removed from the 2027 build. |
| Florida State vs Georgia (Miles) | 2027+ | FSU doesn't want the matchup. Removed from the 2027 build. |
| Any same-conference user pair, non-conference | all | See build rule 3. Their meetings come from the locked conference slate only. |

---

## Series detail

### TCU (oldarmy) ↔ Michigan (projekt) — home-and-home
- 2027: at Michigan — **played (week 2)**
- 2028: at TCU

### Colorado (turt17) ↔ Oregon (Davey) — home-and-home
- 2027: at Oregon — **played (week 2)**
- 2028: at Colorado

### Clemson (temptiger) ↔ Washington (texan_hog) — home-and-home
- 2027: at Clemson — **played (week 0)**
- 2028: at Washington

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

### WVU (diabeticsnail22) ↔ Oregon (Davey) — home-and-home — **shifted one year**
- 2027: **deferred** — both teams were over-subscribed on editable slots.
- 2028: at WVU (leg 1)
- 2029: at Oregon (leg 2)

### Clemson (temptiger) ↔ Oregon (Davey) — home-and-home
- 2029: at Clemson
- 2030: at Oregon

### Clemson (temptiger) ↔ Ohio State (RekenCrew) — home-and-home
- 2029: at Ohio State
- 2030: at Clemson

### Cal (BlueMiniMeaniee) ↔ UCLA (Dway) — **COMPLETE**
- 2026: at Cal — played
- 2027: at UCLA — **played (week 1)**
- Series closed. Do not carry into 2028.

---

*Last updated: 2026-09-09 — reconciled against the built 2027 season file.*
