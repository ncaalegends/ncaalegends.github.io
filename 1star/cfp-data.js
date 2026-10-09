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
      { rank: 1, team: "Ohio State", record: "8-0" },
      { rank: 2, team: "LSU", record: "8-1" },
      { rank: 3, team: "BYU", record: "8-1" },
      { rank: 4, team: "Tennessee", record: "7-1" },
      { rank: 5, team: "Georgia", record: "6-2" },
      { rank: 6, team: "Miami", record: "6-2" },
      { rank: 7, team: "Texas A&M", record: "6-2" },
      { rank: 8, team: "USC", record: "7-1" },
      { rank: 9, team: "Washington", record: "7-1" },
      { rank: 10, team: "Oregon", record: "6-2" },
      { rank: 11, team: "New Glarus", record: "7-1" },
      { rank: 12, team: "South Carolina", record: "6-2" },
      { rank: 13, team: "Colorado", record: "6-2" },
      { rank: 14, team: "Indiana", record: "6-2" },
      { rank: 15, team: "Notre Dame", record: "6-2" },
      { rank: 16, team: "Texas", record: "6-3" },
      { rank: 17, team: "Penn State", record: "6-2" },
      { rank: 18, team: "Iowa", record: "6-2" },
      { rank: 19, team: "Michigan", record: "8-1" },
      { rank: 20, team: "Louisville", record: "5-3" },
      { rank: 21, team: "Alabama", record: "5-3" },
      { rank: 22, team: "Boise State", record: "6-2" },
      { rank: 23, team: "Memphis", record: "6-2" },
      { rank: 24, team: "Houston", record: "7-2" },
      { rank: 25, team: "Arizona", record: "6-2" },
    ],
  },
  {
    week: 11,
    teams: [
      { rank: 1, team: "Ohio State", record: "9-0" },
      { rank: 2, team: "Texas A&M", record: "7-2" },
      { rank: 3, team: "BYU", record: "8-1" },
      { rank: 4, team: "Oregon", record: "7-2" },
      { rank: 5, team: "New Glarus", record: "9-1" },
      { rank: 6, team: "LSU", record: "8-2" },
      { rank: 7, team: "Indiana", record: "7-2" },
      { rank: 8, team: "Notre Dame", record: "7-2" },
      { rank: 9, team: "Texas", record: "7-3" },
      { rank: 10, team: "Iowa", record: "7-2" },
      { rank: 11, team: "USC", record: "7-2" },
      { rank: 12, team: "Tennessee", record: "7-2" },
      { rank: 13, team: "Michigan", record: "8-1" },
      { rank: 14, team: "Georgia", record: "6-3" },
      { rank: 15, team: "Miami", record: "6-3" },
      { rank: 16, team: "Washington", record: "7-2" },
      { rank: 17, team: "Alabama", record: "6-3" },
      { rank: 18, team: "Louisville", record: "6-3" },
      { rank: 19, team: "Appalachian State", record: "9-0" },
      { rank: 20, team: "Boise State", record: "7-2" },
      { rank: 21, team: "South Carolina", record: "6-3" },
      { rank: 22, team: "Minneapolis", record: "7-2" },
      { rank: 23, team: "Arkansas", record: "7-2" },
      { rank: 24, team: "Texas Tech", record: "6-3" },
      { rank: 25, team: "Duke", record: "6-3" },
    ],
  },
  {
    week: 12,
    teams: [
      { rank: 1, team: "Ohio State", record: "10-0" },
      { rank: 2, team: "BYU", record: "9-1" },
      { rank: 3, team: "Indiana", record: "8-2" },
      { rank: 4, team: "Oregon", record: "8-2" },
      { rank: 5, team: "New Glarus", record: "10-1" },
      { rank: 6, team: "Notre Dame", record: "8-2" },
      { rank: 7, team: "LSU", record: "8-2" },
      { rank: 8, team: "Texas", record: "7-3" },
      { rank: 9, team: "USC", record: "8-2" },
      { rank: 10, team: "Michigan", record: "9-1" },
      { rank: 11, team: "Texas A&M", record: "7-3" },
      { rank: 12, team: "Iowa", record: "7-3" },
      { rank: 13, team: "Georgia", record: "7-3" },
      { rank: 14, team: "Washington", record: "8-2" },
      { rank: 15, team: "Miami", record: "7-3" },
      { rank: 16, team: "South Carolina", record: "7-3" },
      { rank: 17, team: "Alabama", record: "7-3" },
      { rank: 18, team: "Boise State", record: "8-2" },
      { rank: 19, team: "Louisville", record: "7-3" },
      { rank: 20, team: "Tennessee", record: "7-3" },
      { rank: 21, team: "Appalachian State", record: "11-0" },
      { rank: 22, team: "Duke", record: "7-3" },
      { rank: 23, team: "Ole Miss", record: "7-3" },
      { rank: 24, team: "Texas Tech", record: "7-3" },
      { rank: 25, team: "Colorado", record: "7-3" },
    ],
  },
  {
    week: 13,
    teams: [
      { rank: 1, team: "Ohio State", record: "11-0" },
      { rank: 2, team: "USC", record: "9-2" },
      { rank: 3, team: "LSU", record: "9-2" },
      { rank: 4, team: "Notre Dame", record: "9-2" },
      { rank: 5, team: "New Glarus", record: "10-1" },
      { rank: 6, team: "Texas", record: "8-3" },
      { rank: 7, team: "Indiana", record: "8-3" },
      { rank: 8, team: "Iowa", record: "8-3" },
      { rank: 9, team: "Washington", record: "9-2" },
      { rank: 10, team: "BYU", record: "9-2" },
      { rank: 11, team: "Texas A&M", record: "8-3" },
      { rank: 12, team: "Oregon", record: "8-3" },
      { rank: 13, team: "Miami", record: "8-3" },
      { rank: 14, team: "Boise State", record: "9-2" },
      { rank: 15, team: "South Carolina", record: "8-3" },
      { rank: 16, team: "Appalachian State", record: "11-1" },
      { rank: 17, team: "Michigan", record: "9-2" },
      { rank: 18, team: "Tennessee", record: "8-3" },
      { rank: 19, team: "Ole Miss", record: "8-3" },
      { rank: 20, team: "Colorado", record: "8-3" },
      { rank: 21, team: "Texas Tech", record: "8-3" },
      { rank: 22, team: "Baldwin Wallace", record: "9-2" },
      { rank: 23, team: "North Shore", record: "9-2" },
      { rank: 24, team: "Arkansas", record: "8-3" },
      { rank: 25, team: "Buffalo", record: "10-1" },
    ],
  },
];

const CFP_BRACKET = [
  {
    week: 10,
    projected: true,
    seeds: [
      { seed:  1, team: "Ohio State", record: "8-0", auto: true },
      { seed:  2, team: "LSU", record: "8-1" },
      { seed:  3, team: "BYU", record: "8-1", auto: true },
      { seed:  4, team: "Tennessee", record: "7-1", auto: true },
      { seed:  5, team: "Georgia", record: "6-2" },
      { seed:  6, team: "Miami", record: "6-2" },
      { seed:  7, team: "Texas A&M", record: "6-2" },
      { seed:  8, team: "USC", record: "7-1" },
      { seed:  9, team: "Washington", record: "7-1" },
      { seed: 10, team: "Oregon", record: "6-2" },
      { seed: 11, team: "New Glarus", record: "7-1", auto: true },
      { seed: 12, team: "Wake Forest", record: "6-2", auto: true },
    ],
    bowls: {
      qf: ["Fiesta Bowl", "Rose Bowl", "Peach Bowl", "Sugar Bowl"],
      site: "New Orleans, LA",
    },
  },
  {
    week: 11,
    projected: true,
    seeds: [
      { seed:  1, team: "Ohio State", record: "9-0", auto: true },
      { seed:  2, team: "Texas A&M", record: "7-2", auto: true },
      { seed:  3, team: "BYU", record: "8-1" },
      { seed:  4, team: "Oregon", record: "7-2" },
      { seed:  5, team: "New Glarus", record: "9-1", auto: true },
      { seed:  6, team: "LSU", record: "8-2" },
      { seed:  7, team: "Indiana", record: "7-2" },
      { seed:  8, team: "Notre Dame", record: "7-2", auto: true },
      { seed:  9, team: "Texas", record: "7-3" },
      { seed: 10, team: "Iowa", record: "7-2" },
      { seed: 11, team: "Louisville", record: "6-3", auto: true },
      { seed: 12, team: "Arizona State", record: "7-2", auto: true },
    ],
    bowls: {
      qf: ["Fiesta Bowl", "Rose Bowl", "Peach Bowl", "Sugar Bowl"],
      site: "New Orleans, LA",
    },
  },
  {
    week: 12,
    projected: true,
    seeds: [
      { seed:  1, team: "Ohio State", record: "10-0", auto: true },
      { seed:  2, team: "BYU", record: "9-1", auto: true },
      { seed:  3, team: "Indiana", record: "8-2" },
      { seed:  4, team: "Oregon", record: "8-2" },
      { seed:  5, team: "New Glarus", record: "10-1", auto: true },
      { seed:  6, team: "Notre Dame", record: "8-2", auto: true },
      { seed:  7, team: "LSU", record: "8-2" },
      { seed:  8, team: "Texas", record: "7-3" },
      { seed:  9, team: "USC", record: "8-2" },
      { seed: 10, team: "Michigan", record: "9-1" },
      { seed: 11, team: "Louisville", record: "7-3", auto: true },
      { seed: 12, team: "Ole Miss", record: "7-3", auto: true },
    ],
    bowls: {
      qf: ["Fiesta Bowl", "Rose Bowl", "Peach Bowl", "Sugar Bowl"],
      site: "New Orleans, LA",
    },
  },
  {
    week: 13,
    projected: true,
    seeds: [
      { seed:  1, team: "Ohio State", record: "11-0", auto: true },
      { seed:  2, team: "USC", record: "9-2" },
      { seed:  3, team: "LSU", record: "9-2" },
      { seed:  4, team: "Notre Dame", record: "9-2", auto: true },
      { seed:  5, team: "New Glarus", record: "10-1", auto: true },
      { seed:  6, team: "Texas", record: "8-3" },
      { seed:  7, team: "Indiana", record: "8-3" },
      { seed:  8, team: "Iowa", record: "8-3" },
      { seed:  9, team: "Washington", record: "9-2" },
      { seed: 10, team: "Ole Miss", record: "8-3", auto: true },
      { seed: 11, team: "Arizona State", record: "8-3", auto: true },
      { seed: 12, team: "Wake Forest", record: "8-3", auto: true },
    ],
    bowls: {
      site: "New Orleans, LA",
    },
  },
];
