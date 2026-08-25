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
      { week: 2, opponent: "Syracuse", location: "at", teamScore: 22, opponentScore: 10 },
      { week: 3, opponent: "FCS West", location: "vs", teamScore: 40, opponentScore: 14 },
      { week: 4, opponent: "Clemson", location: "vs", teamScore: 27, opponentScore: 10 },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Virginia Tech", location: "vs", teamScore: 16, opponentScore: 45 },
      { week: 7, opponent: "Wake Forest", location: "vs", teamScore: 44, opponentScore: 41 },
      { week: 8, opponent: "SMU", location: "at", teamScore: 35, opponentScore: 17 },
      { week: 9, opponent: "NC State", location: "at", teamScore: 23, opponentScore: 6 },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Virginia", location: "at", teamScore: 45, opponentScore: 14 },
      { week: 12, opponent: "Stanford", location: "vs", teamScore: 41, opponentScore: 0 },
      { week: 13, opponent: "Pittsburgh", location: "vs", teamScore: 24, opponentScore: 45 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Carolina",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "TCU", location: "vs", teamScore: 38, opponentScore: 28 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "FCS Southeast", location: "vs", teamScore: 35, opponentScore: 3 },
      { week: 3, opponent: "Clemson", location: "at", teamScore: 17, opponentScore: 14 },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Notre Dame", location: "vs", teamScore: 13, opponentScore: 20 },
      { week: 6, opponent: "Pittsburgh", location: "at", teamScore: 6, opponentScore: 24 },
      { week: 7, opponent: "Duke", location: "at", teamScore: 17, opponentScore: 10 },
      { week: 8, opponent: "Syracuse", location: "vs", teamScore: 31, opponentScore: 3 },
      { week: 9, opponent: "Miami", location: "vs", teamScore: 10, opponentScore: 41 },
      { week: 10, opponent: "UConn", location: "at", teamScore: 48, opponentScore: 17 },
      { week: 11, opponent: "Louisville", location: "vs", teamScore: 17, opponentScore: 34 },
      { week: 12, opponent: "Virginia", location: "at", teamScore: 21, opponentScore: 36 },
      { week: 13, opponent: "NC State", location: "vs", teamScore: 7, opponentScore: 26 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Pittsburgh",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "West Virginia", location: "vs", teamScore: 37, opponentScore: 13 },
      { week: 1, opponent: "Miami University", location: "vs", teamScore: 28, opponentScore: 0 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Syracuse", location: "vs", teamScore: 27, opponentScore: 20 },
      { week: 4, opponent: "FCS East", location: "vs", teamScore: 45, opponentScore: 10 },
      { week: 5, opponent: "Virginia Tech", location: "at", teamScore: 7, opponentScore: 35 },
      { week: 6, opponent: "North Carolina", location: "vs", teamScore: 24, opponentScore: 6 },
      { week: 7, opponent: "Boston College", location: "at", teamScore: 41, opponentScore: 0 },
      { week: 8, opponent: "Miami", location: "at", teamScore: 27, opponentScore: 22 },
      { week: 9, opponent: "Georgia Tech", location: "vs", teamScore: 30, opponentScore: 17 },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Florida State", location: "vs", teamScore: 40, opponentScore: 21 },
      { week: 12, opponent: "Louisville", location: "at", teamScore: 31, opponentScore: 27 },
      { week: 13, opponent: "California", location: "at", teamScore: 45, opponentScore: 24 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Virginia Tech", location: "at", neutral: true, title: "ACC Championship", round: "ccg" },
    ],
  },
  {
    team: "Virginia Tech",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "Western Michigan", location: "vs", teamScore: 24, opponentScore: 34 },
      { week: 1, opponent: "FCS East", location: "vs", teamScore: 49, opponentScore: 0 },
      { week: 2, opponent: "Old Dominion", location: "vs", teamScore: 35, opponentScore: 10 },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Boston College", location: "at", teamScore: 22, opponentScore: 15 },
      { week: 5, opponent: "Pittsburgh", location: "vs", teamScore: 35, opponentScore: 7 },
      { week: 6, opponent: "California", location: "at", teamScore: 45, opponentScore: 16 },
      { week: 7, opponent: "Georgia Tech", location: "vs", teamScore: 24, opponentScore: 7 },
      { week: 8, opponent: "Clemson", location: "at", teamScore: 7, opponentScore: 9 },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "SMU", location: "at", teamScore: 27, opponentScore: 26 },
      { week: 11, opponent: "Stanford", location: "vs", teamScore: 21, opponentScore: 18 },
      { week: 12, opponent: "Miami", location: "at", teamScore: 20, opponentScore: 7 },
      { week: 13, opponent: "Virginia", location: "vs", teamScore: 33, opponentScore: 28 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Pittsburgh", location: "vs", neutral: true, title: "ACC Championship", round: "ccg" },
    ],
  },

  /* ---------------------------- B1G ---------------------------- */
  {
    team: "Maryland",
    conference: "B1G",
    weeks: [
      { week: 0, opponent: "Marshall", location: "vs", teamScore: 38, opponentScore: 10 },
      { week: 1, opponent: "FCS East", location: "vs", teamScore: 73, opponentScore: 3 },
      { week: 2, opponent: "Utah", location: "vs", teamScore: 45, opponentScore: 28 },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "UCLA", location: "vs", teamScore: 33, opponentScore: 23 },
      { week: 5, opponent: "Nebraska", location: "at", teamScore: 28, opponentScore: 24 },
      { week: 6, opponent: "Ohio State", location: "at", teamScore: 31, opponentScore: 0 },
      { week: 7, opponent: "Rutgers", location: "vs", teamScore: 45, opponentScore: 19 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Illinois", location: "vs", teamScore: 63, opponentScore: 3 },
      { week: 10, opponent: "Purdue", location: "at", teamScore: 45, opponentScore: 7 },
      { week: 11, opponent: "Wisconsin", location: "vs", teamScore: 28, opponentScore: 25 },
      { week: 12, opponent: "USC", location: "at", teamScore: 56, opponentScore: 13 },
      { week: 13, opponent: "Penn State", location: "vs", teamScore: 37, opponentScore: 22 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Wisconsin", location: "vs", neutral: true, title: "Big Ten Championship", round: "ccg" },
    ],
  },
  {
    team: "Rutgers",
    conference: "B1G",
    /* Weeks 1-10 were played by the CPU — the spot was held but
       unplayed until Miles took it over at Week 11 (joinedAtWeek in
       league-data.js). The results are transcribed anyway so his
       schedule page isn't half empty and the site can show the record
       he inherited.

       They are recorded here as CPU results and must stay that way.
       The Week 7 loss at Maryland is the one to watch: Trick whitey's
       block already carries it as 45-19 and the two entries agree,
       but it is NOT a head-to-head game and it must not enter either
       coach's H2H record or power-poll window. isLeagueTeam("Rutgers",
       7) returns false, which is what keeps that true. Same for the
       Week 10 loss at Wisconsin, 48-16 on Salzy's block. */
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "UMass", location: "vs", teamScore: 21, opponentScore: 9 },
      { week: 2, opponent: "Boston College", location: "at", teamScore: 24, opponentScore: 21 },
      { week: 3, opponent: "USC", location: "vs", teamScore: 24, opponentScore: 38 },
      { week: 4, opponent: "FCS East", location: "vs", teamScore: 34, opponentScore: 6 },
      { week: 5, opponent: "Indiana", location: "vs", teamScore: 21, opponentScore: 38 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Maryland", location: "at", teamScore: 19, opponentScore: 45 },
      { week: 8, opponent: "Northwestern", location: "at", teamScore: 21, opponentScore: 24 },
      { week: 9, opponent: "Michigan", location: "vs", teamScore: 10, opponentScore: 23 },
      { week: 10, opponent: "Wisconsin", location: "at", teamScore: 16, opponentScore: 48 },
      { week: 11, opponent: "Nebraska", location: "vs", teamScore: 35, opponentScore: 38 },
      { week: 12, opponent: "Penn State", location: "at", teamScore: 35, opponentScore: 37 },
      { week: 13, opponent: "Michigan State", location: "vs", teamScore: 27, opponentScore: 24 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wisconsin",
    conference: "B1G",
    weeks: [
      { week: 0, opponent: "UConn", location: "vs", teamScore: 49, opponentScore: 10 },
      { week: 1, opponent: "Notre Dame", location: "at", teamScore: 27, opponentScore: 24 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Eastern Michigan", location: "vs", teamScore: 55, opponentScore: 34 },
      { week: 4, opponent: "Penn State", location: "at", teamScore: 20, opponentScore: 19 },
      { week: 5, opponent: "Michigan State", location: "vs", teamScore: 42, opponentScore: 7 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "UCLA", location: "at", teamScore: 31, opponentScore: 24 },
      { week: 8, opponent: "USC", location: "vs", teamScore: 20, opponentScore: 17 },
      { week: 9, opponent: "Iowa", location: "at", teamScore: 35, opponentScore: 20 },
      { week: 10, opponent: "Rutgers", location: "vs", teamScore: 48, opponentScore: 16 },
      { week: 11, opponent: "Maryland", location: "at", teamScore: 25, opponentScore: 28 },
      { week: 12, opponent: "Purdue", location: "at", teamScore: 45, opponentScore: 24 },
      { week: 13, opponent: "Minnesota", location: "vs", teamScore: 29, opponentScore: 13 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Maryland", location: "at", neutral: true, title: "Big Ten Championship", round: "ccg" },
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
      { week: 3, opponent: "Louisiana Tech", location: "vs", teamScore: 73, opponentScore: 14 },
      { week: 4, opponent: "Colorado", location: "vs", teamScore: 16, opponentScore: 23 },
      { week: 5, opponent: "Arizona State", location: "at", teamScore: 38, opponentScore: 27 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "TCU", location: "vs", teamScore: 54, opponentScore: 28 },
      { week: 8, opponent: "Kansas", location: "at", teamScore: 35, opponentScore: 17 },
      { week: 9, opponent: "UCF", location: "at", teamScore: 28, opponentScore: 56 },
      { week: 10, opponent: "Iowa State", location: "vs", teamScore: 45, opponentScore: 14 },
      { week: 11, opponent: "BYU", location: "at", teamScore: 16, opponentScore: 34 },
      { week: 12, opponent: "Texas Tech", location: "vs", teamScore: 31, opponentScore: 14 },
      { week: 13, opponent: "Houston", location: "at", teamScore: 26, opponentScore: 14 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Colorado",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "Utah State", location: "vs", teamScore: 45, opponentScore: 16 },
      { week: 1, opponent: "Georgia Tech", location: "at", teamScore: 42, opponentScore: 24 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Northwestern", location: "at", teamScore: 17, opponentScore: 28 },
      { week: 4, opponent: "Baylor", location: "at", teamScore: 23, opponentScore: 16 },
      { week: 5, opponent: "Texas Tech", location: "vs", teamScore: 14, opponentScore: 59 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Utah", location: "vs", teamScore: 42, opponentScore: 28 },
      { week: 8, opponent: "Oklahoma State", location: "at", teamScore: 28, opponentScore: 25 },
      { week: 9, opponent: "Kansas State", location: "vs", teamScore: 45, opponentScore: 17 },
      { week: 10, opponent: "Arizona State", location: "at", teamScore: 35, opponentScore: 31 },
      { week: 11, opponent: "Houston", location: "vs", teamScore: 49, opponentScore: 21 },
      { week: 12, opponent: "Cincinnati", location: "at", teamScore: 42, opponentScore: 7 },
      { week: 13, opponent: "UCF", location: "vs", teamScore: 22, opponentScore: 45 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Iowa State",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "Toledo", location: "vs", teamScore: 27, opponentScore: 6 },
      { week: 1, opponent: "FCS Midwest", location: "vs", teamScore: 38, opponentScore: 22 },
      { week: 2, opponent: "Iowa", location: "at", teamScore: 24, opponentScore: 0 },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Utah", location: "vs", teamScore: 14, opponentScore: 10 },
      { week: 5, opponent: "West Virginia", location: "vs", teamScore: 20, opponentScore: 14 },
      { week: 6, opponent: "BYU", location: "at", teamScore: 28, opponentScore: 22 },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Arizona", location: "at", teamScore: 19, opponentScore: 24 },
      { week: 9, opponent: "Oklahoma State", location: "vs", teamScore: 21, opponentScore: 31 },
      { week: 10, opponent: "Baylor", location: "at", teamScore: 14, opponentScore: 45 },
      { week: 11, opponent: "Cincinnati", location: "vs", teamScore: 38, opponentScore: 17 },
      { week: 12, opponent: "UCF", location: "at", teamScore: 10, opponentScore: 41, sim: true },
      { week: 13, opponent: "Kansas State", location: "vs", teamScore: 28, opponentScore: 14 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "UCF",
    conference: "XII",
    weeks: [
      { week: 0, opponent: "USF", location: "vs", teamScore: 28, opponentScore: 21 },
      { week: 1, opponent: "FCS Southeast", location: "vs", teamScore: 38, opponentScore: 7 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Georgia State", location: "vs", teamScore: 30, opponentScore: 0 },
      { week: 4, opponent: "TCU", location: "vs", teamScore: 28, opponentScore: 14 },
      { week: 5, opponent: "Houston", location: "at", teamScore: 27, opponentScore: 35 },
      { week: 6, opponent: "Oklahoma State", location: "at", teamScore: 31, opponentScore: 21 },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "BYU", location: "vs", teamScore: 28, opponentScore: 23 },
      { week: 9, opponent: "Baylor", location: "vs", teamScore: 56, opponentScore: 28 },
      { week: 10, opponent: "Kansas", location: "at", teamScore: 24, opponentScore: 14 },
      { week: 11, opponent: "Arizona State", location: "vs", teamScore: 35, opponentScore: 30 },
      { week: 12, opponent: "Iowa State", location: "vs", teamScore: 41, opponentScore: 10, sim: true },
      { week: 13, opponent: "Colorado", location: "at", teamScore: 45, opponentScore: 22 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "BYU", location: "vs", neutral: true, title: "Big 12 Championship", round: "ccg", teamScore: 0, opponentScore: 31 },
    ],
  },

  /* ---------------------------- SEC ---------------------------- */
  {
    team: "Charlotte",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Tulsa", location: "vs", teamScore: 33, opponentScore: 14 },
      { week: 1, opponent: "Georgia", location: "at", teamScore: 7, opponentScore: 52 },
      { week: 2, opponent: "Ole Miss", location: "at", teamScore: 28, opponentScore: 34 },
      { week: 3, opponent: "FCS Southeast", location: "vs", teamScore: 31, opponentScore: 10 },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "James Madison", location: "vs", teamScore: 10, opponentScore: 45 },
      { week: 6, opponent: "Oklahoma", location: "vs", teamScore: 38, opponentScore: 10 },
      { week: 7, opponent: "North Dakota State", location: "vs", teamScore: 3, opponentScore: 21 },
      { week: 8, opponent: "Arkansas", location: "at", teamScore: 7, opponentScore: 34 },
      { week: 9, opponent: "Texas", location: "at", teamScore: 7, opponentScore: 14 },
      { week: 10, opponent: "UAB", location: "vs", teamScore: 32, opponentScore: 6 },
      { week: 11, opponent: "Florida", location: "vs", teamScore: 7, opponentScore: 19 },
      { week: 12, opponent: "LSU", location: "at", teamScore: 31, opponentScore: 28 },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "James Madison",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Southern Mississippi", location: "at", teamScore: 42, opponentScore: 24 },
      { week: 1, opponent: "Liberty", location: "vs", teamScore: 44, opponentScore: 14 },
      { week: 2, opponent: "LSU", location: "vs", teamScore: 20, opponentScore: 27 },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Auburn", location: "vs", teamScore: 45, opponentScore: 14 },
      { week: 5, opponent: "Charlotte", location: "at", teamScore: 45, opponentScore: 10 },
      { week: 6, opponent: "Alabama", location: "at", teamScore: 35, opponentScore: 17 },
      { week: 7, opponent: "Ole Miss", location: "vs", teamScore: 32, opponentScore: 37 },
      { week: 8, opponent: "North Texas", location: "at", teamScore: 49, opponentScore: 14 },
      { week: 9, opponent: "Tennessee", location: "vs", teamScore: 24, opponentScore: 41 },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "UConn", location: "at", teamScore: 45, opponentScore: 38 },
      { week: 12, opponent: "Georgia", location: "at", teamScore: 28, opponentScore: 34 },
      { week: 13, opponent: "Oklahoma", location: "at", teamScore: 7, opponentScore: 45 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Dakota State",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Jacksonville State", location: "vs", teamScore: 40, opponentScore: 14 },
      { week: 1, opponent: "Oklahoma", location: "vs", teamScore: 48, opponentScore: 17 },
      { week: 2, opponent: "Georgia", location: "vs", teamScore: 31, opponentScore: 51 },
      { week: 3, opponent: "FCS Northwest", location: "vs", teamScore: 56, opponentScore: 7 },
      { week: 4, opponent: "North Texas", location: "at", teamScore: 48, opponentScore: 56 },
      { week: 5, opponent: "Texas", location: "vs", teamScore: 42, opponentScore: 38 },
      { week: 6, opponent: "Auburn", location: "at", teamScore: 21, opponentScore: 38 },
      { week: 7, opponent: "Charlotte", location: "at", teamScore: 21, opponentScore: 3 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Kentucky", location: "at", teamScore: 25, opponentScore: 28 },
      { week: 10, opponent: "Tennessee", location: "at", teamScore: 19, opponentScore: 0 },
      { week: 11, opponent: "Arkansas", location: "vs", teamScore: 28, opponentScore: 20 },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Hawai'i", location: "at", teamScore: 35, opponentScore: 21 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "North Texas",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Indiana", location: "at", teamScore: 37, opponentScore: 26 },
      { week: 1, opponent: "Tennessee", location: "vs", teamScore: 45, opponentScore: 28 },
      { week: 2, opponent: "Texas A&M", location: "at", teamScore: 3, opponentScore: 45 },
      { week: 3, opponent: "Ole Miss", location: "at", teamScore: 56, opponentScore: 7 },
      { week: 4, opponent: "North Dakota State", location: "vs", teamScore: 56, opponentScore: 48 },
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
