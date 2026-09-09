/* ============================================================
   SCHEDULE DATA — transcribed from in-game "Custom Schedule"
   screenshots (2 per team, weeks 0-8 and 7-15, overlap on
   weeks 7-8 deduped by hand when this file was built).

   Only teams whose coach has shared a screenshot appear here.
   As more coaches send schedules, add a new entry to
   TEAM_SCHEDULES following the same shape — the site picks it
   up automatically in both the Weekly and By Team views.

   Each week entry:
     { week, opponent, location, stadium }   — location is
       "vs" (home) or "at" (away)
     { week, note }                          — bye / Army-Navy /
       conference championship weeks with no fixed opponent yet

   THE POSTSEASON LIVES HERE TOO — weeks 15-19.

   A conference championship, a bowl or a CFP round that a COACHED
   team played is an ordinary row on that team's schedule, with three
   optional extra fields:

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

   Weeks 16-19 are the game's Bowl Weeks 1-4. A team only has a row
   for a week it actually played, so most teams stop at 15 and a
   team with a first-round bye has no week 16 row at all.

   A game between two teams NOBODY coaches — most of the CFP bracket
   — does not belong here. It has no coach's schedule to live on and
   goes in postseason-data.js instead.

   SCORES: once a week's games are final, add teamScore and
   opponentScore to that entry (that TEAM's own perspective —
   teamScore is this team's points, opponentScore is the other
   team's points, regardless of home/away). Do this on BOTH teams'
   entries for a league game so it shows correctly on both coaches'
   schedules, e.g.:
     { week: 4, opponent: "Clemson", location: "vs", stadium: "...",
       teamScore: 27, opponentScore: 24 }
   The site converts this into home/away scores automatically and
   marks the game "Final" everywhere it appears (Home preview,
   Schedule > Weekly, Schedule > By Team).

   CURRENT WEEK: script.js has a SEASON.currentWeek value (starts
   as "PRESEASON") that controls the Home tab. Bump it to a week
   number once that week actually kicks off in-game.
   ============================================================ */
const TEAM_SCHEDULES = [
  {
    team: "California",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "TCU",
    conference: "Big 12",
    weeks: [
    ],
  },
  {
    team: "Clemson",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "Florida",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "Oregon",
    conference: "Big Ten",
    weeks: [
    ],
  },
  {
    team: "Florida State",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "SMU",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "Washington",
    conference: "Big Ten",
    weeks: [
    ],
  },
  {
    team: "South Carolina",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "Ohio State",
    conference: "Big Ten",
    weeks: [
    ],
  },
  {
    team: "Texas",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "USC",
    conference: "Big Ten",
    weeks: [
    ],
  },
  {
    team: "Georgia",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "Michigan",
    conference: "Big Ten",
    weeks: [
    ],
  },
  {
    team: "West Virginia",
    conference: "Big 12",
    weeks: [
    ],
  },
  {
    team: "Colorado",
    conference: "Big 12",
    weeks: [
    ],
  },
  {
    team: "Wake Forest",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "UCLA",
    conference: "Big Ten",
    weeks: [
    ],
  },
  {
    team: "Miami",
    conference: "ACC",
    weeks: [
    ],
  },
  {
    team: "Notre Dame",
    conference: "Independent",
    weeks: [
    ],
  },
  {
    team: "Ole Miss",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "Oklahoma",
    conference: "SEC",
    weeks: [
    ],
  },
  {
    team: "Alabama",
    conference: "SEC",
    /* Alabama has been held by two coaches this season and is unmanned
       either side of both. Woogity played weeks 0-4, nobody held it in
       weeks 5-10, Trick whitey took it over in week 11 and left after
       week 12. From week 13 on it is CPU again — the Auburn and SEC
       Championship rows below belong to no coach. See the two Alabama
       entries in league-data.js. */
    weeks: [
    ],
  },
  {
    team: "Louisville",
    conference: "ACC",
    weeks: [
    ],
  },
];

/* Schedule-team-name -> roster-team-name, for the handful of cases
   where the in-game team name doesn't match what's in the sign-up
   sheet verbatim (e.g. "Cal" on the roster vs "California" in-game). */
const SCHEDULE_TEAM_ALIASES = {
  "California": "Cal",
  "Florida State": "FSU",
};
