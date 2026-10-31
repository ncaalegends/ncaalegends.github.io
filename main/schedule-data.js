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
      { week: 0, opponent: "West Virginia", location: "at", stadium: "Milan Puskar Stadium", teamScore: 24, opponentScore: 52 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "San Jose State", location: "vs", stadium: "California Memorial Stadium" },
      { week: 3, opponent: "UCLA", location: "vs", stadium: "California Memorial Stadium" },
      { week: 4, opponent: "Louisville", location: "vs", stadium: "California Memorial Stadium" },
      { week: 5, opponent: "Miami", location: "vs", stadium: "California Memorial Stadium" },
      { week: 6, opponent: "SMU", location: "at", stadium: "Gerald J. Ford Stadium" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Georgia Tech", location: "vs", stadium: "California Memorial Stadium" },
      { week: 9, opponent: "Syracuse", location: "vs", stadium: "California Memorial Stadium" },
      { week: 10, opponent: "Virginia", location: "at", stadium: "Scott Stadium" },
      { week: 11, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium" },
      { week: 12, opponent: "Stanford", location: "at", stadium: "Stanford Stadium" },
      { week: 13, opponent: "NC State", location: "at", stadium: "Carter-Finley Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "TCU",
    conference: "Big 12",
    weeks: [
      { week: 0, opponent: "Notre Dame", location: "at", stadium: "Notre Dame Stadium", teamScore: 21, opponentScore: 31 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "Texas Tech", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 3, opponent: "Michigan", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Kansas", location: "at", stadium: "David Booth Kansas Memorial Stadium" },
      { week: 6, opponent: "Oklahoma State", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 7, opponent: "Clemson", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 8, opponent: "Arizona", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 9, opponent: "Houston", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 10, opponent: "Cincinnati", location: "at", stadium: "Nippert Stadium" },
      { week: 11, opponent: "Baylor", location: "at", stadium: "McLane Stadium" },
      { week: 12, opponent: "Utah", location: "at", stadium: "Rice-Eccles Stadium" },
      { week: 13, opponent: "UCF", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Clemson",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "Ohio State", location: "at", stadium: "Ohio Stadium", teamScore: 21, opponentScore: 58 },
      { week: 1, opponent: "Syracuse", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 2, opponent: "Pittsburgh", location: "at", stadium: "Acrisure Stadium" },
      { week: 3, opponent: "Georgia", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 4, opponent: "Georgia Tech", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Louisville", location: "at", stadium: "L&N Stadium" },
      { week: 7, opponent: "TCU", location: "at", stadium: "Amon G. Carter Stadium" },
      { week: 8, opponent: "NC State", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 9, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium" },
      { week: 10, opponent: "Florida State", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Virginia Tech", location: "at", stadium: "Lane Stadium" },
      { week: 13, opponent: "South Carolina", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Florida",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Arizona State", location: "at", neutral: true, stadium: "Nissan Stadium" },
      { week: 2, opponent: "USF", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Rutgers", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 5, opponent: "LSU", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 6, opponent: "Ole Miss", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 7, opponent: "Texas A&M", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 8, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium" },
      { week: 9, opponent: "Mississippi St", location: "at", stadium: "Davis Wade Stadium" },
      { week: 10, opponent: "Georgia", location: "at", neutral: true, stadium: "EverBank Stadium" },
      { week: 11, opponent: "Kentucky", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 12, opponent: "Tennessee", location: "at", stadium: "Neyland Stadium" },
      { week: 13, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Oregon",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Colorado", location: "at", stadium: "Folsom Field" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Oregon State", location: "at", stadium: "Reser Stadium" },
      { week: 4, opponent: "Notre Dame", location: "vs", stadium: "Autzen Stadium" },
      { week: 5, opponent: "Michigan State", location: "vs", stadium: "Autzen Stadium" },
      { week: 6, opponent: "Wisconsin", location: "at", stadium: "Camp Randall Stadium" },
      { week: 7, opponent: "Penn State", location: "at", stadium: "West Shore Home Field at Beaver Stadium" },
      { week: 8, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium" },
      { week: 9, opponent: "USC", location: "vs", stadium: "Autzen Stadium" },
      { week: 10, opponent: "Washington", location: "vs", stadium: "Autzen Stadium" },
      { week: 11, opponent: "Indiana", location: "at", stadium: "Memorial Stadium" },
      { week: 12, opponent: "Illinois", location: "vs", stadium: "Autzen Stadium" },
      { week: 13, opponent: "Rutgers", location: "vs", stadium: "Autzen Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Florida State",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "Alabama", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 33, opponentScore: 24 },
      { week: 1, opponent: "Duke", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 2, opponent: "Wisconsin", location: "at", stadium: "Camp Randall Stadium" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "SMU", location: "at", stadium: "Gerald J. Ford Stadium" },
      { week: 5, opponent: "Virginia", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Miami", location: "at", stadium: "Hard Rock Stadium" },
      { week: 8, opponent: "North Carolina", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 9, opponent: "Wake Forest", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 10, opponent: "Clemson", location: "at", stadium: "Clemson Memorial Stadium" },
      { week: 11, opponent: "Stanford", location: "at", stadium: "Stanford Stadium" },
      { week: 12, opponent: "Louisville", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 13, opponent: "Florida", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "SMU",
    conference: "ACC",
    /* EYEDONTPULL19 went inactive in the 2028 preseason, before any games, so SMU is a CPU opponent all season and carries no coached schedule. */
    weeks: [
    ],
  },
  {
    team: "Washington",
    conference: "Big Ten",
    /* CPU for 2028 — Texan_hog moved to Arkansas in the 2028 preseason. No coached rows. */
    weeks: [
    ],
  },
  {
    team: "South Carolina",
    conference: "SEC",
    /* CPU for 2028 — Bl00dVayN3 moved to USC in 2027. No coached rows. */
    weeks: [
    ],
  },
  {
    team: "Ohio State",
    conference: "Big Ten",
    weeks: [
      { week: 0, opponent: "Clemson", location: "vs", stadium: "Ohio Stadium", teamScore: 58, opponentScore: 21 },
      { week: 1, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Notre Dame", location: "vs", stadium: "Ohio Stadium" },
      { week: 4, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Washington", location: "vs", stadium: "Ohio Stadium" },
      { week: 7, opponent: "Wisconsin", location: "vs", stadium: "Ohio Stadium" },
      { week: 8, opponent: "Penn State", location: "at", stadium: "West Shore Home Field at Beaver Stadium" },
      { week: 9, opponent: "Minnesota", location: "vs", stadium: "Ohio Stadium" },
      { week: 10, opponent: "Maryland", location: "at", stadium: "SECU Stadium" },
      { week: 11, opponent: "Illinois", location: "at", stadium: "Gies Memorial Stadium" },
      { week: 12, opponent: "Rutgers", location: "vs", stadium: "Ohio Stadium" },
      { week: 13, opponent: "Michigan", location: "vs", stadium: "Ohio Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Texas",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Louisiana Tech", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Indiana", location: "at", stadium: "Memorial Stadium" },
      { week: 4, opponent: "Baylor", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 5, opponent: "Mississippi St", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 6, opponent: "Kentucky", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 7, opponent: "Oklahoma", location: "at", neutral: true, stadium: "Cotton Bowl" },
      { week: 8, opponent: "Florida", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 9, opponent: "Georgia", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 10, opponent: "San Diego St.", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 11, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium" },
      { week: 12, opponent: "Vanderbilt", location: "at", stadium: "FirstBank Stadium" },
      { week: 13, opponent: "Texas A&M", location: "at", stadium: "Kyle Field" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "USC",
    conference: "Big Ten",
    weeks: [
      { week: 0, opponent: "Fresno State", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 27, opponentScore: 24 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium" },
      { week: 3, opponent: "Purdue", location: "vs", stadium: "Los Angeles Memorial Coliseum" },
      { week: 4, opponent: "Michigan State", location: "at", stadium: "Spartan Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Iowa", location: "vs", stadium: "Los Angeles Memorial Coliseum" },
      { week: 7, opponent: "Northwestern", location: "at", stadium: "Ryan Field" },
      { week: 8, opponent: "Nebraska", location: "vs", stadium: "Los Angeles Memorial Coliseum" },
      { week: 9, opponent: "Oregon", location: "at", stadium: "Autzen Stadium" },
      { week: 10, opponent: "Michigan", location: "at", stadium: "Michigan Stadium" },
      { week: 11, opponent: "Penn State", location: "vs", stadium: "Los Angeles Memorial Coliseum" },
      { week: 12, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium" },
      { week: 13, opponent: "Notre Dame", location: "vs", stadium: "Los Angeles Memorial Coliseum" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Georgia",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Indiana", location: "at", neutral: true, stadium: "Mercedes-Benz Stadium" },
      { week: 2, opponent: "Duke", location: "vs", stadium: "Sanford Stadium" },
      { week: 3, opponent: "Clemson", location: "at", stadium: "Clemson Memorial Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Auburn", location: "vs", stadium: "Sanford Stadium" },
      { week: 6, opponent: "Tennessee", location: "vs", stadium: "Sanford Stadium" },
      { week: 7, opponent: "Kentucky", location: "at", stadium: "Kroger Field" },
      { week: 8, opponent: "Ole Miss", location: "at", stadium: "Vaught-Hemingway Stadium" },
      { week: 9, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium" },
      { week: 10, opponent: "Florida", location: "vs", neutral: true, stadium: "EverBank Stadium" },
      { week: 11, opponent: "Mississippi St", location: "vs", stadium: "Sanford Stadium" },
      { week: 12, opponent: "Alabama", location: "at", stadium: "Saban Field at Bryant-Denny Stadium" },
      { week: 13, opponent: "Georgia Tech", location: "vs", stadium: "Sanford Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Michigan",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Maryland", location: "vs", stadium: "Michigan Stadium" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "TCU", location: "at", stadium: "Amon G. Carter Stadium" },
      { week: 4, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium" },
      { week: 5, opponent: "C. Michigan", location: "vs", stadium: "Michigan Stadium" },
      { week: 6, opponent: "Northwestern", location: "vs", stadium: "Michigan Stadium" },
      { week: 7, opponent: "Nebraska", location: "vs", stadium: "Michigan Stadium" },
      { week: 8, opponent: "Washington", location: "at", stadium: "Husky Stadium" },
      { week: 9, opponent: "Wisconsin", location: "at", stadium: "Camp Randall Stadium" },
      { week: 10, opponent: "USC", location: "vs", stadium: "Michigan Stadium" },
      { week: 11, opponent: "Michigan State", location: "vs", stadium: "Michigan Stadium" },
      { week: 12, opponent: "East Carolina", location: "vs", stadium: "Michigan Stadium" },
      { week: 13, opponent: "Ohio State", location: "at", stadium: "Ohio Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "West Virginia",
    conference: "Big 12",
    weeks: [
      { week: 0, opponent: "California", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 52, opponentScore: 24 },
      { week: 1, opponent: "Oklahoma", location: "at", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "LSU", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "UCF", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 6, opponent: "Baylor", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 7, opponent: "Cincinnati", location: "at", stadium: "Nippert Stadium" },
      { week: 8, opponent: "Kansas State", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 9, opponent: "Oklahoma State", location: "at", stadium: "Boone Pickens Stadium" },
      { week: 10, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium" },
      { week: 11, opponent: "Iowa State", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 12, opponent: "Arizona", location: "at", stadium: "Casino Del Sol Stadium" },
      { week: 13, opponent: "Kansas", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Colorado",
    conference: "Big 12",
    weeks: [
      { week: 0, opponent: "Oklahoma", location: "at", stadium: "Gaylord-Oklahoma Memorial", teamScore: 28, opponentScore: 19 },
      { week: 1, opponent: "Oregon", location: "vs", stadium: "Folsom Field" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Miami", location: "at", stadium: "Hard Rock Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Oklahoma State", location: "vs", stadium: "Folsom Field" },
      { week: 6, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium" },
      { week: 7, opponent: "Kansas", location: "at", stadium: "David Booth Kansas Memorial Stadium" },
      { week: 8, opponent: "Baylor", location: "vs", stadium: "Folsom Field" },
      { week: 9, opponent: "Arizona", location: "at", stadium: "Casino Del Sol Stadium" },
      { week: 10, opponent: "Utah", location: "vs", stadium: "Folsom Field" },
      { week: 11, opponent: "Cincinnati", location: "vs", stadium: "Folsom Field" },
      { week: 12, opponent: "UCF", location: "at", stadium: "Acrisure Bounce House" },
      { week: 13, opponent: "Kansas State", location: "vs", stadium: "Folsom Field" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wake Forest",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Arkansas", location: "at", neutral: true, stadium: "Mercedes-Benz Stadium" },
      { week: 2, opponent: "Purdue", location: "vs", stadium: "Allegacy Federal Credit Union (truncated)" },
      { week: 3, opponent: "Virginia Tech", location: "at", stadium: "Lane Stadium" },
      { week: 4, opponent: "East Carolina", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 5, opponent: "NC State", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Virginia", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 8, opponent: "Stanford", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 9, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium" },
      { week: 10, opponent: "Miami", location: "at", stadium: "Hard Rock Stadium" },
      { week: 11, opponent: "Boston College", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 12, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 13, opponent: "UConn", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "UCLA",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Stanford", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 2, opponent: "Washington", location: "at", stadium: "Husky Stadium" },
      { week: 3, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 4, opponent: "Ohio State", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 5, opponent: "Maryland", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 6, opponent: "Texas State", location: "at", stadium: "UFCU Stadium" },
      { week: 7, opponent: "Indiana", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Nebraska", location: "at", stadium: "Memorial Stadium" },
      { week: 10, opponent: "Rutgers", location: "at", stadium: "SHI Stadium" },
      { week: 11, opponent: "Minnesota", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 12, opponent: "USC", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 13, opponent: "Penn State", location: "at", stadium: "West Shore Home Field at Beaver Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Miami",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "USF", location: "vs", stadium: "Hard Rock Stadium", teamScore: 31, opponentScore: 23 },
      { week: 1, opponent: "Texas A&M", location: "at", stadium: "Kyle Field" },
      { week: 2, opponent: "Stanford", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 3, opponent: "Colorado", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 6, opponent: "Virginia", location: "at", stadium: "Scott Stadium" },
      { week: 7, opponent: "Florida State", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 8, opponent: "Virginia Tech", location: "at", stadium: "Lane Stadium" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "Wake Forest", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 11, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 12, opponent: "Boston College", location: "at", stadium: "Alumni Stadium" },
      { week: 13, opponent: "Duke", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Notre Dame",
    conference: "Independent",
    weeks: [
      { week: 0, opponent: "TCU", location: "vs", stadium: "Notre Dame Stadium", teamScore: 31, opponentScore: 21 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "Oklahoma", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 3, opponent: "Ohio State", location: "at", stadium: "Ohio Stadium" },
      { week: 4, opponent: "Oregon", location: "at", stadium: "Autzen Stadium" },
      { week: 5, opponent: "Boise State", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 6, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium" },
      { week: 7, opponent: "Stanford", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 8, opponent: "Boston College", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 9, opponent: "Navy", location: "at", stadium: "Navy-Marine Corps Memorial Stadium" },
      { week: 10, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Pittsburgh", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 13, opponent: "USC", location: "at", stadium: "Los Angeles Memorial Coliseum" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "No conference championship (Independent)" },
    ],
  },
  {
    team: "Ole Miss",
    conference: "SEC",
    /* Coach is inactive for 2028, so this school is a CPU opponent and carries no coached schedule. */
    weeks: [
    ],
  },
  {
    team: "Oklahoma",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Colorado", location: "vs", stadium: "Gaylord-Oklahoma Memorial", teamScore: 19, opponentScore: 28 },
      { week: 1, opponent: "West Virginia", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 2, opponent: "Notre Dame", location: "at", stadium: "Notre Dame Stadium" },
      { week: 3, opponent: "Houston", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 4, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium" },
      { week: 5, opponent: "Alabama", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 6, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium" },
      { week: 7, opponent: "Texas", location: "vs", neutral: true, stadium: "Cotton Bowl" },
      { week: 8, opponent: "South Carolina", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 9, opponent: "Ole Miss", location: "at", stadium: "Vaught-Hemingway Stadium" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Tennessee", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Alabama",
    conference: "SEC",
    /* CPU for all of 2028 — nobody has taken the school. No coached rows. */
    weeks: [
    ],
  },
  {
    team: "Louisville",
    conference: "ACC",
    /* Coach is inactive for 2028, so this school is a CPU opponent and carries no coached schedule. */
    weeks: [
    ],
  },
  {
    team: "LSU",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Ohio State", location: "vs", stadium: "Tiger Stadium" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "West Virginia", location: "at", stadium: "Milan Puskar Stadium" },
      { week: 4, opponent: "Missouri State", location: "vs", stadium: "Tiger Stadium" },
      { week: 5, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium" },
      { week: 6, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium" },
      { week: 7, opponent: "Vanderbilt", location: "vs", stadium: "Tiger Stadium" },
      { week: 8, opponent: "W. Michigan", location: "vs", stadium: "Tiger Stadium" },
      { week: 9, opponent: "South Carolina", location: "at", stadium: "Williams-Brice Stadium" },
      { week: 10, opponent: "Texas A&M", location: "at", stadium: "Kyle Field" },
      { week: 11, opponent: "Alabama", location: "vs", stadium: "Tiger Stadium" },
      { week: 12, opponent: "Ole Miss", location: "vs", stadium: "Tiger Stadium" },
      { week: 13, opponent: "Oklahoma", location: "vs", stadium: "Tiger Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Arkansas",
    conference: "SEC",
    /* Texan_hog returned in the 2028 preseason, taking Arkansas from week 0. */
    weeks: [
      { week: 0, opponent: "Kansas State", location: "vs", stadium: "DW Reynolds Razorback Stadium", teamScore: 38, opponentScore: 45 },
      { week: 1, opponent: "Wake Forest", location: "vs", neutral: true, stadium: "Mercedes-Benz Stadium" },
      { week: 2, opponent: "USC", location: "vs", stadium: "DW Reynolds Razorback Stadium" },
      { week: 3, opponent: "Texas A&M", location: "at", stadium: "Kyle Field" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Ole Miss", location: "vs", stadium: "DW Reynolds Razorback Stadium" },
      { week: 6, opponent: "LSU", location: "vs", stadium: "DW Reynolds Razorback Stadium" },
      { week: 7, opponent: "Mississippi St", location: "at", stadium: "Davis Wade Stadium" },
      { week: 8, opponent: "Tennessee", location: "vs", stadium: "DW Reynolds Razorback Stadium" },
      { week: 9, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium" },
      { week: 10, opponent: "Southern Miss", location: "vs", stadium: "DW Reynolds Razorback Stadium" },
      { week: 11, opponent: "Texas", location: "vs", stadium: "DW Reynolds Razorback Stadium" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
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
