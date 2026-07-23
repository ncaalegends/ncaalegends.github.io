/* ============================================================
   3-STAR DYNASTY — SCHEDULE DATA
   ------------------------------------------------------------
   Transcribed from in-game "Team Schedule" screenshots, 2 per
   team (weeks 0-8 and weeks 8-16), overlap deduped by hand.
   Snapshot taken 2026-07-21, mid Week 0.

   All 15 coaches are represented. Every user-vs-user matchup was
   cross-checked against BOTH coaches' screenshots and the home/away
   sides agree in all cases.

   WEEK MAPPING. The in-game table lists rows 0-14, then
   "Conf Champ", then 16. This file follows the convention the
   main dynasty already uses and that script.js's weekLabel()
   expects:
       weeks 0-13   regular season games
       week 14      Army-Navy Week
       week 15      conference championship
   The trailing in-game row 16 (a post-CCG bye for everyone) is
   not carried over — nothing renders it.

   STADIUMS. The Team Schedule screen doesn't display venue, so
   stadium is intentionally omitted. script.js treats it as
   optional (renders an empty span), so the site is happy without
   it. Can be filled in per entry later if it's wanted.

   SCORES. Week 0 finals are recorded as teamScore/opponentScore
   from that team's own perspective. Every week 0 result so far is
   against a CPU opponent, so there's no second entry to keep in
   sync. Once a user-vs-user game goes final, add the score to BOTH
   teams' entries or it'll only show on one coach's schedule.

   NAME NOTE: Pittsburgh's week 1 opponent is "Miami University"
   (the Ohio RedHawks) — distinct from "Miami" (the ACC Hurricanes),
   who appear on the North Carolina, Pittsburgh and Virginia Tech
   schedules. Both are spelled as the game spells them; don't
   collapse them into one name.

   CONFERENCES use this league's custom realignment, matching
   league-data.js (ACC / SEC / XII / B1G) — James Madison, North
   Texas, Charlotte and North Dakota State really are in the SEC
   here. Don't "correct" them to stock alignment.
   ============================================================ */
const TEAM_SCHEDULES = [
  /* ---------------------------- ACC ---------------------------- */
  {
    team: "California",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "Nevada", location: "vs", teamScore: 52, opponentScore: 24 },
      { week: 1, opponent: "UCLA", location: "vs", teamScore: 23, opponentScore: 20 },
      { week: 2, opponent: "Syracuse", location: "at" },
      { week: 3, opponent: "FCS West", location: "vs" },
      { week: 4, opponent: "Clemson", location: "vs" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Virginia Tech", location: "vs" },
      { week: 7, opponent: "Wake Forest", location: "vs" },
      { week: 8, opponent: "SMU", location: "at" },
      { week: 9, opponent: "NC State", location: "at" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Virginia", location: "at" },
      { week: 12, opponent: "Stanford", location: "vs" },
      { week: 13, opponent: "Pittsburgh", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "ACC Championship" },
    ],
  },
  {
    team: "North Carolina",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "TCU", location: "vs", teamScore: 38, opponentScore: 28 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "FCS Southeast", location: "vs" },
      { week: 3, opponent: "Clemson", location: "at" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Notre Dame", location: "vs" },
      { week: 6, opponent: "Pittsburgh", location: "at" },
      { week: 7, opponent: "Duke", location: "at" },
      { week: 8, opponent: "Syracuse", location: "vs" },
      { week: 9, opponent: "Miami", location: "vs" },
      { week: 10, opponent: "UConn", location: "at" },
      { week: 11, opponent: "Louisville", location: "vs" },
      { week: 12, opponent: "Virginia", location: "at" },
      { week: 13, opponent: "NC State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "ACC Championship" },
    ],
  },
  {
    team: "Pittsburgh",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "West Virginia", location: "vs", teamScore: 37, opponentScore: 13 },
      { week: 1, opponent: "Miami University", location: "vs", teamScore: 28, opponentScore: 0 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Syracuse", location: "vs" },
      { week: 4, opponent: "FCS East", location: "vs" },
      { week: 5, opponent: "Virginia Tech", location: "at" },
      { week: 6, opponent: "North Carolina", location: "vs" },
      { week: 7, opponent: "Boston College", location: "at" },
      { week: 8, opponent: "Miami", location: "at" },
      { week: 9, opponent: "Georgia Tech", location: "vs" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Florida State", location: "vs" },
      { week: 12, opponent: "Louisville", location: "at" },
      { week: 13, opponent: "California", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "ACC Championship" },
    ],
  },
  {
    team: "Virginia Tech",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "Western Michigan", location: "vs", teamScore: 24, opponentScore: 34 },
      { week: 1, opponent: "FCS East", location: "vs", teamScore: 49, opponentScore: 0 },
      { week: 2, opponent: "Old Dominion", location: "vs" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Boston College", location: "at" },
      { week: 5, opponent: "Pittsburgh", location: "vs" },
      { week: 6, opponent: "California", location: "at" },
      { week: 7, opponent: "Georgia Tech", location: "vs" },
      { week: 8, opponent: "Clemson", location: "at" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "SMU", location: "at" },
      { week: 11, opponent: "Stanford", location: "vs" },
      { week: 12, opponent: "Miami", location: "at" },
      { week: 13, opponent: "Virginia", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "ACC Championship" },
    ],
  },

  /* ---------------------------- B1G ---------------------------- */
  {
    team: "Maryland",
    conference: "B1G",
    weeks: [
      { week: 0, opponent: "Marshall", location: "vs", teamScore: 38, opponentScore: 10 },
      { week: 1, opponent: "FCS East", location: "vs", teamScore: 73, opponentScore: 3 },
      { week: 2, opponent: "Utah", location: "vs" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "UCLA", location: "vs" },
      { week: 5, opponent: "Nebraska", location: "at" },
      { week: 6, opponent: "Ohio State", location: "at" },
      { week: 7, opponent: "Rutgers", location: "vs" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Illinois", location: "vs" },
      { week: 10, opponent: "Purdue", location: "at" },
      { week: 11, opponent: "Wisconsin", location: "vs" },
      { week: 12, opponent: "USC", location: "at" },
      { week: 13, opponent: "Penn State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big Ten Championship" },
    ],
  },
  {
    team: "Rutgers",
    conference: "B1G",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "UMass", location: "vs" },
      { week: 2, opponent: "Boston College", location: "at" },
      { week: 3, opponent: "USC", location: "vs" },
      { week: 4, opponent: "FCS East", location: "vs" },
      { week: 5, opponent: "Indiana", location: "vs" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Maryland", location: "at" },
      { week: 8, opponent: "Northwestern", location: "at" },
      { week: 9, opponent: "Michigan", location: "vs" },
      { week: 10, opponent: "Wisconsin", location: "at" },
      { week: 11, opponent: "Nebraska", location: "vs" },
      { week: 12, opponent: "Penn State", location: "at" },
      { week: 13, opponent: "Michigan State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big Ten Championship" },
    ],
  },
  {
    team: "Wisconsin",
    conference: "B1G",
    weeks: [
      { week: 0, opponent: "UConn", location: "vs", teamScore: 49, opponentScore: 10 },
      { week: 1, opponent: "Notre Dame", location: "at", teamScore: 27, opponentScore: 24 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Eastern Michigan", location: "vs" },
      { week: 4, opponent: "Penn State", location: "at" },
      { week: 5, opponent: "Michigan State", location: "vs" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "UCLA", location: "at" },
      { week: 8, opponent: "USC", location: "vs" },
      { week: 9, opponent: "Iowa", location: "at" },
      { week: 10, opponent: "Rutgers", location: "vs" },
      { week: 11, opponent: "Maryland", location: "at" },
      { week: 12, opponent: "Purdue", location: "at" },
      { week: 13, opponent: "Minnesota", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big Ten Championship" },
    ],
  },

  /* ---------------------------- XII ---------------------------- */
  {
    team: "Baylor",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "Troy", location: "vs", teamScore: 42, opponentScore: 7 },
      { week: 1, opponent: "Auburn", location: "at", teamScore: 31, opponentScore: 7 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Louisiana Tech", location: "vs" },
      { week: 4, opponent: "Colorado", location: "vs" },
      { week: 5, opponent: "Arizona State", location: "at" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "TCU", location: "vs" },
      { week: 8, opponent: "Kansas", location: "at" },
      { week: 9, opponent: "UCF", location: "at" },
      { week: 10, opponent: "Iowa State", location: "vs" },
      { week: 11, opponent: "BYU", location: "at" },
      { week: 12, opponent: "Texas Tech", location: "vs" },
      { week: 13, opponent: "Houston", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big 12 Championship" },
    ],
  },
  {
    team: "Colorado",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "Utah State", location: "vs", teamScore: 45, opponentScore: 16 },
      { week: 1, opponent: "Georgia Tech", location: "at", teamScore: 42, opponentScore: 24 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Northwestern", location: "at" },
      { week: 4, opponent: "Baylor", location: "at" },
      { week: 5, opponent: "Texas Tech", location: "vs" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Utah", location: "vs" },
      { week: 8, opponent: "Oklahoma State", location: "at" },
      { week: 9, opponent: "Kansas State", location: "vs" },
      { week: 10, opponent: "Arizona State", location: "at" },
      { week: 11, opponent: "Houston", location: "vs" },
      { week: 12, opponent: "Cincinnati", location: "at" },
      { week: 13, opponent: "UCF", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big 12 Championship" },
    ],
  },
  {
    team: "Iowa State",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "Toledo", location: "vs", teamScore: 27, opponentScore: 6 },
      { week: 1, opponent: "FCS Midwest", location: "vs", teamScore: 38, opponentScore: 22 },
      { week: 2, opponent: "Iowa", location: "at" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Utah", location: "vs" },
      { week: 5, opponent: "West Virginia", location: "vs" },
      { week: 6, opponent: "BYU", location: "at" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Arizona", location: "at" },
      { week: 9, opponent: "Oklahoma State", location: "vs" },
      { week: 10, opponent: "Baylor", location: "at" },
      { week: 11, opponent: "Cincinnati", location: "vs" },
      { week: 12, opponent: "UCF", location: "at" },
      { week: 13, opponent: "Kansas State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big 12 Championship" },
    ],
  },
  {
    team: "UCF",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "USF", location: "vs", teamScore: 28, opponentScore: 21 },
      { week: 1, opponent: "FCS Southeast", location: "vs", teamScore: 38, opponentScore: 7 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Georgia State", location: "vs" },
      { week: 4, opponent: "TCU", location: "vs" },
      { week: 5, opponent: "Houston", location: "at" },
      { week: 6, opponent: "Oklahoma State", location: "at" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "BYU", location: "vs" },
      { week: 9, opponent: "Baylor", location: "vs" },
      { week: 10, opponent: "Kansas", location: "at" },
      { week: 11, opponent: "Arizona State", location: "vs" },
      { week: 12, opponent: "Iowa State", location: "vs" },
      { week: 13, opponent: "Colorado", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Big 12 Championship" },
    ],
  },

  /* ---------------------------- SEC ---------------------------- */
  {
    team: "Charlotte",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Tulsa", location: "vs", teamScore: 33, opponentScore: 14 },
      { week: 1, opponent: "Georgia", location: "at", teamScore: 7, opponentScore: 52 },
      { week: 2, opponent: "Ole Miss", location: "at" },
      { week: 3, opponent: "FCS Southeast", location: "vs" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "James Madison", location: "vs" },
      { week: 6, opponent: "Oklahoma", location: "vs" },
      { week: 7, opponent: "North Dakota State", location: "vs" },
      { week: 8, opponent: "Arkansas", location: "at" },
      { week: 9, opponent: "Texas", location: "at" },
      { week: 10, opponent: "UAB", location: "vs" },
      { week: 11, opponent: "Florida", location: "vs" },
      { week: 12, opponent: "LSU", location: "at" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "SEC Championship" },
    ],
  },
  {
    team: "James Madison",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Southern Mississippi", location: "at", teamScore: 42, opponentScore: 24 },
      { week: 1, opponent: "Liberty", location: "vs", teamScore: 44, opponentScore: 14 },
      { week: 2, opponent: "LSU", location: "vs" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Auburn", location: "vs" },
      { week: 5, opponent: "Charlotte", location: "at" },
      { week: 6, opponent: "Alabama", location: "at" },
      { week: 7, opponent: "Ole Miss", location: "vs" },
      { week: 8, opponent: "North Texas", location: "at" },
      { week: 9, opponent: "Tennessee", location: "vs" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "UConn", location: "at" },
      { week: 12, opponent: "Georgia", location: "at" },
      { week: 13, opponent: "Oklahoma", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "SEC Championship" },
    ],
  },
  {
    team: "North Dakota State",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Jacksonville State", location: "vs", teamScore: 40, opponentScore: 14 },
      { week: 1, opponent: "Oklahoma", location: "vs", teamScore: 48, opponentScore: 17 },
      { week: 2, opponent: "Georgia", location: "vs" },
      { week: 3, opponent: "FCS Northwest", location: "vs" },
      { week: 4, opponent: "North Texas", location: "at" },
      { week: 5, opponent: "Texas", location: "vs" },
      { week: 6, opponent: "Auburn", location: "at" },
      { week: 7, opponent: "Charlotte", location: "at" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Kentucky", location: "at" },
      { week: 10, opponent: "Tennessee", location: "at" },
      { week: 11, opponent: "Arkansas", location: "vs" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Hawai'i", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "SEC Championship" },
    ],
  },
  {
    team: "North Texas",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Indiana", location: "at", teamScore: 37, opponentScore: 26 },
      { week: 1, opponent: "Tennessee", location: "vs", teamScore: 45, opponentScore: 28 },
      { week: 2, opponent: "Texas A&M", location: "at" },
      { week: 3, opponent: "Ole Miss", location: "at" },
      { week: 4, opponent: "North Dakota State", location: "vs" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Arkansas", location: "at" },
      { week: 7, opponent: "LSU", location: "vs" },
      { week: 8, opponent: "James Madison", location: "vs" },
      { week: 9, opponent: "Tulane", location: "at" },
      { week: 10, opponent: "Rice", location: "vs" },
      { week: 11, opponent: "Kentucky", location: "at" },
      { week: 12, opponent: "Florida", location: "vs" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "SEC Championship" },
    ],
  },
];

/* Schedule-team-name -> roster-team-name, for cases where the
   in-game team name doesn't match the sign-up sheet verbatim.

   Empty on purpose: every team above is written with the same
   expanded name league-data.js uses, so nothing needs remapping.
   If a future screenshot is transcribed with shorthand (e.g. "Cal",
   "NDSU", "VA Tech"), either expand it while transcribing or add
   the mapping here — validateData() logs a console warning for any
   schedule team no coach claims. */
const SCHEDULE_TEAM_ALIASES = {};
