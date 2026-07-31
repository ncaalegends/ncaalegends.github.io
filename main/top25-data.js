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
   instead.

   WHAT THE SITE SHOWS, AND WHEN (the reveal rule)
   The site shows the poll for SEASON.currentWeek — the week the season
   has actually advanced to — NOT simply the newest block in this file.
   So a poll added here for a week the site hasn't advanced to yet sits
   in the repo INVISIBLE. It reveals the moment someone advances to that
   week (on the website or via advance.cmd), which flips currentWeek and
   surfaces the poll and the "#N" badges together, never before.

   This dovetails with the advance gate (tools/lib/league.js): an
   advance to week N is REFUSED until week N's poll is in this file. So
   the order is always: (1) add week N's block here and push — nothing
   changes on the site; (2) advance to week N — the poll appears in the
   same motion as the new week and the Discord announcement.

   HOW TO ADD A WEEK
   Screenshot the in-game Top 25 for the week, then either run
   `node tools/top25.js --week N --file poll.txt` (see tools/README.md)
   or append a new block below by hand, following the same shape. The
   tool is preferred — it counts to 25, catches a doubled rank, and
   won't let you quietly overwrite a week that's already history.

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
  {
    week: 2,
    teams: [
      { rank: 1, team: "Ohio State", record: "1-0" },
      { rank: 2, team: "Oregon", record: "1-0" },
      { rank: 3, team: "Notre Dame", record: "1-0" },
      { rank: 4, team: "Georgia", record: "1-0" },
      { rank: 5, team: "Indiana", record: "1-0" },
      { rank: 6, team: "Miami", record: "1-0" },
      { rank: 7, team: "Texas", record: "1-0" },
      { rank: 8, team: "Texas A&M", record: "1-0" },
      { rank: 9, team: "Ole Miss", record: "1-0" },
      { rank: 10, team: "Oklahoma", record: "1-0" },
      { rank: 11, team: "LSU", record: "1-0" },
      { rank: 12, team: "BYU", record: "1-0" },
      { rank: 13, team: "Alabama", record: "1-0" },
      { rank: 14, team: "Michigan", record: "1-0" },
      { rank: 15, team: "USC", record: "2-0" },
      { rank: 16, team: "Texas Tech", record: "1-0" },
      { rank: 17, team: "Penn State", record: "1-0" },
      { rank: 18, team: "Iowa", record: "1-0" },
      { rank: 19, team: "Utah", record: "1-0" },
      { rank: 20, team: "Tennessee", record: "1-0" },
      { rank: 21, team: "Houston", record: "1-0" },
      { rank: 22, team: "SMU", record: "1-0" },
      { rank: 23, team: "Washington", record: "1-0" },
      { rank: 24, team: "Florida", record: "1-0" },
      { rank: 25, team: "Missouri", record: "1-0" },
    ],
  },
  {
    week: 3,
    teams: [
      { rank: 1, team: "Texas", record: "2-0" },
      { rank: 2, team: "Oregon", record: "2-0" },
      { rank: 3, team: "Notre Dame", record: "2-0" },
      { rank: 4, team: "Georgia", record: "2-0" },
      { rank: 5, team: "Indiana", record: "2-0" },
      { rank: 6, team: "Miami", record: "2-0" },
      { rank: 7, team: "Ohio State", record: "1-1" },
      { rank: 8, team: "Texas A&M", record: "2-0" },
      { rank: 9, team: "Ole Miss", record: "2-0" },
      { rank: 10, team: "Michigan", record: "2-0" },
      { rank: 11, team: "LSU", record: "2-0" },
      { rank: 12, team: "BYU", record: "2-0" },
      { rank: 13, team: "Alabama", record: "2-0" },
      { rank: 14, team: "USC", record: "3-0" },
      { rank: 15, team: "Texas Tech", record: "2-0" },
      { rank: 16, team: "Penn State", record: "2-0" },
      { rank: 17, team: "Iowa", record: "2-0" },
      { rank: 18, team: "Tennessee", record: "2-0" },
      { rank: 19, team: "Oklahoma", record: "1-1" },
      { rank: 20, team: "Houston", record: "2-0" },
      { rank: 21, team: "SMU", record: "2-0" },
      { rank: 22, team: "Washington", record: "2-0" },
      { rank: 23, team: "Florida", record: "2-0" },
      { rank: 24, team: "Missouri", record: "2-0" },
      { rank: 25, team: "TCU", record: "2-0" },
    ],
  },
  {
    week: 4,
    teams: [
      { rank: 1, team: "Texas", record: "3-0" },
      { rank: 2, team: "Oregon", record: "3-0" },
      { rank: 3, team: "Notre Dame", record: "3-0" },
      { rank: 4, team: "Georgia", record: "3-0" },
      { rank: 5, team: "Indiana", record: "3-0" },
      { rank: 6, team: "Miami", record: "3-0" },
      { rank: 7, team: "Ohio State", record: "2-1" },
      { rank: 8, team: "Texas A&M", record: "3-0" },
      { rank: 9, team: "Ole Miss", record: "3-0" },
      { rank: 10, team: "Michigan", record: "3-0" },
      { rank: 11, team: "BYU", record: "3-0" },
      { rank: 12, team: "USC", record: "4-0" },
      { rank: 13, team: "Texas Tech", record: "3-0" },
      { rank: 14, team: "Penn State", record: "3-0" },
      { rank: 15, team: "Iowa", record: "3-0" },
      { rank: 16, team: "Tennessee", record: "3-0" },
      { rank: 17, team: "Oklahoma", record: "2-1" },
      { rank: 18, team: "LSU", record: "2-1" },
      { rank: 19, team: "SMU", record: "3-0" },
      { rank: 20, team: "Washington", record: "3-0" },
      { rank: 21, team: "Florida", record: "3-0" },
      { rank: 22, team: "Missouri", record: "3-0" },
      { rank: 23, team: "TCU", record: "3-0" },
      { rank: 24, team: "South Carolina", record: "3-0" },
      { rank: 25, team: "Alabama", record: "2-1" },
    ],
  },
];
