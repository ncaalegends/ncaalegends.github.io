/* ============================================================
   CFP — the College Football Playoff era of the season
   ------------------------------------------------------------
   From Week 10 the in-game poll stops being the AP Top 25 and
   becomes the CFP Top 25, and the game starts showing a projected
   12-team bracket alongside it. Both are transcribed here, one
   entry per week, and both are frozen history for the same reason
   top25-data.js is: the site renders what was true THAT week, so
   editing a past week silently rewrites the record.

   WHERE THE SEASON SWITCHES OVER
   Weeks 0-9    AP poll        -> top25-data.js
   Weeks 10-14  CFP Top 25     -> CFP_POLL below
                + projected bracket -> CFP_BRACKET below
   Week 15      Conference championships. BRACKET ONLY — this is where
                the projection becomes the real field. No poll block:
                week 14 is Army-Navy, the rankings don't move off that
                game, so week 15's poll IS week 14's and the site reads
                it through the at-or-before fallback in script.js
                rather than storing a duplicate. The advance gate
                knows, and won't ask you for one.
   Weeks 16-19  Bowl Weeks 1-4, one per playoff round. NOTHING is
                transcribed here: the poll froze at week 14 and the
                bracket is already final. Only results change, and they
                go in postseason-data.js — the bracket fills itself in
                from them.

   If the rankings ever DO move at week 15, add a { week: 15 } block
   the normal way: the site prefers a real block over the fallback
   automatically, and nothing here needs changing to allow it.

   That boundary lives in ONE place in the code (CFP_ERA_WEEK in
   script.js). Nothing here needs to change if the game ever moves
   it.

   ------------------------------------------------------------
   CFP_POLL — the weekly CFP Top 25
   ------------------------------------------------------------
     const CFP_POLL = [
       { week: 10, teams: [ { rank, team, record }, ... x25 ] },
       { week: 11, teams: [ ... ] },
     ];

   Exactly the shape of a TOP25 block, deliberately — the same
   renderer draws it and the same "#N" schedule badges read it, so a
   week-11 game shows a team's week-11 CFP rank. week-core.js also
   reads CFP_POLL for postseason strength-of-schedule, and takes the
   LAST entry as the poll the bracket was seeded from.

   The single-object form (`{ teams: [...] }`, no week) is also
   accepted by week-core for a season where only the final seeding
   poll was ever captured. The array form is what this file uses.

   ------------------------------------------------------------
   CFP_BRACKET — the projected 12-team field
   ------------------------------------------------------------
     const CFP_BRACKET = [
       {
         week: 10,
         projected: true,
         seeds: [
           { seed: 1,  team: "Ohio State", record: "8-0", auto: true },
           ...
           { seed: 12, team: "USF",        record: "8-0", auto: true },
         ],
         // optional — see BOWL NAMES below:
         bowls: { qf: ["Cotton Bowl", "Rose Bowl", "Fiesta Bowl", "Peach Bowl"],
                  sf: ["Orange Bowl", "Sugar Bowl"],
                  nc: "National Championship",
                  site: "Las Vegas, NV" },
       },
     ];

   TWELVE SEEDS AND NOTHING ELSE. The matchups are NOT transcribed,
   because the 12-team bracket's structure is fixed: seeds 1-4 get a
   first-round bye, and the first round is 5v12, 6v11, 7v10, 8v9,
   feeding 4, 3, 2 and 1 respectively. Deriving the lines from the
   seed list means the site cannot draw a bracket that disagrees with
   itself — there is no second copy of the pairings to fall out of
   sync. Read the seeds off the screenshot; the shape is arithmetic.

   `auto: true` is the asterisk in-game — a conference champion
   holding an automatic bid. It is display-only; it does not move a
   team's seed, because the game has already done that.

   `projected: true` means the field is a forecast, which it is every
   week from 10 through the conference championships. Set it false
   (tools/cfp.js --final) on the bracket entered after the CCGs, when
   the field is settled and the games are actually being played.

   BOWL NAMES are entered ONCE and merge forward key by key. `qf` is
   four names top to bottom; `sf` is two; `r1` is four if the game
   names the first-round sites; `nc` is the title game; `site` is
   where it's played.

   Merging matters because the assignments arrive at different times:
   the quarterfinal bowls are named on the week-10 bracket, the
   semifinal bowls only later. Taking the newest bracket's `bowls`
   whole would mean the week the semifinals appear is the week the
   quarterfinals go blank. So each name is entered on the first
   bracket that knows it and stays from then on — a fact about the
   season, not about the week.

   All of it is optional; the site renders the rounds generically
   without any of it.

   ------------------------------------------------------------
   HOW TO ADD A WEEK
   ------------------------------------------------------------
   Screenshot the in-game CFP Top 25 and the projected bracket, then:

     node tools/cfp.js --league main --week 10 \
       --poll poll.txt --bracket bracket.txt

   Do not hand-edit this file. The script counts to 25, counts to 12,
   catches a doubled rank or seed, checks every team name against the
   league's data, and refuses to overwrite a week that is already
   public history. See tools/README.md.

   WHEN IT APPEARS ON THE SITE
   Same reveal rule as the AP poll: the site shows the CFP week that
   SEASON.currentWeek has actually reached. A week entered ahead of
   the advance sits here invisible until the season catches up, and
   the main dynasty's advance to week 10+ is gated on this file
   having that week.
   ============================================================ */
const CFP_POLL = [
  {
    week: 10,
    teams: [
      { rank: 1, team: "Ole Miss", record: "8-0" },
      { rank: 2, team: "Georgia", record: "8-1" },
      { rank: 3, team: "Oregon", record: "7-1" },
      { rank: 4, team: "Tennessee", record: "8-1" },
      { rank: 5, team: "Wisconsin", record: "8-0" },
      { rank: 6, team: "Texas A&M", record: "7-2" },
      { rank: 7, team: "Miami", record: "8-1" },
      { rank: 8, team: "Ohio State", record: "6-2" },
      { rank: 9, team: "South Carolina", record: "7-1" },
      { rank: 10, team: "Notre Dame", record: "5-3" },
      { rank: 11, team: "Michigan", record: "6-2" },
      { rank: 12, team: "Texas Tech", record: "6-2" },
      { rank: 13, team: "California", record: "8-1" },
      { rank: 14, team: "Maryland", record: "8-0" },
      { rank: 15, team: "Mississippi St", record: "8-0" },
      { rank: 16, team: "Michigan State", record: "7-1" },
      { rank: 17, team: "USC", record: "6-2" },
      { rank: 18, team: "LSU", record: "6-3" },
      { rank: 19, team: "BYU", record: "6-2" },
      { rank: 20, team: "Pittsburgh", record: "8-1" },
      { rank: 21, team: "Texas", record: "5-3" },
      { rank: 22, team: "UCF", record: "7-1" },
      { rank: 23, team: "Kentucky", record: "6-2" },
      { rank: 24, team: "Vanderbilt", record: "7-1" },
      { rank: 25, team: "Arizona", record: "6-2" },
    ],
  },
  {
    week: 11,
    teams: [
      { rank: 1, team: "Georgia", record: "9-1" },
      { rank: 2, team: "Wisconsin", record: "9-0" },
      { rank: 3, team: "Ohio State", record: "7-2" },
      { rank: 4, team: "Ole Miss", record: "8-1" },
      { rank: 5, team: "Miami", record: "8-1" },
      { rank: 6, team: "Texas A&M", record: "7-2" },
      { rank: 7, team: "Oregon", record: "7-2" },
      { rank: 8, team: "South Carolina", record: "8-1" },
      { rank: 9, team: "Maryland", record: "9-0" },
      { rank: 10, team: "Michigan", record: "7-2" },
      { rank: 11, team: "California", record: "8-1" },
      { rank: 12, team: "Texas Tech", record: "7-2" },
      { rank: 13, team: "Mississippi St", record: "9-0" },
      { rank: 14, team: "USC", record: "7-2" },
      { rank: 15, team: "Tennessee", record: "8-2" },
      { rank: 16, team: "BYU", record: "7-2" },
      { rank: 17, team: "LSU", record: "7-3" },
      { rank: 18, team: "Pittsburgh", record: "8-1" },
      { rank: 19, team: "UCF", record: "8-1" },
      { rank: 20, team: "Texas", record: "6-3" },
      { rank: 21, team: "Arizona", record: "7-2" },
      { rank: 22, team: "Michigan State", record: "7-2" },
      { rank: 23, team: "Colorado", record: "7-2" },
      { rank: 24, team: "Oklahoma", record: "6-3" },
      { rank: 25, team: "Penn State", record: "6-3" },
    ],
  },
  {
    week: 12,
    teams: [
      { rank: 1, team: "Georgia", record: "9-1" },
      { rank: 2, team: "Ohio State", record: "8-2" },
      { rank: 3, team: "Oregon", record: "8-2" },
      { rank: 4, team: "Maryland", record: "10-0" },
      { rank: 5, team: "Wisconsin", record: "9-1" },
      { rank: 6, team: "California", record: "9-1" },
      { rank: 7, team: "South Carolina", record: "9-1" },
      { rank: 8, team: "Texas Tech", record: "8-2" },
      { rank: 9, team: "USC", record: "8-2" },
      { rank: 10, team: "Texas A&M", record: "7-3" },
      { rank: 11, team: "Tennessee", record: "9-2" },
      { rank: 12, team: "Ole Miss", record: "8-2" },
      { rank: 13, team: "BYU", record: "8-2" },
      { rank: 14, team: "Pittsburgh", record: "9-1" },
      { rank: 15, team: "Miami", record: "8-2" },
      { rank: 16, team: "UCF", record: "9-1" },
      { rank: 17, team: "Texas", record: "7-3" },
      { rank: 18, team: "Colorado", record: "8-2" },
      { rank: 19, team: "Oklahoma", record: "7-3" },
      { rank: 20, team: "Missouri", record: "8-2" },
      { rank: 21, team: "Mississippi St", record: "9-1" },
      { rank: 22, team: "Michigan", record: "7-3" },
      { rank: 23, team: "James Madison", record: "7-3" },
      { rank: 24, team: "Virginia Tech", record: "8-2" },
      { rank: 25, team: "Vanderbilt", record: "8-2" },
    ],
  },
  {
    week: 13,
    teams: [
      { rank: 1, team: "Georgia", record: "10-1" },
      { rank: 2, team: "Maryland", record: "11-0" },
      { rank: 3, team: "Ohio State", record: "9-2" },
      { rank: 4, team: "Oregon", record: "9-2" },
      { rank: 5, team: "Wisconsin", record: "10-1" },
      { rank: 6, team: "California", record: "10-1" },
      { rank: 7, team: "Tennessee", record: "9-2" },
      { rank: 8, team: "South Carolina", record: "10-1" },
      { rank: 9, team: "Pittsburgh", record: "10-1" },
      { rank: 10, team: "BYU", record: "9-2" },
      { rank: 11, team: "UCF", record: "10-1" },
      { rank: 12, team: "Oklahoma", record: "8-3" },
      { rank: 13, team: "Missouri", record: "9-2" },
      { rank: 14, team: "Colorado", record: "9-2" },
      { rank: 15, team: "Mississippi St", record: "10-1" },
      { rank: 16, team: "Michigan", record: "8-3" },
      { rank: 17, team: "Virginia Tech", record: "9-2" },
      { rank: 18, team: "Texas Tech", record: "8-3" },
      { rank: 19, team: "USC", record: "8-3" },
      { rank: 20, team: "Vanderbilt", record: "9-2" },
      { rank: 21, team: "Ole Miss", record: "8-3" },
      { rank: 22, team: "Kansas State", record: "9-2" },
      { rank: 23, team: "Notre Dame", record: "7-4" },
      { rank: 24, team: "Baylor", record: "8-3" },
      { rank: 25, team: "Miami", record: "8-3" },
    ],
  },
  {
    week: 14,
    teams: [
      { rank: 1, team: "Georgia", record: "11-1" },
      { rank: 2, team: "Maryland", record: "12-0" },
      { rank: 3, team: "Wisconsin", record: "11-1" },
      { rank: 4, team: "Oregon", record: "10-2" },
      { rank: 5, team: "Pittsburgh", record: "11-1" },
      { rank: 6, team: "South Carolina", record: "11-1" },
      { rank: 7, team: "UCF", record: "11-1" },
      { rank: 8, team: "BYU", record: "10-2" },
      { rank: 9, team: "Oklahoma", record: "9-3" },
      { rank: 10, team: "Missouri", record: "10-2" },
      { rank: 11, team: "Ohio State", record: "9-3" },
      { rank: 12, team: "Michigan", record: "9-3" },
      { rank: 13, team: "Tennessee", record: "9-3" },
      { rank: 14, team: "Virginia Tech", record: "10-2" },
      { rank: 15, team: "Vanderbilt", record: "10-2" },
      { rank: 16, team: "California", record: "10-2" },
      { rank: 17, team: "Ole Miss", record: "9-3" },
      { rank: 18, team: "Notre Dame", record: "8-4" },
      { rank: 19, team: "Miami", record: "9-3" },
      { rank: 20, team: "Baylor", record: "9-3" },
      { rank: 21, team: "North Dakota State", record: "8-4" },
      { rank: 22, team: "Mississippi State", record: "10-2" },
      { rank: 23, team: "Western Michigan", record: "11-1" },
      { rank: 24, team: "Florida State", record: "9-3" },
      { rank: 25, team: "Colorado", record: "9-3" },
    ],
  },
  {
    week: 15,
    teams: [
      { rank: 1, team: "Maryland", record: "13-0" },
      { rank: 2, team: "Pittsburgh", record: "12-1" },
      { rank: 3, team: "Oregon", record: "10-2" },
      { rank: 4, team: "Georgia", record: "11-2" },
      { rank: 5, team: "Wisconsin", record: "11-2" },
      { rank: 6, team: "BYU", record: "11-2" },
      { rank: 7, team: "South Carolina", record: "12-1" },
      { rank: 8, team: "Oklahoma", record: "9-3" },
      { rank: 9, team: "Missouri", record: "11-2" },
      { rank: 10, team: "UCF", record: "11-2" },
      { rank: 11, team: "Michigan", record: "9-3" },
      { rank: 12, team: "Tennessee", record: "10-3" },
      { rank: 13, team: "Ohio State", record: "9-3" },
      { rank: 14, team: "Vanderbilt", record: "11-2" },
      { rank: 15, team: "California", record: "10-2" },
      { rank: 16, team: "Ole Miss", record: "9-3" },
      { rank: 17, team: "Virginia Tech", record: "10-3" },
      { rank: 18, team: "Notre Dame", record: "8-4" },
      { rank: 19, team: "Miami", record: "9-3" },
      { rank: 20, team: "Baylor", record: "9-3" },
      { rank: 21, team: "North Dakota State", record: "8-4" },
      { rank: 22, team: "Western Michigan", record: "12-1" },
      { rank: 23, team: "Colorado", record: "9-3" },
      { rank: 24, team: "Mississippi State", record: "10-3" },
      { rank: 25, team: "Florida State", record: "9-3" },
    ],
  },
];

const CFP_BRACKET = [
  {
    week: 10,
    projected: true,
    seeds: [
      { seed:  1, team: "Ole Miss", record: "8-0", auto: true },
      { seed:  2, team: "Georgia", record: "8-1" },
      { seed:  3, team: "Oregon", record: "7-1" },
      { seed:  4, team: "Tennessee", record: "8-1" },
      { seed:  5, team: "Wisconsin", record: "8-0" },
      { seed:  6, team: "Texas A&M", record: "7-2" },
      { seed:  7, team: "Miami", record: "8-1", auto: true },
      { seed:  8, team: "Ohio State", record: "6-2" },
      { seed:  9, team: "South Carolina", record: "7-1", auto: true },
      { seed: 10, team: "Notre Dame", record: "5-3", auto: true },
      { seed: 11, team: "Maryland", record: "8-0", auto: true },
      { seed: 12, team: "Colorado", record: "6-2", auto: true },
    ],
    bowls: {
      qf: ["Cotton Bowl", "Peach Bowl", "Rose Bowl", "Fiesta Bowl"],
      site: "Las Vegas, NV",
    },
  },
  {
    week: 11,
    projected: true,
    seeds: [
      { seed:  1, team: "Georgia", record: "9-1", auto: true },
      { seed:  2, team: "Wisconsin", record: "9-0", auto: true },
      { seed:  3, team: "Ohio State", record: "7-2" },
      { seed:  4, team: "Ole Miss", record: "8-1" },
      { seed:  5, team: "Miami", record: "8-1", auto: true },
      { seed:  6, team: "Texas A&M", record: "7-2" },
      { seed:  7, team: "Oregon", record: "7-2" },
      { seed:  8, team: "South Carolina", record: "8-1", auto: true },
      { seed:  9, team: "Maryland", record: "9-0", auto: true },
      { seed: 10, team: "Michigan", record: "7-2" },
      { seed: 11, team: "California", record: "8-1" },
      { seed: 12, team: "Texas Tech", record: "7-2", auto: true },
    ],
  },
  {
    week: 12,
    projected: true,
    seeds: [
      { seed:  1, team: "Georgia", record: "9-1", auto: true },
      { seed:  2, team: "Ohio State", record: "8-2" },
      { seed:  3, team: "Oregon", record: "8-2" },
      { seed:  4, team: "Maryland", record: "10-0", auto: true },
      { seed:  5, team: "Wisconsin", record: "9-1" },
      { seed:  6, team: "California", record: "9-1", auto: true },
      { seed:  7, team: "South Carolina", record: "9-1", auto: true },
      { seed:  8, team: "Texas Tech", record: "8-2", auto: true },
      { seed:  9, team: "USC", record: "8-2" },
      { seed: 10, team: "Texas A&M", record: "7-3" },
      { seed: 11, team: "Tennessee", record: "9-2" },
      { seed: 12, team: "Ole Miss", record: "8-2" },
    ],
  },
  {
    week: 13,
    projected: true,
    seeds: [
      { seed:  1, team: "Georgia", record: "10-1", auto: true },
      { seed:  2, team: "Maryland", record: "11-0", auto: true },
      { seed:  3, team: "Ohio State", record: "9-2" },
      { seed:  4, team: "Oregon", record: "9-2" },
      { seed:  5, team: "Wisconsin", record: "10-1" },
      { seed:  6, team: "California", record: "10-1", auto: true },
      { seed:  7, team: "Tennessee", record: "9-2" },
      { seed:  8, team: "South Carolina", record: "10-1", auto: true },
      { seed:  9, team: "Pittsburgh", record: "10-1" },
      { seed: 10, team: "BYU", record: "9-2" },
      { seed: 11, team: "UCF", record: "10-1" },
      { seed: 12, team: "Colorado", record: "9-2", auto: true },
    ],
    bowls: {
      qf: ["Cotton Bowl", "Peach Bowl", "Fiesta Bowl", "Rose Bowl"],
    },
  },
  {
    week: 14,
    projected: true,
    seeds: [
      { seed:  1, team: "Georgia", record: "11-1", auto: true },
      { seed:  2, team: "Maryland", record: "12-0", auto: true },
      { seed:  3, team: "Wisconsin", record: "11-1" },
      { seed:  4, team: "Oregon", record: "10-2" },
      { seed:  5, team: "Pittsburgh", record: "11-1" },
      { seed:  6, team: "South Carolina", record: "11-1", auto: true },
      { seed:  7, team: "UCF", record: "11-1", auto: true },
      { seed:  8, team: "BYU", record: "10-2" },
      { seed:  9, team: "Oklahoma", record: "9-3" },
      { seed: 10, team: "Missouri", record: "10-2" },
      { seed: 11, team: "Ohio State", record: "9-3" },
      { seed: 12, team: "Virginia Tech", record: "10-2", auto: true },
    ],
    bowls: {
      qf: ["Cotton Bowl", "Peach Bowl", "Fiesta Bowl", "Rose Bowl"],
      site: "Las Vegas, NV",
    },
  },
  {
    week: 15,
    projected: false,
    seeds: [
      { seed:  1, team: "Maryland", record: "13-0", auto: true },
      { seed:  2, team: "Pittsburgh", record: "12-1", auto: true },
      { seed:  3, team: "Oregon", record: "10-2" },
      { seed:  4, team: "Georgia", record: "11-2" },
      { seed:  5, team: "Wisconsin", record: "11-2" },
      { seed:  6, team: "BYU", record: "11-2", auto: true },
      { seed:  7, team: "South Carolina", record: "12-1", auto: true },
      { seed:  8, team: "Oklahoma", record: "9-3" },
      { seed:  9, team: "Missouri", record: "11-2" },
      { seed: 10, team: "UCF", record: "11-2" },
      { seed: 11, team: "Michigan", record: "9-3" },
      { seed: 12, team: "Tennessee", record: "10-3", auto: true },
    ],
    bowls: {
      qf: ["Cotton Bowl", "Rose Bowl", "Fiesta Bowl", "Peach Bowl"],
      site: "Las Vegas, NV",
    },
  },
];
