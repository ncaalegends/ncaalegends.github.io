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
    ],
  },
  {
    team: "Dillon",
    conference: "Sun Belt",
    weeks: [
    ],
  },

  /* ---------------------------- MAC ---------------------------- */
  {
    team: "Minneapolis",
    conference: "MAC",
    weeks: [
    ],
  },
  {
    team: "New Glarus",
    conference: "MAC",
    weeks: [
    ],
  },
  {
    team: "North Shore",
    conference: "MAC",
    weeks: [
    ],
  },

  /* ---------------------------- CUSA --------------------------- */
  {
    team: "Patriot Tech",
    conference: "CUSA",
    weeks: [
    ],
  },
  {
    team: "Wawa University",
    conference: "CUSA",
    weeks: [
    ],
  },
  {
    team: "Westeros",
    conference: "CUSA",
    weeks: [
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
