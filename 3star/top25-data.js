/* ============================================================
   TOP 25 — the in-game AP poll, transcribed from screenshots
   ------------------------------------------------------------
   The 3-Star Dynasty's copy of the EA College Football 27 Top 25,
   one entry per week. It is NOT the site's own computed Power
   Rankings (that's the Rankings tab, built from head-to-head
   results). This poll is mostly CPU teams with a handful of coaches
   mixed in, and it drives two things on the site:

     1. The Top 25 tab.
     2. The "#N" rank badges on schedules. A game played in week N
        shows each team's rank from THAT week's poll, so a schedule
        always shows what a team was ranked WHEN the game was played,
        even after they rise or fall later.

   Because of (2), each week's poll is frozen history: once a week is
   entered, never edit it to reflect a later poll — add a new week
   instead.

   WHAT THE SITE SHOWS, AND WHEN (the reveal rule)
   The site shows the poll for SEASON.currentWeek — the week the season
   has actually advanced to — NOT simply the newest block in this file.
   So a poll added here for a week the site hasn't advanced to yet sits
   in the repo INVISIBLE, and reveals the moment someone advances to
   that week.

   NO ADVANCE GATE HERE (this is the difference from main)
   The main dynasty REFUSES to advance to week N until week N's poll is
   in its file, so the poll and the new week always surface together.
   3-star is deliberately not gated: advancing never waits on a
   screenshot. The cost is that the Top 25 tab can lag the schedule by
   a week when nobody's uploaded yet, which is the right trade for a
   league where the poll is a nice-to-have rather than the point. Drop
   a week in whenever it's convenient — including after the advance —
   and it appears as soon as it's pushed. See top25GateError() in
   tools/lib/league.js for where that choice is expressed.

   WHERE IT STARTS
   This file begins at the week 3-star started transcribing, not at
   week 1. Earlier weeks were never captured and won't be backfilled,
   so games before that week simply carry no rank badges — an absent
   poll renders as unranked, which is correct rather than broken.

   HOW TO ADD A WEEK
   Screenshot the in-game Top 25 for the week, then run:

     node tools/top25.js --league 3star --week N --file poll.txt

   The --league flag is the part that's easy to forget; without it the
   script writes to main. See tools/README.md. The tool counts to 25,
   catches a doubled rank, and won't let you quietly overwrite a week
   that's already history.

   Team names should match the roster / schedule spelling (the site
   resolves them the same way, through SCHEDULE_TEAM_ALIASES, so "Cal"
   vs "California" etc. still line up). `record` is whatever the poll
   shows next to the team.

     { rank, team, record }
       rank    1 = best, 1..25
       team    must resolve to a roster or schedule team name
       record  the W-L string shown in the poll (e.g. "1-0")
   ============================================================ */
const TOP25 = [
  {
    week: 4,
    teams: [
      { rank: 1, team: "Texas", record: "3-0" },
      { rank: 2, team: "Miami", record: "4-0" },
      { rank: 3, team: "Oregon", record: "3-0" },
      { rank: 4, team: "Georgia", record: "3-0" },
      { rank: 5, team: "Ole Miss", record: "3-0" },
      { rank: 6, team: "Oklahoma", record: "3-1" },
      { rank: 7, team: "BYU", record: "3-0" },
      { rank: 8, team: "Ohio State", record: "2-1" },
      { rank: 9, team: "USC", record: "3-0" },
      { rank: 10, team: "Virginia", record: "2-0" },
      { rank: 11, team: "Indiana", record: "2-1" },
      { rank: 12, team: "Michigan", record: "2-1" },
      { rank: 13, team: "LSU", record: "3-1" },
      { rank: 14, team: "Alabama", record: "2-1" },
      { rank: 15, team: "South Carolina", record: "4-0" },
      { rank: 16, team: "Iowa", record: "2-1" },
      { rank: 17, team: "Louisville", record: "2-1" },
      { rank: 18, team: "Utah", record: "2-1" },
      { rank: 19, team: "Houston", record: "2-1" },
      { rank: 20, team: "Tennessee", record: "3-1" },
      { rank: 21, team: "Texas Tech", record: "2-1" },
      { rank: 22, team: "Missouri", record: "3-1" },
      { rank: 23, team: "Penn State", record: "2-2" },
      { rank: 24, team: "Texas A&M", record: "2-2" },
      { rank: 25, team: "Iowa State", record: "3-0" },
    ],
  },
  {
    week: 5,
    teams: [
      { rank: 1, team: "Miami", record: "5-0" },
      { rank: 2, team: "Georgia", record: "4-0" },
      { rank: 3, team: "Ole Miss", record: "4-0" },
      { rank: 4, team: "USC", record: "4-0" },
      { rank: 5, team: "Oklahoma", record: "4-1" },
      { rank: 6, team: "BYU", record: "4-0" },
      { rank: 7, team: "Ohio State", record: "3-1" },
      { rank: 8, team: "Texas", record: "3-2" },
      { rank: 9, team: "Virginia", record: "3-0" },
      { rank: 10, team: "Indiana", record: "3-1" },
      { rank: 11, team: "Michigan", record: "3-1" },
      { rank: 12, team: "Oregon", record: "3-1" },
      { rank: 13, team: "South Carolina", record: "5-0" },
      { rank: 14, team: "Tennessee", record: "4-1" },
      { rank: 15, team: "Louisville", record: "3-1" },
      { rank: 16, team: "Texas A&M", record: "3-2" },
      { rank: 17, team: "Texas Tech", record: "3-1" },
      { rank: 18, team: "Missouri", record: "4-1" },
      { rank: 19, team: "Iowa State", record: "5-0" },
      { rank: 20, team: "Arizona", record: "3-1" },
      { rank: 21, team: "California", record: "5-0" },
      { rank: 22, team: "LSU", record: "3-2" },
      { rank: 23, team: "Utah", record: "2-2" },
      { rank: 24, team: "Iowa", record: "2-2" },
      { rank: 25, team: "SMU", record: "2-2" },
    ],
  },
  {
    week: 6,
    teams: [
      { rank: 1, team: "Miami", record: "6-0" },
      { rank: 2, team: "Georgia", record: "5-0" },
      { rank: 3, team: "Ole Miss", record: "4-0" },
      { rank: 4, team: "USC", record: "5-0" },
      { rank: 5, team: "Oklahoma", record: "4-1" },
      { rank: 6, team: "BYU", record: "5-0" },
      { rank: 7, team: "Ohio State", record: "4-1" },
      { rank: 8, team: "Virginia", record: "4-0" },
      { rank: 9, team: "Indiana", record: "4-1" },
      { rank: 10, team: "Michigan", record: "4-1" },
      { rank: 11, team: "Oregon", record: "3-1" },
      { rank: 12, team: "Tennessee", record: "5-1" },
      { rank: 13, team: "Texas A&M", record: "4-2" },
      { rank: 14, team: "Texas Tech", record: "4-1" },
      { rank: 15, team: "Missouri", record: "5-1" },
      { rank: 16, team: "Iowa State", record: "5-0" },
      { rank: 17, team: "California", record: "5-0" },
      { rank: 18, team: "LSU", record: "4-2" },
      { rank: 19, team: "Utah", record: "2-2" },
      { rank: 20, team: "South Carolina", record: "5-1" },
      { rank: 21, team: "Notre Dame", record: "3-3" },
      { rank: 22, team: "Texas", record: "3-2" },
      { rank: 23, team: "Alabama", record: "2-2" },
      { rank: 24, team: "James Madison", record: "4-1" },
      { rank: 25, team: "Mississippi St", record: "6-0" },
    ],
  },
  {
    week: 7,
    teams: [
      { rank: 1, team: "Miami", record: "6-0" },
      { rank: 2, team: "Ole Miss", record: "5-0" },
      { rank: 3, team: "USC", record: "6-0" },
      { rank: 4, team: "Virginia", record: "5-0" },
      { rank: 5, team: "Georgia", record: "5-1" },
      { rank: 6, team: "Tennessee", record: "6-1" },
      { rank: 7, team: "Michigan", record: "4-1" },
      { rank: 8, team: "Oregon", record: "4-1" },
      { rank: 9, team: "Texas A&M", record: "5-2" },
      { rank: 10, team: "Iowa State", record: "6-0" },
      { rank: 11, team: "BYU", record: "5-1" },
      { rank: 12, team: "Texas Tech", record: "4-1" },
      { rank: 13, team: "Missouri", record: "5-1" },
      { rank: 14, team: "Utah", record: "3-2" },
      { rank: 15, team: "South Carolina", record: "5-1" },
      { rank: 16, team: "Notre Dame", record: "4-3" },
      { rank: 17, team: "Texas", record: "3-2" },
      { rank: 18, team: "Ohio State", record: "4-2" },
      { rank: 19, team: "James Madison", record: "5-1" },
      { rank: 20, team: "Oklahoma", record: "4-2" },
      { rank: 21, team: "Indiana", record: "4-2" },
      { rank: 22, team: "Mississippi St", record: "7-0" },
      { rank: 23, team: "Wisconsin", record: "5-0" },
      { rank: 24, team: "California", record: "5-1" },
      { rank: 25, team: "Kentucky", record: "5-1" },
    ],
  },
  {
    week: 8,
    teams: [
      { rank: 1, team: "Miami", record: "7-0" },
      { rank: 2, team: "Ole Miss", record: "6-0" },
      { rank: 3, team: "Georgia", record: "6-1" },
      { rank: 4, team: "USC", record: "6-0" },
      { rank: 5, team: "Tennessee", record: "7-1" },
      { rank: 6, team: "Oregon", record: "5-1" },
      { rank: 7, team: "Texas A&M", record: "6-2" },
      { rank: 8, team: "Iowa State", record: "6-0" },
      { rank: 9, team: "BYU", record: "5-1" },
      { rank: 10, team: "Texas Tech", record: "5-1" },
      { rank: 11, team: "Missouri", record: "6-1" },
      { rank: 12, team: "Virginia", record: "5-1" },
      { rank: 13, team: "South Carolina", record: "6-1" },
      { rank: 14, team: "Texas", record: "4-2" },
      { rank: 15, team: "Notre Dame", record: "4-3" },
      { rank: 16, team: "Ohio State", record: "5-2" },
      { rank: 17, team: "Oklahoma", record: "5-2" },
      { rank: 18, team: "Wisconsin", record: "6-0" },
      { rank: 19, team: "Mississippi St", record: "8-0" },
      { rank: 20, team: "California", record: "6-1" },
      { rank: 21, team: "Michigan", record: "4-2" },
      { rank: 22, team: "Maryland", record: "7-0" },
      { rank: 23, team: "James Madison", record: "5-2" },
      { rank: 24, team: "Michigan State", record: "6-1" },
      { rank: 25, team: "LSU", record: "5-3" },
    ],
  },
];
