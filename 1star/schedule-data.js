/* ============================================================
   1-STAR DYNASTY — SCHEDULE DATA
   ------------------------------------------------------------
   2028 SEASON. Transcribed 2026-10-28 from in-game "Custom
   Schedule" screenshots, 2 per team (weeks 0-8 and weeks 7-15),
   overlap deduped. These are the league owner's final schedules —
   transcribed as shown, nothing moved or swapped. Snapshot taken
   2028 preseason; no row carries a result yet.

   All 9 coaches are represented. Every user-vs-user matchup was
   cross-checked against BOTH coaches' screenshots and the
   home/away sides agree in all cases (10 league games total):
   New Glarus-Westeros w3, Patriot Tech-Westeros w5, Wawa-Westeros
   w6, Minneapolis-North Shore w9, Baldwin Wallace-Appalachian
   State w9, North Shore-New Glarus w10, Dillon-Baldwin Wallace
   w12, Dillon-Appalachian State w13, Minneapolis-New Glarus w13,
   Patriot Tech-Wawa w13. Seven coaches have two league games;
   New Glarus and Westeros have three.

   North Shore's week 4 "FCS West" is on the final schedule and is
   kept as the game spells it.

   In-game AP ranks shown beside opponents are preseason and not
   carried over — the site takes ranks from top25-data.js.

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
   Week 14 (Army-Navy Week) and week 15 (conference championship)
   are written as note rows for all nine teams; nobody has
   qualified for a championship yet, so week 15 is "BYE".

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
      { week: 0, opponent: "California", location: "vs" },
      { week: 1, opponent: "Ole Miss", location: "at" },
      { week: 2, opponent: "Middle Tennessee", location: "at" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "James Madison", location: "vs" },
      { week: 5, opponent: "Old Dominion", location: "at" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Coastal Carolina", location: "vs" },
      { week: 8, opponent: "Louisiana", location: "at" },
      { week: 9, opponent: "Appalachian State", location: "at" },
      { week: 10, opponent: "Marshall", location: "vs" },
      { week: 11, opponent: "UL Monroe", location: "at" },
      { week: 12, opponent: "Dillon", location: "at" },
      { week: 13, opponent: "UConn", location: "vs" },
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
      { week: 1, opponent: "Duke", location: "vs" },
      { week: 2, opponent: "James Madison", location: "at" },
      { week: 3, opponent: "Charlotte", location: "vs" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "NC State", location: "vs" },
      { week: 6, opponent: "Coastal Carolina", location: "vs" },
      { week: 7, opponent: "Troy", location: "vs" },
      { week: 8, opponent: "Texas Tech", location: "at" },
      { week: 9, opponent: "Baldwin Wallace", location: "vs" },
      { week: 10, opponent: "UL Monroe", location: "vs" },
      { week: 11, opponent: "Old Dominion", location: "at" },
      { week: 12, opponent: "Georgia State", location: "vs" },
      { week: 13, opponent: "Dillon", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Dillon",
    conference: "Sun Belt",
    weeks: [
      { week: 0, opponent: "Cincinnati", location: "at" },
      { week: 1, opponent: "Auburn", location: "at" },
      { week: 2, opponent: "Michigan", location: "vs" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Boston College", location: "vs" },
      { week: 5, opponent: "Louisiana Tech", location: "at" },
      { week: 6, opponent: "Marshall", location: "vs" },
      { week: 7, opponent: "UL Monroe", location: "vs" },
      { week: 8, opponent: "Troy", location: "vs" },
      { week: 9, opponent: "Coastal Carolina", location: "at" },
      { week: 10, opponent: "Southern Mississippi", location: "at" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Baldwin Wallace", location: "vs" },
      { week: 13, opponent: "Appalachian State", location: "vs" },
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
      { week: 1, opponent: "Army", location: "vs" },
      { week: 2, opponent: "Kentucky", location: "at" },
      { week: 3, opponent: "Rutgers", location: "at" },
      { week: 4, opponent: "Arizona State", location: "vs" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Toledo", location: "vs" },
      { week: 7, opponent: "Sacramento State", location: "vs" },
      { week: 8, opponent: "Miami University", location: "vs" },
      { week: 9, opponent: "North Shore", location: "vs" },
      { week: 10, opponent: "UMass", location: "at" },
      { week: 11, opponent: "Bowling Green", location: "at" },
      { week: 12, opponent: "Ohio", location: "at" },
      { week: 13, opponent: "New Glarus", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "New Glarus",
    conference: "MAC",
    weeks: [
      { week: 0, opponent: "Iowa State", location: "vs" },
      { week: 1, opponent: "Florida State", location: "at" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Westeros", location: "at" },
      { week: 4, opponent: "Central Michigan", location: "at" },
      { week: 5, opponent: "Buffalo", location: "vs" },
      { week: 6, opponent: "SMU", location: "vs" },
      { week: 7, opponent: "Western Michigan", location: "at" },
      { week: 8, opponent: "Eastern Michigan", location: "vs" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "North Shore", location: "at" },
      { week: 11, opponent: "Toledo", location: "at" },
      { week: 12, opponent: "Sacramento State", location: "vs" },
      { week: 13, opponent: "Minneapolis", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Shore",
    conference: "MAC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Eastern Michigan", location: "at" },
      { week: 2, opponent: "Arkansas", location: "at" },
      { week: 3, opponent: "West Virginia", location: "at" },
      { week: 4, opponent: "FCS West", location: "vs" },
      { week: 5, opponent: "Central Michigan", location: "at" },
      { week: 6, opponent: "Arkansas State", location: "at" },
      { week: 7, opponent: "Buffalo", location: "at" },
      { week: 8, opponent: "Western Michigan", location: "vs" },
      { week: 9, opponent: "Minneapolis", location: "at" },
      { week: 10, opponent: "New Glarus", location: "vs" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Miami University", location: "vs" },
      { week: 13, opponent: "Ohio", location: "vs" },
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
      { week: 1, note: "BYE" },
      { week: 2, opponent: "East Carolina", location: "vs" },
      { week: 3, opponent: "Boise State", location: "at" },
      { week: 4, opponent: "Louisiana", location: "vs" },
      { week: 5, opponent: "Westeros", location: "vs" },
      { week: 6, opponent: "BYU", location: "vs" },
      { week: 7, opponent: "Missouri State", location: "at" },
      { week: 8, opponent: "Delaware", location: "at" },
      { week: 9, opponent: "New Mexico State", location: "at" },
      { week: 10, opponent: "Jacksonville State", location: "at" },
      { week: 11, opponent: "Kennesaw State", location: "vs" },
      { week: 12, opponent: "Middle Tennessee", location: "vs" },
      { week: 13, opponent: "Wawa University", location: "at" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wawa University",
    conference: "CUSA",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Utah", location: "at" },
      { week: 2, opponent: "Central Michigan", location: "vs" },
      { week: 3, opponent: "Florida Atlantic", location: "at" },
      { week: 4, opponent: "Minnesota", location: "vs" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Westeros", location: "at" },
      { week: 7, opponent: "Sam Houston", location: "vs" },
      { week: 8, opponent: "New Mexico State", location: "vs" },
      { week: 9, opponent: "Missouri State", location: "at" },
      { week: 10, opponent: "Middle Tennessee", location: "vs" },
      { week: 11, opponent: "Jacksonville State", location: "at" },
      { week: 12, opponent: "Kennesaw State", location: "vs" },
      { week: 13, opponent: "Patriot Tech", location: "vs" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Westeros",
    conference: "CUSA",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Baylor", location: "vs" },
      { week: 2, opponent: "South Carolina", location: "vs" },
      { week: 3, opponent: "New Glarus", location: "vs" },
      { week: 4, opponent: "Miami University", location: "at" },
      { week: 5, opponent: "Patriot Tech", location: "at" },
      { week: 6, opponent: "Wawa University", location: "vs" },
      { week: 7, opponent: "Jacksonville State", location: "at" },
      { week: 8, opponent: "Missouri State", location: "at" },
      { week: 9, opponent: "Middle Tennessee", location: "vs" },
      { week: 10, opponent: "New Mexico State", location: "at" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Delaware", location: "at" },
      { week: 13, opponent: "Sam Houston", location: "at" },
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
