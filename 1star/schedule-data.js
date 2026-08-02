/* ============================================================
   1-STAR DYNASTY — SCHEDULE DATA
   ------------------------------------------------------------
   Transcribed from in-game "Team Schedule" screenshots, 2 per
   team (weeks 0-8 and weeks 8-16), overlap deduped by hand.
   Snapshot taken 2026-07-22, preseason. Appalachian State was
   added 2026-07-27 from a week 2 snapshot, so its first two rows
   already carry results while the other eight teams' do not.

   All 9 coaches are represented. Every user-vs-user matchup was
   cross-checked against BOTH coaches' screenshots and the
   home/away sides agree in all cases (10 league games total).

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

   TEAM NAMES. The roster names in league-data.js are the short
   location-only names (no mascot) — "Baldwin Wallace", "North
   Shore", "Wawa University", "Westeros", "Patriot Tech",
   "Minneapolis", "New Glarus", "Dillon" — which is also close to
   what the in-game Team Schedule screen shows. Spell them exactly
   that way here so validateData() resolves them without aliases.
   Mascots live in the logo art, not the name.

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
      { week: 1, opponent: "FCS Southeast", location: "vs", teamScore: 38, opponentScore: 10 },
      { week: 2, opponent: "Tulane", location: "at", teamScore: 21, opponentScore: 31 },
      { week: 3, opponent: "Ohio", location: "vs", teamScore: 38, opponentScore: 30 },
      { week: 4, opponent: "North Shore", location: "at", teamScore: 34, opponentScore: 13 },
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
    /* Added 2026-07-27 from Scuba's two Team Schedule screenshots
       (weeks 0-8, weeks 8-16). Both league games check out against
       the other coach's transcription: Baldwin Wallace already had
       week 13 "vs Appalachian State" and Dillon week 9 "vs", and
       this schedule reads "at" for both. The in-game screen renders
       Baldwin Wallace as "BaldwinWallace" with no space; expanded
       here to the roster spelling per the TEAM NAMES note above. */
    team: "Appalachian State",
    conference: "Sun Belt",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "FCS Southeast", location: "vs", teamScore: 28, opponentScore: 7 },
      { week: 2, opponent: "East Carolina", location: "at", teamScore: 28, opponentScore: 24 },
      { week: 3, opponent: "Charlotte", location: "vs", teamScore: 31, opponentScore: 13 },
      { week: 4, opponent: "NC State", location: "at", teamScore: 31, opponentScore: 6 },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Old Dominion", location: "vs" },
      { week: 7, opponent: "Coastal Carolina", location: "at" },
      { week: 8, opponent: "James Madison", location: "vs" },
      { week: 9, opponent: "Dillon", location: "at" },
      { week: 10, opponent: "Georgia State", location: "vs" },
      { week: 11, opponent: "Marshall", location: "at" },
      { week: 12, opponent: "UL Monroe", location: "vs" },
      { week: 13, opponent: "Baldwin Wallace", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "Sun Belt Championship" },
    ],
  },
  {
    team: "Dillon",
    conference: "Sun Belt",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "FCS Southeast", location: "vs", teamScore: 31, opponentScore: 7 },
      { week: 2, opponent: "Wawa University", location: "at", teamScore: 30, opponentScore: 15 },
      { week: 3, opponent: "Jacksonville State", location: "at", teamScore: 24, opponentScore: 21 },
      { week: 4, opponent: "Houston", location: "vs", teamScore: 25, opponentScore: 48 },
      { week: 5, opponent: "Coastal Carolina", location: "at", teamScore: 22, opponentScore: 24 },
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
    team: "Minneapolis",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "South Carolina", location: "at", teamScore: 13, opponentScore: 10 },
      { week: 2, opponent: "FCS Midwest", location: "vs", teamScore: 38, opponentScore: 0 },
      { week: 3, opponent: "Boise State", location: "at", teamScore: 21, opponentScore: 34 },
      { week: 4, opponent: "New Glarus", location: "vs", teamScore: 28, opponentScore: 35 },
      { week: 5, opponent: "Ohio", location: "vs" },
      { week: 6, opponent: "Western Michigan", location: "at" },
      { week: 7, opponent: "USF", location: "at" },
      { week: 8, opponent: "North Shore", location: "vs" },
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
    team: "New Glarus",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Westeros", location: "vs", teamScore: 34, opponentScore: 29 },
      { week: 2, opponent: "FCS Midwest", location: "vs", teamScore: 49, opponentScore: 20 },
      { week: 3, opponent: "Patriot Tech", location: "at", teamScore: 27, opponentScore: 37 },
      { week: 4, opponent: "Minneapolis", location: "at", teamScore: 35, opponentScore: 28 },
      { week: 5, opponent: "Toledo", location: "vs", teamScore: 31, opponentScore: 17 },
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
    team: "North Shore",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Wake Forest", location: "at", teamScore: 13, opponentScore: 37 },
      { week: 2, opponent: "FCS Midwest", location: "vs", teamScore: 42, opponentScore: 7 },
      { week: 3, opponent: "Minnesota", location: "at", teamScore: 15, opponentScore: 21 },
      { week: 4, opponent: "Baldwin Wallace", location: "vs", teamScore: 13, opponentScore: 34 },
      { week: 5, opponent: "Central Michigan", location: "at", teamScore: 55, opponentScore: 24 },
      { week: 6, opponent: "Eastern Michigan", location: "vs" },
      { week: 7, opponent: "Miami University", location: "at" },
      { week: 8, opponent: "Minneapolis", location: "at" },
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
    team: "Patriot Tech",
    conference: "CUSA",
    weeks: [
      { week: 0, opponent: "Missouri State", location: "vs", teamScore: 31, opponentScore: 28 },
      { week: 1, opponent: "James Madison", location: "at", teamScore: 7, opponentScore: 28 },
      { week: 2, opponent: "FCS East", location: "vs", teamScore: 7, opponentScore: 27 },
      { week: 3, opponent: "New Glarus", location: "vs", teamScore: 37, opponentScore: 27 },
      { week: 4, opponent: "Coastal Carolina", location: "at", teamScore: 38, opponentScore: 31 },
      { week: 5, opponent: "Delaware", location: "at", teamScore: 30, opponentScore: 35 },
      { week: 6, opponent: "Sam Houston", location: "vs" },
      { week: 7, opponent: "Westeros", location: "at" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Wawa University", location: "vs" },
      { week: 10, opponent: "New Mexico State", location: "at" },
      { week: 11, opponent: "Middle Tennessee", location: "vs" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Kennesaw State", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "CUSA Championship" },
    ],
  },
  {
    team: "Wawa University",
    conference: "CUSA",
    weeks: [
      { week: 0, opponent: "Kennesaw State", location: "vs", teamScore: 24, opponentScore: 6 },
      { week: 1, opponent: "USF", location: "at", teamScore: 26, opponentScore: 21 },
      { week: 2, opponent: "Dillon", location: "vs", teamScore: 15, opponentScore: 30 },
      { week: 3, opponent: "Florida Atlantic", location: "at", teamScore: 13, opponentScore: 14 },
      { week: 4, opponent: "FCS Southeast", location: "vs", teamScore: 42, opponentScore: 17 },
      { week: 5, opponent: "Jacksonville State", location: "at" },
      { week: 6, note: "BYE" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Middle Tennessee", location: "vs" },
      { week: 9, opponent: "Patriot Tech", location: "at" },
      { week: 10, opponent: "Sam Houston", location: "vs" },
      { week: 11, opponent: "Delaware", location: "at" },
      { week: 12, opponent: "New Mexico State", location: "at" },
      { week: 13, opponent: "Missouri State", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "CUSA Championship" },
    ],
  },
  {
    team: "Westeros",
    conference: "CUSA",
    weeks: [
      { week: 0, opponent: "Delaware", location: "vs", teamScore: 9, opponentScore: 37 },
      { week: 1, opponent: "New Glarus", location: "at", teamScore: 29, opponentScore: 34 },
      { week: 2, opponent: "Georgia Tech", location: "at", teamScore: 24, opponentScore: 27 },
      { week: 3, opponent: "California", location: "at", teamScore: 26, opponentScore: 28 },
      { week: 4, opponent: "FCS Southeast", location: "vs", teamScore: 45, opponentScore: 14 },
      { week: 5, opponent: "Missouri State", location: "vs", teamScore: 35, opponentScore: 17 },
      { week: 6, opponent: "New Mexico State", location: "at" },
      { week: 7, opponent: "Patriot Tech", location: "vs" },
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
