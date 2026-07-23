/* ============================================================
   TOP 25 — the in-game AP poll, transcribed from screenshots
   ------------------------------------------------------------
   This is the EA College Football 27 Top 25 as it appeared in the
   game, one entry per week. It is NOT the site's own computed Power
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
   instead. The site shows the newest week by default and lets you
   browse earlier weeks.

   HOW TO ADD A WEEK
   Screenshot the in-game Top 25 for the week, then append a new
   block below following the same shape. Team names should match the
   roster / schedule spelling (the site resolves them the same way,
   through SCHEDULE_TEAM_ALIASES, so "Cal" vs "California" etc. still
   line up). `record` is whatever the poll shows next to the team.

     { rank, team, record }
       rank    1 = best, 1..25
       team    must resolve to a roster or schedule team name
       record  the W-L string shown in the poll (e.g. "1-0")
   ============================================================ */
const TOP25 = [
  {
    week: 1,
    teams: [
      { rank: 1, team: "Ohio State", record: "1-0" },
      { rank: 2, team: "Oregon", record: "1-0" },
      { rank: 3, team: "Notre Dame", record: "1-0" },
      { rank: 4, team: "Georgia", record: "0-0" },
      { rank: 5, team: "Indiana", record: "0-0" },
      { rank: 6, team: "Miami", record: "1-0" },
      { rank: 7, team: "Texas", record: "0-0" },
      { rank: 8, team: "Texas A&M", record: "0-0" },
      { rank: 9, team: "Ole Miss", record: "0-0" },
      { rank: 10, team: "Oklahoma", record: "0-0" },
      { rank: 11, team: "LSU", record: "1-0" },
      { rank: 12, team: "BYU", record: "0-0" },
      { rank: 13, team: "Alabama", record: "1-0" },
      { rank: 14, team: "Michigan", record: "1-0" },
      { rank: 15, team: "USC", record: "2-0" },
      { rank: 16, team: "Texas Tech", record: "0-0" },
      { rank: 17, team: "Penn State", record: "0-0" },
      { rank: 18, team: "Iowa", record: "0-0" },
      { rank: 19, team: "Utah", record: "0-0" },
      { rank: 20, team: "Tennessee", record: "0-0" },
      { rank: 21, team: "Houston", record: "0-0" },
      { rank: 22, team: "SMU", record: "1-0" },
      { rank: 23, team: "Washington", record: "0-0" },
      { rank: 24, team: "Louisville", record: "0-0" },
      { rank: 25, team: "Florida", record: "0-0" },
    ],
  },
];
