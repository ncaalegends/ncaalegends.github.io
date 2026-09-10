/* ============================================================
   1-STAR DYNASTY — SCHEDULE DATA
   ------------------------------------------------------------
   2027 SEASON. Transcribed from in-game "Team Schedule"
   screenshots, 2 per team (weeks 0-8 and weeks 7-"Conf Champ"),
   overlap deduped by hand. Snapshot taken 2027 preseason, before
   any week 0 game — no team has a week 0 opponent this year, and
   no row carries a result yet.

   All 9 coaches are represented. Every user-vs-user matchup was
   cross-checked against BOTH coaches' screenshots and the
   home/away sides agree in all cases (9 league games total):
   North Shore-Baldwin Wallace w1, Wawa-Westeros w1, Dillon-Patriot
   Tech w3, New Glarus-Westeros w3, Patriot Tech-Westeros w4,
   Minneapolis-North Shore w11, Patriot Tech-Wawa w12, New
   Glarus-North Shore w13, Dillon-Appalachian State w13.

   In-game AP ranks shown beside opponents (20 South Carolina, 17
   Nebraska, 22 Colorado, 16 Duke, 18 Virginia, 24 Boise State, 15
   Louisville, 11 BYU) are preseason and not carried over — the
   site takes ranks from top25-data.js, not from schedule rows.

   WEEK MAPPING. The in-game table lists rows 0-14, then
   "Conf Champ", then 16. This file follows the convention the
   main and 3-star dynasties use and that script.js's weekLabel()
   expects:
       weeks 0-13   regular season games
       week 14      Army-Navy Week
       week 15      conference championship
       weeks 16-19  Bowl Weeks 1-4 (CFP rounds + bowls)

   THE POSTSEASON LIVES HERE TOO — weeks 15-19. A conference
   championship, a bowl or a CFP round that a COACHED team played is
   an ordinary row on that team's schedule, with three optional extra
   fields:

     neutral: true      no true home team. home/away still decide
                        which score is which; the row renders "VS" at
                        the named stadium rather than claiming "AT".
     title: "Rose Bowl" the game's own name. Replaces the week number
                        in the schedule row and the card footer.
     round: "cfp-qf"    the machine-readable round id. One of:
                        ccg, bowl-w1, bowl-w2,
                        cfp-r1, cfp-qf, cfp-sf, cfp-nc

   `round` IS LOAD-BEARING AND `title` IS NOT. Conference titles, CFP
   appearances and national championships on the roster cards are
   derived by matching `round`; a bowl game with a title and no round
   renders correctly and earns nothing. The round is never inferred
   from the title, because a sponsor renaming a bowl would silently
   stop counting it.

     { week: 17, opponent: "Miami", location: "vs", neutral: true,
       stadium: "AT&T Stadium", title: "Cotton Bowl", round: "cfp-qf",
       teamScore: 31, opponentScore: 24 }

   A game between two teams NOBODY coaches — most of the CFP bracket
   — has no coach's schedule to live on and goes in
   postseason-data.js instead.
   In-game week 14 and "Conf Champ" both read BYE for all nine
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
      { week: 1, opponent: "North Shore", location: "at", teamScore: 7, opponentScore: 14 },
      { week: 2, opponent: "South Carolina", location: "at" },
      { week: 3, opponent: "Ohio", location: "vs" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Ole Miss", location: "at" },
      { week: 6, opponent: "Southern Mississippi", location: "vs" },
      { week: 7, opponent: "Old Dominion", location: "vs" },
      { week: 8, opponent: "Troy", location: "at" },
      { week: 9, opponent: "Marshall", location: "at" },
      { week: 10, opponent: "Louisiana", location: "vs" },
      { week: 11, opponent: "Louisiana Tech", location: "at" },
      { week: 12, opponent: "Arkansas State", location: "vs" },
      { week: 13, opponent: "UL Monroe", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
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
      { week: 1, opponent: "FCS Northwest", location: "vs", teamScore: 52, opponentScore: 0 },
      { week: 2, opponent: "Charlotte", location: "at", teamScore: 49, opponentScore: 17 },
      { week: 3, opponent: "Memphis", location: "vs" },
      { week: 4, opponent: "Northern Illinois", location: "vs" },
      { week: 5, opponent: "Coastal Carolina", location: "vs" },
      { week: 6, opponent: "Georgia State", location: "at" },
      { week: 7, opponent: "Southern Mississippi", location: "at" },
      { week: 8, opponent: "Marshall", location: "vs" },
      { week: 9, opponent: "Louisiana Tech", location: "vs" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Old Dominion", location: "at" },
      { week: 12, opponent: "James Madison", location: "at" },
      { week: 13, opponent: "Dillon", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Dillon",
    conference: "Sun Belt",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "UNLV", location: "vs", teamScore: 30, opponentScore: 13 },
      { week: 2, opponent: "Nebraska", location: "vs", teamScore: 6, opponentScore: 41 },
      { week: 3, opponent: "Patriot Tech", location: "at" },
      { week: 4, opponent: "FCS East", location: "vs" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "James Madison", location: "at" },
      { week: 7, opponent: "Georgia State", location: "vs" },
      { week: 8, opponent: "Old Dominion", location: "vs" },
      { week: 9, opponent: "Coastal Carolina", location: "vs" },
      { week: 10, opponent: "Troy", location: "at" },
      { week: 11, opponent: "Marshall", location: "at" },
      { week: 12, opponent: "UL Monroe", location: "vs" },
      { week: 13, opponent: "Appalachian State", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },

  /* ---------------------------- MAC ---------------------------- */
  {
    team: "Minneapolis",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Minnesota", location: "vs", teamScore: 17, opponentScore: 10 },
      { week: 2, opponent: "Southern Mississippi", location: "vs", teamScore: 7, opponentScore: 14 },
      { week: 3, opponent: "Colorado", location: "at" },
      { week: 4, opponent: "UMass", location: "vs" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Toledo", location: "vs" },
      { week: 7, opponent: "Central Michigan", location: "at" },
      { week: 8, opponent: "Buffalo", location: "at" },
      { week: 9, opponent: "Eastern Michigan", location: "vs" },
      { week: 10, opponent: "Missouri", location: "at" },
      { week: 11, opponent: "North Shore", location: "vs" },
      { week: 12, opponent: "Miami University", location: "at" },
      { week: 13, opponent: "Western Michigan", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "New Glarus",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Arkansas", location: "at", teamScore: 25, opponentScore: 24 },
      { week: 2, opponent: "Duke", location: "vs", teamScore: 7, opponentScore: 28 },
      { week: 3, opponent: "Westeros", location: "at" },
      { week: 4, opponent: "Army", location: "at" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Sacramento State", location: "vs" },
      { week: 7, opponent: "Miami University", location: "vs" },
      { week: 8, opponent: "Bowling Green", location: "vs" },
      { week: 9, opponent: "Western Michigan", location: "at" },
      { week: 10, opponent: "Toledo", location: "at" },
      { week: 11, opponent: "Ohio", location: "at" },
      { week: 12, opponent: "Central Michigan", location: "at" },
      { week: 13, opponent: "North Shore", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Shore",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Baldwin Wallace", location: "vs", teamScore: 14, opponentScore: 7 },
      { week: 2, opponent: "Vanderbilt", location: "at" },
      { week: 3, opponent: "FCS Midwest", location: "vs" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Virginia", location: "at" },
      { week: 6, opponent: "Western Michigan", location: "vs" },
      { week: 7, opponent: "Ohio", location: "vs" },
      { week: 8, opponent: "UMass", location: "vs" },
      { week: 9, opponent: "Bowling Green", location: "vs" },
      { week: 10, opponent: "Sacramento State", location: "at" },
      { week: 11, opponent: "Minneapolis", location: "at" },
      { week: 12, opponent: "Eastern Michigan", location: "at" },
      { week: 13, opponent: "New Glarus", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },

  /* ---------------------------- CUSA --------------------------- */
  {
    team: "Patriot Tech",
    conference: "CUSA",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Boise State", location: "at", teamScore: 13, opponentScore: 27 },
      { week: 2, opponent: "FCS Southeast", location: "vs", teamScore: 28, opponentScore: 17 },
      { week: 3, opponent: "Dillon", location: "vs" },
      { week: 4, opponent: "Westeros", location: "vs" },
      { week: 5, opponent: "Missouri State", location: "vs" },
      { week: 6, opponent: "Delaware", location: "at" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Middle Tennessee", location: "at" },
      { week: 9, opponent: "Jacksonville State", location: "at" },
      { week: 10, opponent: "Kennesaw State", location: "vs" },
      { week: 11, opponent: "Virginia Tech", location: "at" },
      { week: 12, opponent: "Wawa University", location: "vs" },
      { week: 13, opponent: "New Mexico State", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wawa University",
    conference: "CUSA",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Westeros", location: "vs", teamScore: 33, opponentScore: 15 },
      { week: 2, opponent: "Louisville", location: "at" },
      { week: 3, opponent: "Florida Atlantic", location: "vs" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "FCS East", location: "vs" },
      { week: 6, opponent: "Missouri State", location: "vs" },
      { week: 7, opponent: "Marshall", location: "at" },
      { week: 8, opponent: "Delaware", location: "at" },
      { week: 9, opponent: "New Mexico State", location: "vs" },
      { week: 10, opponent: "Middle Tennessee", location: "vs" },
      { week: 11, opponent: "Sam Houston", location: "at" },
      { week: 12, opponent: "Patriot Tech", location: "at" },
      { week: 13, opponent: "Kennesaw State", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Westeros",
    conference: "CUSA",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Wawa University", location: "at", teamScore: 15, opponentScore: 33 },
      { week: 2, opponent: "FCS East", location: "vs" },
      { week: 3, opponent: "New Glarus", location: "vs" },
      { week: 4, opponent: "Patriot Tech", location: "at" },
      { week: 5, opponent: "BYU", location: "at" },
      { week: 6, opponent: "Kennesaw State", location: "at" },
      { week: 7, opponent: "Sam Houston", location: "vs" },
      { week: 8, opponent: "Arizona State", location: "at" },
      { week: 9, opponent: "Delaware", location: "vs" },
      { week: 10, opponent: "New Mexico State", location: "at" },
      { week: 11, opponent: "Jacksonville State", location: "vs" },
      { week: 12, opponent: "Middle Tennessee", location: "vs" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
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
