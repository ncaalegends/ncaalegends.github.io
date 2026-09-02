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
    ],
  },
  {
    team: "North Carolina",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "Pittsburgh",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "Virginia Tech",
    conference: "ACC",
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
    weeks: [
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
    ],
  },
  {
    team: "Wisconsin",
    conference: "B1G",
    weeks: [
    ],
  },

  /* ---------------------------- XII ---------------------------- */
  {
    team: "Baylor",
    conference: "XII",
    weeks: [
    ],
  },
  {
    team: "Colorado",
    conference: "XII",
    weeks: [
    ],
  },
  {
    team: "Iowa State",
    conference: "XII",
    weeks: [
    ],
  },
  {
    team: "UCF",
    conference: "XII",
    weeks: [
    ],
  },

  /* ---------------------------- SEC ---------------------------- */
  {
    team: "Charlotte",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "James Madison",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "North Dakota State",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "North Texas",
    conference: "SEC",
    weeks: [
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
