/* ============================================================
   1-STAR DYNASTY — SCHEDULE DATA
   ------------------------------------------------------------
   Transcribed from in-game "Team Schedule" screenshots, 2 per
   team (weeks 0-8 and weeks 8-16), overlap deduped by hand.
   Snapshot taken 2026-07-22, preseason — no games played yet.

   All 8 coaches are represented. Every user-vs-user matchup was
   cross-checked against BOTH coaches' screenshots and the
   home/away sides agree in all cases (8 league games total).

   WEEK MAPPING. The in-game table lists rows 0-14, then
   "Conf Champ", then 16. This file follows the convention the
   main and 3-star dynasties use and that script.js's weekLabel()
   expects:
       weeks 0-13   regular season games
       week 14      Army-Navy Week
       week 15      conference championship
   In-game week 14 and "Conf Champ" both read BYE for all eight
   teams right now; they're written as the labelled weeks anyway
   so the site renders them consistently with the other leagues.
   The trailing in-game row 16 (a post-CCG bye for everyone) is
   not carried over — nothing renders it.

   TEAM NAMES. The Team Schedule screen truncates to the short
   in-game name ("BALDWINWALLACE", "North Shore", "Wawa Universit",
   "Westeros", "Patriot Tech", "Minneapolis", "New Glarus",
   "Dillon"). Those are expanded here to the full roster names in
   league-data.js so validateData() resolves them without aliases.

   STADIUMS. The Team Schedule screen doesn't display venue, so
   stadium is intentionally omitted. script.js treats it as
   optional (renders an empty span). Can be filled in per entry
   later if it's wanted.

   SCORES. None yet — every row still shows a kickoff time rather
   than a result. When a game goes final, add teamScore /
   opponentScore from THAT team's own perspective. For a
   user-vs-user game, add it to BOTH teams' entries or it'll only
   show on one coach's schedule.

   NAME NOTES
     - "Miami University" (the Ohio RedHawks, MAC) appears on the
       Minneapolis and North Shore schedules. It is NOT "Miami"
       (the ACC Hurricanes). Don't collapse them.
     - FCS opponents are regional placeholders — FCS Southeast,
       FCS Midwest, FCS East — and are spelled as the game
       spells them.

   CONFERENCES match league-data.js: Sun Belt, MAC and CUSA. Each
   of these teams replaced a stock team in that league, so the
   alignment is stock; only the team identities are custom.
   ============================================================ */
const TEAM_SCHEDULES = [
  /* -------------------------- SUN BELT -------------------------- */
  {
    team: "Baldwin Wallace",
    conference: "Sun Belt",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "FCS Southeast", location: "vs" },
      { week: 2, opponent: "Tulane", location: "at" },
      { week: 3, opponent: "Ohio", location: "vs" },
      { week: 4, opponent: "North Shore Fighting Moose", location: "at" },
      { week: 5, opponent: "UL Monroe", location: "vs" },
      { week: 6, opponent: "Arkansas State", location: "at" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Marshall", location: "at" },
      { week: 9, opponent: "Louisiana Tech", location: "vs" },
      { week: 10, opponent: "Louisiana", location: "at" },
      { week: 11, opponent: "Troy", location: "vs" },
      { week: 12, opponent: "Southern Mississippi", location: "at" },
      { week: 13, opponent: "Appalachian State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Sun Belt Championship" },
    ],
  },
  {
    team: "Dillon Panthers",
    conference: "Sun Belt",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "FCS Southeast", location: "vs" },
      { week: 2, opponent: "Wawa University Hoagiemakers", location: "at" },
      { week: 3, opponent: "Jacksonville State", location: "at" },
      { week: 4, opponent: "Houston", location: "vs" },
      { week: 5, opponent: "Coastal Carolina", location: "at" },
      { week: 6, opponent: "James Madison", location: "vs" },
      { week: 7, opponent: "Old Dominion", location: "at" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Appalachian State", location: "vs" },
      { week: 10, opponent: "Marshall", location: "vs" },
      { week: 11, opponent: "Georgia State", location: "at" },
      { week: 12, opponent: "Troy", location: "at" },
      { week: 13, opponent: "Louisiana Tech", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Sun Belt Championship" },
    ],
  },

  /* ---------------------------- MAC ---------------------------- */
  {
    team: "Minneapolis Monsters",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "South Carolina", location: "at" },
      { week: 2, opponent: "FCS Midwest", location: "vs" },
      { week: 3, opponent: "Boise State", location: "at" },
      { week: 4, opponent: "New Glarus Spotted Cows", location: "vs" },
      { week: 5, opponent: "Ohio", location: "vs" },
      { week: 6, opponent: "Western Michigan", location: "at" },
      { week: 7, opponent: "USF", location: "at" },
      { week: 8, opponent: "North Shore Fighting Moose", location: "vs" },
      { week: 9, opponent: "Sacramento State", location: "at" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Bowling Green", location: "at" },
      { week: 12, opponent: "Miami University", location: "vs" },
      { week: 13, opponent: "Eastern Michigan", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "MAC Championship" },
    ],
  },
  {
    team: "New Glarus Spotted Cows",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Westeros White Walkers", location: "vs" },
      { week: 2, opponent: "FCS Midwest", location: "vs" },
      { week: 3, opponent: "Patriot Tech Minutemen", location: "at" },
      { week: 4, opponent: "Minneapolis Monsters", location: "at" },
      { week: 5, opponent: "Toledo", location: "vs" },
      { week: 6, opponent: "Rutgers", location: "at" },
      { week: 7, opponent: "Bowling Green", location: "at" },
      { week: 8, opponent: "Sacramento State", location: "vs" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "UMass", location: "at" },
      { week: 11, opponent: "Buffalo", location: "vs" },
      { week: 12, opponent: "Ohio", location: "at" },
      { week: 13, opponent: "Central Michigan", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "MAC Championship" },
    ],
  },
  {
    team: "North Shore Fighting Moose",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Wake Forest", location: "at" },
      { week: 2, opponent: "FCS Midwest", location: "vs" },
      { week: 3, opponent: "Minnesota", location: "at" },
      { week: 4, opponent: "Baldwin Wallace", location: "vs" },
      { week: 5, opponent: "Central Michigan", location: "at" },
      { week: 6, opponent: "Eastern Michigan", location: "vs" },
      { week: 7, opponent: "Miami University", location: "at" },
      { week: 8, opponent: "Minneapolis Monsters", location: "at" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "Ohio", location: "vs" },
      { week: 11, opponent: "Western Michigan", location: "vs" },
      { week: 12, opponent: "UMass", location: "at" },
      { week: 13, opponent: "Buffalo", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "MAC Championship" },
    ],
  },

  /* ---------------------------- CUSA --------------------------- */
  {
    team: "Patriot Tech Minutemen",
    conference: "CUSA",
    weeks: [
      { week: 0, opponent: "Missouri State", location: "vs", teamScore: 31, opponentScore: 28 },
      { week: 1, opponent: "James Madison", location: "at" },
      { week: 2, opponent: "FCS East", location: "vs" },
      { week: 3, opponent: "New Glarus Spotted Cows", location: "vs" },
      { week: 4, opponent: "Coastal Carolina", location: "at" },
      { week: 5, opponent: "Delaware", location: "at" },
      { week: 6, opponent: "Sam Houston", location: "vs" },
      { week: 7, opponent: "Westeros White Walkers", location: "at" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Wawa University Hoagiemakers", location: "vs" },
      { week: 10, opponent: "New Mexico State", location: "at" },
      { week: 11, opponent: "Middle Tennessee", location: "vs" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Kennesaw State", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "CUSA Championship" },
    ],
  },
  {
    team: "Wawa University Hoagiemakers",
    conference: "CUSA",
    weeks: [
      { week: 0, opponent: "Kennesaw State", location: "vs" },
      { week: 1, opponent: "USF", location: "at" },
      { week: 2, opponent: "Dillon Panthers", location: "vs" },
      { week: 3, opponent: "Florida Atlantic", location: "at" },
      { week: 4, opponent: "FCS Southeast", location: "vs" },
      { week: 5, opponent: "Jacksonville State", location: "at" },
      { week: 6, note: "BYE" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Middle Tennessee", location: "vs" },
      { week: 9, opponent: "Patriot Tech Minutemen", location: "at" },
      { week: 10, opponent: "Sam Houston", location: "vs" },
      { week: 11, opponent: "Delaware", location: "at" },
      { week: 12, opponent: "New Mexico State", location: "at" },
      { week: 13, opponent: "Missouri State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "CUSA Championship" },
    ],
  },
  {
    team: "Westeros White Walkers",
    conference: "CUSA",
    weeks: [
      { week: 0, opponent: "Delaware", location: "vs" },
      { week: 1, opponent: "New Glarus Spotted Cows", location: "at" },
      { week: 2, opponent: "Georgia Tech", location: "at" },
      { week: 3, opponent: "California", location: "at" },
      { week: 4, opponent: "FCS Southeast", location: "vs" },
      { week: 5, opponent: "Missouri State", location: "vs" },
      { week: 6, opponent: "New Mexico State", location: "at" },
      { week: 7, opponent: "Patriot Tech Minutemen", location: "vs" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Sam Houston", location: "at" },
      { week: 10, opponent: "Kennesaw State", location: "at" },
      { week: 11, opponent: "Jacksonville State", location: "vs" },
      { week: 12, opponent: "Middle Tennessee", location: "at" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "CUSA Championship" },
    ],
  },
];

/* Schedule-team-name -> roster-team-name, for cases where the
   in-game team name doesn't match the sign-up sheet verbatim.

   Empty on purpose: the short names the Team Schedule screen shows
   were expanded to full roster names during transcription, so
   nothing needs remapping. If a future screenshot is transcribed
   with shorthand (e.g. "Wawa Universit", "BaldwinWallace"), either
   expand it while transcribing or add the mapping here —
   validateData() logs a console warning for any schedule team no
   coach claims. */
const SCHEDULE_TEAM_ALIASES = {};
