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
   The trailing in-game row 16 (a post-CCG bye for everyone) is
   not carried over — nothing renders it.

   STADIUMS. Record the venue on EVERY game row, home and away
   alike, the way main/schedule-data.js does. The 2027 Team
   Schedule screen has a STADIUM column, so it is transcribed
   straight off the screenshot: the home team's venue on a home
   game, the host's venue on a road game, the neutral site on a
   neutral game. (The 2026 screens had no such column, which is
   why seasons/2026/schedule-data.js carries none — that was a
   limit of the screenshot, not a house style. Don't re-inherit
   it.) script.js still treats stadium as optional, so a row that
   genuinely has no venue on screen may omit it.

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
      { week: 0, opponent: "Boise State", location: "vs", stadium: "California Memorial Stadium", teamScore: 52, opponentScore: 40 },
      { week: 1, opponent: "UCF", location: "at", stadium: "Acrisure Bounce House" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Baylor", location: "vs", stadium: "California Memorial Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Wake Forest", location: "vs", stadium: "California Memorial Stadium" },
      { week: 6, opponent: "SMU", location: "vs", stadium: "California Memorial Stadium" },
      { week: 7, opponent: "Pittsburgh", location: "vs", stadium: "California Memorial Stadium" },
      { week: 8, opponent: "Florida State", location: "vs", stadium: "California Memorial Stadium" },
      { week: 9, opponent: "Boston College", location: "at", stadium: "Alumni Stadium" },
      { week: 10, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium" },
      { week: 11, opponent: "Louisville", location: "at", stadium: "L&N Stadium" },
      { week: 12, opponent: "Stanford", location: "at", stadium: "Stanford Stadium" },
      { week: 13, opponent: "Miami", location: "vs", stadium: "California Memorial Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Carolina",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Vanderbilt", location: "vs", stadium: "Kenan Stadium" },
      { week: 2, opponent: "Purdue", location: "vs", stadium: "Kenan Stadium" },
      { week: 3, opponent: "Wake Forest", location: "vs", stadium: "Kenan Stadium" },
      { week: 4, opponent: "UConn", location: "vs", stadium: "Kenan Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Virginia", location: "vs", stadium: "Kenan Stadium" },
      { week: 7, opponent: "Virginia Tech", location: "at", stadium: "Lane Stadium" },
      { week: 8, opponent: "Stanford", location: "at", stadium: "Stanford Stadium" },
      { week: 9, opponent: "Louisville", location: "at", stadium: "L&N Stadium" },
      { week: 10, opponent: "California", location: "vs", stadium: "Kenan Stadium" },
      { week: 11, opponent: "Duke", location: "vs", stadium: "Kenan Stadium" },
      { week: 12, opponent: "SMU", location: "at", stadium: "Gerald J. Ford Stadium" },
      { week: 13, opponent: "NC State", location: "at", stadium: "Carter-Finley Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Pittsburgh",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Temple", location: "vs", stadium: "Acrisure Stadium" },
      /* Aer Lingus-style neutral opener in Dublin. Pitt is the listed
         home side ("VS" in game), but there's no true home team, so
         the row carries neutral + the venue. Cross-check with Salzy's
         Wisconsin block when it comes in. */
      { week: 2, opponent: "Wisconsin", location: "vs", neutral: true, stadium: "Dublin Stadium" },
      { week: 3, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 4, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Syracuse", location: "at", stadium: "JMA Wireless Dome" },
      { week: 7, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 8, opponent: "Duke", location: "at", stadium: "Wallace Wade Stadium" },
      { week: 9, opponent: "Penn State", location: "vs", stadium: "Acrisure Stadium" },
      { week: 10, opponent: "Virginia Tech", location: "vs", stadium: "Acrisure Stadium" },
      { week: 11, opponent: "SMU", location: "vs", stadium: "Acrisure Stadium" },
      { week: 12, opponent: "Miami", location: "vs", stadium: "Acrisure Stadium" },
      { week: 13, opponent: "Boston College", location: "vs", stadium: "Acrisure Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Virginia Tech",
    conference: "ACC",
    /* No 2027 schedule: Cleveland is inactive, so this team is CPU
       all season and no screenshot is taken for it. */
    weeks: [
    ],
  },

  /* ---------------------------- B1G ---------------------------- */
  {
    team: "Maryland",
    conference: "B1G",
    /* Trick whitey left the league during championship week
       (departedAfterWeek: 14 in league-data.js). Weeks 0-14 are his
       and stay head-to-head. The Week 15 Big Ten Championship is not:
       Maryland was CPU by then and Salzy played the CPU, so that
       42-38 must not enter either coach's H2H record or power-poll
       window. isLeagueTeam("Maryland", 15) returns false, which is
       what keeps that true. The result is transcribed on both blocks
       anyway so the By Team pages agree with each other. */
    /* No 2027 schedule: Trick whitey is inactive, so this team is CPU
       all season and no screenshot is taken for it. */
    weeks: [
    ],
  },
  {
    team: "North Dakota State",
    conference: "B1G",
    /* Moved from the SEC to the B1G for 2027, matching the in-game
       schedule screen ("7th in Big Ten Division 1") and league-data.js. */
    weeks: [
      { week: 0, opponent: "Bowling Green", location: "vs", teamScore: 42, opponentScore: 14, stadium: "North Dakota State Stadium" },
      { week: 1, opponent: "James Madison", location: "at", stadium: "Bridgeforth Stadium" },
      { week: 2, opponent: "Sac State", location: "vs", stadium: "North Dakota State Stadium" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Oregon", location: "at", stadium: "Autzen Stadium" },
      { week: 5, opponent: "Penn State", location: "vs", stadium: "North Dakota State Stadium" },
      { week: 6, opponent: "Indiana", location: "vs", stadium: "North Dakota State Stadium" },
      { week: 7, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium" },
      { week: 8, opponent: "Washington", location: "vs", stadium: "North Dakota State Stadium" },
      { week: 9, opponent: "Illinois", location: "vs", stadium: "North Dakota State Stadium" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Nebraska", location: "at", stadium: "Memorial Stadium" },
      { week: 12, opponent: "UTEP", location: "vs", stadium: "North Dakota State Stadium" },
      { week: 13, opponent: "USC", location: "at", stadium: "Los Angeles Memorial Coliseum" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Oregon State",
    conference: "B1G",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Washington St.", location: "vs", stadium: "Reser Stadium" },
      { week: 2, opponent: "New Mexico", location: "vs", stadium: "Reser Stadium" },
      { week: 3, opponent: "Penn State", location: "vs", stadium: "Reser Stadium" },
      { week: 4, opponent: "San Diego St.", location: "at", stadium: "Snapdragon Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Washington", location: "vs", stadium: "Reser Stadium" },
      { week: 7, opponent: "Illinois", location: "vs", stadium: "Reser Stadium" },
      { week: 8, opponent: "Nebraska", location: "at", stadium: "Memorial Stadium" },
      { week: 9, opponent: "USC", location: "vs", stadium: "Reser Stadium" },
      { week: 10, opponent: "Michigan", location: "at", stadium: "Michigan Stadium" },
      { week: 11, opponent: "West Virginia", location: "vs", stadium: "Reser Stadium" },
      { week: 12, opponent: "Iowa", location: "at", stadium: "Kinnick Stadium" },
      { week: 13, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Rutgers",
    conference: "B1G",
    /* Miles has the spot for all of 2027 — the mid-season handover and
       the CPU weeks it created belong to 2026 and live in
       seasons/2026/. */
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Akron", location: "vs", stadium: "SHI Stadium" },
      { week: 2, opponent: "Boston College", location: "vs", stadium: "SHI Stadium" },
      { week: 3, opponent: "App St.", location: "at", stadium: "Kidd Brewer Stadium" },
      { week: 4, opponent: "Northwestern", location: "vs", stadium: "SHI Stadium" },
      { week: 5, opponent: "FCS Southeast", location: "vs", stadium: "SHI Stadium" },
      { week: 6, opponent: "Ohio State", location: "at", stadium: "Ohio Stadium" },
      { week: 7, opponent: "Purdue", location: "vs", stadium: "SHI Stadium" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Maryland", location: "at", stadium: "SECU Stadium" },
      { week: 10, opponent: "Wisconsin", location: "vs", stadium: "SHI Stadium" },
      { week: 11, opponent: "Iowa", location: "vs", stadium: "SHI Stadium" },
      { week: 12, opponent: "Indiana", location: "at", stadium: "Memorial Stadium" },
      { week: 13, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wisconsin",
    conference: "B1G",
    weeks: [
      { week: 0, opponent: "W. Michigan", location: "vs", teamScore: 56, opponentScore: 14, stadium: "Camp Randall Stadium" },
      { week: 1, opponent: "Northwestern", location: "at", stadium: "Ryan Field" },
      /* The Dublin neutral opener. Pittsburgh is the listed home side
         on both blocks, so this one reads "at" here and "vs" there. */
      { week: 2, opponent: "Pittsburgh", location: "at", neutral: true, stadium: "Dublin Stadium" },
      { week: 3, opponent: "Colorado State", location: "vs", stadium: "Camp Randall Stadium" },
      { week: 4, opponent: "Ohio State", location: "vs", stadium: "Camp Randall Stadium" },
      { week: 5, opponent: "Boise State", location: "vs", stadium: "Camp Randall Stadium" },
      { week: 6, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium" },
      { week: 7, opponent: "Maryland", location: "vs", stadium: "Camp Randall Stadium" },
      { week: 8, opponent: "Iowa", location: "vs", stadium: "Camp Randall Stadium" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "Rutgers", location: "at", stadium: "SHI Stadium" },
      { week: 11, opponent: "Indiana", location: "vs", stadium: "Camp Randall Stadium" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Oregon", location: "at", stadium: "Autzen Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },

  /* ---------------------------- XII ---------------------------- */
  {
    team: "Baylor",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "SMU", location: "vs", teamScore: 44, opponentScore: 31, stadium: "McLane Stadium" },
      { week: 1, opponent: "Iowa State", location: "vs", stadium: "McLane Stadium" },
      { week: 2, opponent: "Oregon", location: "vs", stadium: "McLane Stadium" },
      { week: 3, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 4, opponent: "West Virginia", location: "vs", stadium: "McLane Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "North Texas", location: "vs", stadium: "McLane Stadium" },
      { week: 9, opponent: "Kansas", location: "vs", stadium: "McLane Stadium" },
      { week: 10, opponent: "BYU", location: "at", stadium: "LaVell Edwards Stadium" },
      { week: 11, opponent: "TCU", location: "at", stadium: "Amon G. Carter Stadium" },
      { week: 12, opponent: "Houston", location: "vs", stadium: "McLane Stadium" },
      { week: 13, opponent: "Kansas State", location: "at", stadium: "Bill Snyder Family Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Colorado",
    conference: "XII",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium" },
      { week: 2, opponent: "Michigan", location: "vs", stadium: "Folsom Field" },
      { week: 3, opponent: "NIU", location: "vs", stadium: "Folsom Field" },
      { week: 4, opponent: "Kansas", location: "vs", stadium: "Folsom Field" },
      { week: 5, opponent: "West Virginia", location: "at", stadium: "Milan Puskar Stadium" },
      { week: 6, opponent: "San Diego St.", location: "at", stadium: "Snapdragon Stadium" },
      { week: 7, opponent: "Houston", location: "vs", stadium: "Folsom Field" },
      { week: 8, opponent: "Arizona State", location: "at", stadium: "Mountain America Stadium" },
      { week: 9, opponent: "Cincinnati", location: "vs", stadium: "Folsom Field" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "North Texas", location: "vs", stadium: "Folsom Field" },
      { week: 12, opponent: "Iowa State", location: "at", stadium: "Jack Trice Stadium" },
      { week: 13, opponent: "Oklahoma State", location: "vs", stadium: "Folsom Field" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Iowa State",
    conference: "XII",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Baylor", location: "at", stadium: "McLane Stadium" },
      { week: 2, opponent: "Iowa", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 3, opponent: "Tennessee", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 4, opponent: "Arizona", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 5, opponent: "Oklahoma State", location: "at", stadium: "Boone Pickens Stadium" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Utah", location: "at", stadium: "Rice-Eccles Stadium" },
      { week: 8, opponent: "Kansas State", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 9, opponent: "Indiana", location: "at", stadium: "Memorial Stadium" },
      { week: 10, opponent: "Texas Tech", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 11, opponent: "Kansas", location: "at", stadium: "David Booth Kansas Memorial Stadium" },
      { week: 12, opponent: "Colorado", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 13, opponent: "BYU", location: "vs", stadium: "Jack Trice Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Oklahoma State",
    conference: "XII",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Arizona State", location: "at", stadium: "Mountain America Stadium" },
      { week: 2, opponent: "Kansas", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 3, opponent: "Texas A&M", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Iowa State", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 6, opponent: "Kansas State", location: "at", stadium: "Bill Snyder Family Stadium" },
      { week: 7, opponent: "West Virginia", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 8, opponent: "Tulsa", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 9, opponent: "Houston", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 10, opponent: "TCU", location: "at", stadium: "Amon G. Carter Stadium" },
      { week: 11, opponent: "Charlotte", location: "at", stadium: "Jerry Richardson Stadium" },
      { week: 12, opponent: "BYU", location: "vs", stadium: "Boone Pickens Stadium" },
      { week: 13, opponent: "Colorado", location: "at", stadium: "Folsom Field" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },

  /* ---------------------------- SEC ---------------------------- */
  {
    team: "Charlotte",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Buffalo", location: "vs", stadium: "Jerry Richardson Stadium", teamScore: 38, opponentScore: 17 },
      { week: 1, opponent: "Ole Miss", location: "at", stadium: "Vaught-Hemingway Stadium" },
      { week: 2, opponent: "Kentucky", location: "at", stadium: "Kroger Field" },
      { week: 3, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium" },
      { week: 4, opponent: "East Carolina", location: "vs", stadium: "Jerry Richardson Stadium" },
      { week: 5, opponent: "App St.", location: "vs", stadium: "Jerry Richardson Stadium" },
      { week: 6, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "UCF", location: "vs", stadium: "Jerry Richardson Stadium" },
      { week: 9, opponent: "Tennessee", location: "vs", stadium: "Jerry Richardson Stadium" },
      { week: 10, opponent: "Georgia", location: "vs", stadium: "Jerry Richardson Stadium" },
      /* Charlotte hosts. The screenshot of this row was taken before
         the sides were settled and showed it at Boone Pickens;
         RekenCrew's block already has it as "at Charlotte", so the
         two agree. Venue filled in from Charlotte's other home games. */
      { week: 11, opponent: "Oklahoma State", location: "vs", stadium: "Jerry Richardson Stadium" },
      { week: 12, opponent: "Arkansas", location: "vs", stadium: "Jerry Richardson Stadium" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "James Madison",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "UConn", location: "vs", stadium: "Bridgeforth Stadium", teamScore: 24, opponentScore: 21 },
      /* Listed in game as "NDSU"; expanded to the roster spelling so
         the head-to-head with Texan_hog resolves. */
      { week: 1, opponent: "North Dakota State", location: "vs", stadium: "Bridgeforth Stadium" },
      { week: 2, opponent: "Vanderbilt", location: "at", stadium: "FirstBank Stadium" },
      { week: 3, opponent: "C. Carolina", location: "vs", stadium: "Bridgeforth Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium" },
      { week: 6, opponent: "Kentucky", location: "vs", stadium: "Bridgeforth Stadium" },
      { week: 7, opponent: "Georgia", location: "vs", stadium: "Bridgeforth Stadium" },
      { week: 8, opponent: "Tennessee", location: "vs", stadium: "Bridgeforth Stadium" },
      { week: 9, opponent: "Arkansas", location: "vs", stadium: "Bridgeforth Stadium" },
      { week: 10, opponent: "Northwestern", location: "at", stadium: "Ryan Field" },
      { week: 11, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 12, opponent: "Oklahoma", location: "at", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Texas",
    conference: "SEC",
    /* No 2027 schedule: DiabeticSnail22 is inactive, so this team is CPU
       all season and no screenshot is taken for it. */
    weeks: [
    ],
  },
  {
    team: "UCF",
    conference: "SEC",
    /* Moved from the XII to the SEC for 2027, matching the in-game
       schedule screen ("2nd in SEC Division 1") and league-data.js. */
    weeks: [
      { week: 0, opponent: "UAB", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 1, opponent: "California", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "East Carolina", location: "at", stadium: "Dowdy-Ficklen Stadium" },
      { week: 4, opponent: "Georgia", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 5, opponent: "Tennessee", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Texas A&M", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 8, opponent: "Charlotte", location: "at", stadium: "Jerry Richardson Stadium" },
      { week: 9, opponent: "Ole Miss", location: "at", stadium: "Vaught-Hemingway Stadium" },
      { week: 10, opponent: "Clemson", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 11, opponent: "Alabama", location: "at", stadium: "Saban Field at Bryant-Denny Stadium" },
      { week: 12, opponent: "Kentucky", location: "vs", stadium: "Acrisure Bounce House" },
      { week: 13, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
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
