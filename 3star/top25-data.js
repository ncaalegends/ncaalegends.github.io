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
    week: 3,
    teams: [
      { rank: 1, team: "Pittsburgh", record: "2-0" },
      { rank: 2, team: "Georgia", record: "2-0" },
      { rank: 3, team: "Ohio State", record: "2-0" },
      { rank: 4, team: "Baylor", record: "3-0" },
      { rank: 5, team: "Oklahoma", record: "2-0" },
      { rank: 6, team: "UCF", record: "2-0" },
      { rank: 7, team: "Miami", record: "2-0" },
      { rank: 8, team: "NDSU", record: "3-0" },
      { rank: 9, team: "Wisconsin", record: "3-1" },
      { rank: 10, team: "Texas A&M", record: "2-1" },
      { rank: 11, team: "BYU", record: "1-1" },
      { rank: 12, team: "Oregon", record: "1-1" },
      { rank: 13, team: "Notre Dame", record: "2-1" },
      { rank: 14, team: "Maryland", record: "0-1" },
      { rank: 15, team: "Tennessee", record: "1-1" },
      { rank: 16, team: "Ole Miss", record: "1-1" },
      { rank: 17, team: "Colorado", record: "2-0" },
      { rank: 18, team: "South Carolina", record: "2-0" },
      { rank: 19, team: "USC", record: "2-0" },
      { rank: 20, team: "Alabama", record: "1-0" },
      { rank: 21, team: "California", record: "1-1" },
      { rank: 22, team: "Penn State", record: "2-0" },
      { rank: 23, team: "Wake Forest", record: "3-0" },
      { rank: 24, team: "Virginia Tech", record: "1-1" },
      { rank: 25, team: "Auburn", record: "2-1" },
    ],
  },
  {
    week: 5,
    teams: [
      { rank: 1, team: "Pittsburgh", record: "4-0" },
      { rank: 2, team: "Miami", record: "3-0" },
      { rank: 3, team: "UCF", record: "4-0" },
      { rank: 4, team: "Baylor", record: "5-0" },
      { rank: 5, team: "Oklahoma", record: "4-0" },
      { rank: 6, team: "Wisconsin", record: "4-1" },
      { rank: 7, team: "Oregon", record: "3-1" },
      { rank: 8, team: "BYU", record: "2-1" },
      { rank: 9, team: "Maryland", record: "2-1" },
      { rank: 10, team: "Ohio State", record: "3-1" },
      { rank: 11, team: "NDSU", record: "3-1" },
      { rank: 12, team: "Colorado", record: "4-0" },
      { rank: 13, team: "Georgia", record: "2-2" },
      { rank: 14, team: "South Carolina", record: "4-0" },
      { rank: 15, team: "LSU", record: "4-0" },
      { rank: 16, team: "TCU", record: "4-0" },
      { rank: 17, team: "Tennessee", record: "2-2" },
      { rank: 18, team: "Louisville", record: "3-0" },
      { rank: 19, team: "Nebraska", record: "4-0" },
      { rank: 20, team: "Notre Dame", record: "3-2" },
      { rank: 21, team: "Missouri", record: "2-1" },
      { rank: 22, team: "Ole Miss", record: "2-2" },
      { rank: 23, team: "Iowa State", record: "3-1" },
      { rank: 24, team: "Michigan", record: "3-2" },
      { rank: 25, team: "Wake Forest", record: "4-1" },
    ],
  },
  {
    week: 6,
    teams: [
      { rank: 1, team: "Pittsburgh", record: "4-0" },
      { rank: 2, team: "Miami", record: "4-0" },
      { rank: 3, team: "Baylor", record: "5-0" },
      { rank: 4, team: "Oklahoma", record: "5-0" },
      { rank: 5, team: "Wisconsin", record: "5-1" },
      { rank: 6, team: "Ohio State", record: "4-1" },
      { rank: 7, team: "UCF", record: "4-1" },
      { rank: 8, team: "NDSU", record: "4-1" },
      { rank: 9, team: "Colorado", record: "5-0" },
      { rank: 10, team: "Georgia", record: "3-2" },
      { rank: 11, team: "Tennessee", record: "3-2" },
      { rank: 12, team: "LSU", record: "5-0" },
      { rank: 13, team: "South Carolina", record: "5-0" },
      { rank: 14, team: "TCU", record: "5-0" },
      { rank: 15, team: "Louisville", record: "4-0" },
      { rank: 16, team: "Notre Dame", record: "4-2" },
      { rank: 17, team: "Missouri", record: "3-1" },
      { rank: 18, team: "Ole Miss", record: "2-2" },
      { rank: 19, team: "Iowa State", record: "4-1" },
      { rank: 20, team: "Michigan", record: "3-2" },
      { rank: 21, team: "BYU", record: "2-2" },
      { rank: 22, team: "Oregon", record: "3-2" },
      { rank: 23, team: "California", record: "2-2" },
      { rank: 24, team: "Texas A&M", record: "2-2" },
      { rank: 25, team: "Alabama", record: "2-2" },
    ],
  },
  {
    week: 7,
    teams: [
      { rank: 1, team: "Pittsburgh", record: "5-0" },
      { rank: 2, team: "Miami", record: "5-0" },
      { rank: 3, team: "Baylor", record: "6-0" },
      { rank: 4, team: "Oklahoma", record: "6-0" },
      { rank: 5, team: "Wisconsin", record: "6-1" },
      { rank: 6, team: "UCF", record: "4-1" },
      { rank: 7, team: "North Dakota State", record: "5-1" },
      { rank: 8, team: "Colorado", record: "6-0" },
      { rank: 9, team: "Georgia", record: "4-2" },
      { rank: 10, team: "Tennessee", record: "4-2" },
      { rank: 11, team: "South Carolina", record: "5-0" },
      { rank: 12, team: "TCU", record: "6-0" },
      { rank: 13, team: "Notre Dame", record: "5-2" },
      { rank: 14, team: "Missouri", record: "4-1" },
      { rank: 15, team: "Ohio State", record: "4-2" },
      { rank: 16, team: "Ole Miss", record: "3-2" },
      { rank: 17, team: "Iowa State", record: "4-1" },
      { rank: 18, team: "Michigan", record: "4-2" },
      { rank: 19, team: "BYU", record: "3-2" },
      { rank: 20, team: "Oregon", record: "3-2" },
      { rank: 21, team: "LSU", record: "5-1" },
      { rank: 22, team: "California", record: "3-2" },
      { rank: 23, team: "Nebraska", record: "4-1" },
      { rank: 24, team: "Rutgers", record: "6-0" },
      { rank: 25, team: "USC", record: "5-1" },
    ],
  },
];
