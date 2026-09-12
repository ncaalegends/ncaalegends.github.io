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
      { week: 0, note: "BYE" },
      { week: 1, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium" },
      { week: 2, opponent: "San Diego State", location: "vs", stadium: "California Memorial Stadium" },
      { week: 3, opponent: "Air Force", location: "vs", stadium: "California Memorial Stadium" },
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
    team: "TCU",
    conference: "Big 12",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "Michigan", location: "at", stadium: "Michigan Stadium" },
      { week: 3, opponent: "Notre Dame", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 4, opponent: "Arkansas", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 5, opponent: "Oklahoma State", location: "at", stadium: "Boone Pickens Stadium" },
      { week: 6, opponent: "Utah", location: "at", stadium: "Rice-Eccles Stadium" },
      { week: 7, opponent: "Arizona State", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 8, opponent: "Iowa State", location: "at", stadium: "Jack Trice Stadium" },
      { week: 9, opponent: "Cincinnati", location: "at", stadium: "Nippert Stadium" },
      { week: 10, opponent: "Texas Tech", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 11, opponent: "Baylor", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 12, opponent: "Colorado", location: "at", stadium: "Folsom Field" },
      { week: 13, opponent: "Houston", location: "vs", stadium: "Amon G. Carter Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Clemson",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "Washington", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 26, opponentScore: 59 },
      { week: 1, opponent: "Virginia", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 2, opponent: "NC State", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 3, opponent: "Georgia", location: "at", stadium: "Sanford Stadium" },
      { week: 4, opponent: "Syracuse", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 5, opponent: "Louisville", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 6, opponent: "Florida State", location: "vs", stadium: "Clemson Memorial Stadium" },
      { week: 7, opponent: "Stanford", location: "at", stadium: "Stanford Stadium" },
      { week: 8, opponent: "Boston College", location: "at", stadium: "Alumni Stadium" },
      { week: 9, opponent: "Miami", location: "at", stadium: "Hard Rock Stadium" },
      { week: 10, note: "BYE" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 13, opponent: "South Carolina", location: "at", stadium: "Williams-Brice Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Florida",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "South Alabama", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 41, opponentScore: 13 },
      { week: 2, opponent: "Louisville", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 3, opponent: "South Carolina", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 4, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium" },
      { week: 5, opponent: "North Carolina", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 6, opponent: "Vanderbilt", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 7, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium" },
      { week: 8, opponent: "Oklahoma", location: "at", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 9, opponent: "Alabama", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 10, opponent: "Georgia", location: "vs", neutral: true, stadium: "Raymond James Stadium" },
      { week: 11, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium" },
      { week: 12, note: "BYE" },
      { week: 13, opponent: "Florida State", location: "vs", stadium: "Ben Hill Griffin Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Oregon",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Iowa", location: "vs", stadium: "Autzen Stadium", teamScore: 56, opponentScore: 37 },
      { week: 2, opponent: "Colorado", location: "vs", stadium: "Autzen Stadium" },
      { week: 3, opponent: "Oregon State", location: "vs", stadium: "Autzen Stadium" },
      { week: 4, opponent: "Michigan", location: "at", stadium: "Michigan Stadium" },
      { week: 5, opponent: "Notre Dame", location: "at", stadium: "Notre Dame Stadium" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Ohio State", location: "vs", stadium: "Autzen Stadium" },
      { week: 8, opponent: "Purdue", location: "vs", stadium: "Autzen Stadium" },
      { week: 9, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium" },
      { week: 10, opponent: "Penn State", location: "vs", stadium: "Autzen Stadium" },
      { week: 11, opponent: "Maryland", location: "at", stadium: "SECU Stadium" },
      { week: 12, opponent: "Nebraska", location: "at", stadium: "Memorial Stadium" },
      { week: 13, opponent: "Washington", location: "at", stadium: "Husky Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Florida State",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Nebraska", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 58, opponentScore: 27 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Tennessee", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 4, opponent: "Pittsburgh", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 5, opponent: "Miami", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 6, opponent: "Clemson", location: "at", stadium: "Clemson Memorial Stadium" },
      { week: 7, opponent: "Louisville", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 8, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 9, opponent: "Wake Forest", location: "at", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 10, opponent: "Georgia Tech", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 11, opponent: "Virginia", location: "at", stadium: "Scott Stadium" },
      { week: 12, opponent: "Duke", location: "vs", stadium: "Doak Campbell Stadium" },
      { week: 13, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "SMU",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "South Carolina", location: "vs", neutral: true, stadium: "Mercedes-Benz Stadium" },
      { week: 2, opponent: "Oklahoma", location: "vs", stadium: "Gerald J. Ford Stadium" },
      { week: 3, opponent: "Virginia", location: "vs", stadium: "Gerald J. Ford Stadium" },
      { week: 4, opponent: "Stanford", location: "vs", stadium: "Gerald J. Ford Stadium" },
      { week: 5, opponent: "Virginia Tech", location: "at", stadium: "Lane Stadium" },
      { week: 6, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Colorado", location: "at", stadium: "Folsom Field" },
      { week: 9, opponent: "Georgia Tech", location: "vs", stadium: "Gerald J. Ford Stadium" },
      { week: 10, opponent: "Miami", location: "at", stadium: "Hard Rock Stadium" },
      { week: 11, opponent: "Pittsburgh", location: "at", stadium: "Acrisure Stadium" },
      { week: 12, opponent: "North Carolina", location: "vs", stadium: "Gerald J. Ford Stadium" },
      { week: 13, opponent: "Duke", location: "at", stadium: "Wallace Wade Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Washington",
    conference: "Big Ten",
    weeks: [
      { week: 0, opponent: "Clemson", location: "at", stadium: "Clemson Memorial Stadium", teamScore: 59, opponentScore: 26 },
      { week: 1, opponent: "Maryland", location: "vs", stadium: "Husky Stadium", teamScore: 38, opponentScore: 13 },
      { week: 2, opponent: "USC", location: "vs", stadium: "Husky Stadium" },
      { week: 3, opponent: "Washington St.", location: "vs", stadium: "Husky Stadium" },
      { week: 4, opponent: "Notre Dame", location: "vs", stadium: "Husky Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Michigan State", location: "vs", stadium: "Husky Stadium" },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Nebraska", location: "vs", stadium: "Husky Stadium" },
      { week: 9, opponent: "Rutgers", location: "at", stadium: "SHI Stadium" },
      { week: 10, opponent: "Northwestern", location: "at", stadium: "Ryan Field" },
      { week: 11, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium" },
      { week: 12, opponent: "Penn State", location: "at", stadium: "West Shore Home Field at Beaver Stadium" },
      { week: 13, opponent: "Oregon", location: "vs", stadium: "Husky Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "South Carolina",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "North Carolina", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 31, opponentScore: 21 },
      { week: 1, opponent: "SMU", location: "at", neutral: true, stadium: "Mercedes-Benz Stadium" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium" },
      { week: 4, opponent: "UCF", location: "vs", stadium: "Williams-Brice Stadium" },
      { week: 5, opponent: "Kentucky", location: "vs", stadium: "Williams-Brice Stadium" },
      { week: 6, opponent: "Arkansas", location: "vs", stadium: "Williams-Brice Stadium" },
      { week: 7, opponent: "Auburn", location: "vs", stadium: "Williams-Brice Stadium" },
      { week: 8, opponent: "Georgia", location: "at", stadium: "Sanford Stadium" },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium" },
      { week: 11, opponent: "Tennessee", location: "vs", stadium: "Williams-Brice Stadium" },
      { week: 12, opponent: "Mississippi St", location: "at", stadium: "Davis Wade Stadium" },
      { week: 13, opponent: "Clemson", location: "vs", stadium: "Williams-Brice Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Ohio State",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Alabama", location: "vs", stadium: "Ohio Stadium", teamScore: 35, opponentScore: 21 },
      { week: 2, opponent: "Notre Dame", location: "at", stadium: "Notre Dame Stadium" },
      { week: 3, opponent: "Marshall", location: "vs", stadium: "Ohio Stadium" },
      { week: 4, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium" },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Nebraska", location: "vs", stadium: "Ohio Stadium" },
      { week: 7, opponent: "Oregon", location: "at", stadium: "Autzen Stadium" },
      { week: 8, opponent: "Michigan State", location: "vs", stadium: "Ohio Stadium" },
      { week: 9, opponent: "USC", location: "vs", stadium: "Ohio Stadium" },
      { week: 10, opponent: "Purdue", location: "vs", stadium: "Ohio Stadium" },
      { week: 11, opponent: "Rutgers", location: "at", stadium: "SHI Stadium" },
      { week: 12, opponent: "Northwestern", location: "at", stadium: "Ryan Field" },
      { week: 13, opponent: "Michigan", location: "at", stadium: "Michigan Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Texas",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Michigan", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 38, opponentScore: 31 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "Ole Miss", location: "at", stadium: "Vaught-Hemingway Stadium" },
      { week: 3, opponent: "Alabama", location: "at", stadium: "Saban Field at Bryant-Denny Stadium" },
      { week: 4, opponent: "Tennessee", location: "at", stadium: "Neyland Stadium" },
      { week: 5, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium" },
      { week: 6, opponent: "Oklahoma", location: "vs", neutral: true, stadium: "Cotton Bowl" },
      { week: 7, opponent: "UTEP", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Oklahoma State", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 10, opponent: "South Carolina", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 11, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium" },
      { week: 12, opponent: "Missouri", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 13, opponent: "LSU", location: "vs", stadium: "Texas Memorial Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "USC",
    conference: "Big Ten",
    /* Coach is inactive for 2027, so this school is a CPU opponent
       and carries no coached schedule. */
    weeks: [
    ],
  },
  {
    team: "Georgia",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "UAB", location: "vs", stadium: "Sanford Stadium", teamScore: 40, opponentScore: 18 },
      { week: 2, opponent: "Charlotte", location: "vs", stadium: "Sanford Stadium" },
      { week: 3, opponent: "Clemson", location: "vs", stadium: "Sanford Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Texas A&M", location: "vs", stadium: "Sanford Stadium" },
      { week: 6, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium" },
      { week: 7, opponent: "Oklahoma", location: "vs", stadium: "Sanford Stadium" },
      { week: 8, opponent: "South Carolina", location: "vs", stadium: "Sanford Stadium" },
      { week: 9, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium" },
      { week: 10, opponent: "Florida", location: "at", neutral: true, stadium: "Raymond James Stadium" },
      { week: 11, opponent: "Vanderbilt", location: "vs", stadium: "Sanford Stadium" },
      { week: 12, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 13, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Michigan",
    conference: "Big Ten",
    weeks: [
      { week: 0, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium", teamScore: 31, opponentScore: 38 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "TCU", location: "vs", stadium: "Michigan Stadium" },
      { week: 3, opponent: "E. Michigan", location: "vs", stadium: "Michigan Stadium" },
      { week: 4, opponent: "Oregon", location: "vs", stadium: "Michigan Stadium" },
      { week: 5, opponent: "Indiana", location: "at", stadium: "Memorial Stadium" },
      { week: 6, opponent: "Penn State", location: "at", stadium: "West Shore Home Field at Beaver Stadium" },
      { week: 7, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium" },
      { week: 8, opponent: "Rutgers", location: "vs", stadium: "Michigan Stadium" },
      { week: 9, opponent: "Illinois", location: "vs", stadium: "Michigan Stadium" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Michigan State", location: "at", stadium: "Spartan Stadium" },
      { week: 12, opponent: "Iowa", location: "at", stadium: "Kinnick Stadium" },
      { week: 13, opponent: "Ohio State", location: "vs", stadium: "Michigan Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "West Virginia",
    conference: "Big 12",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Oklahoma", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 38, opponentScore: 14 },
      { week: 2, opponent: "LSU", location: "at", stadium: "Tiger Stadium" },
      { week: 3, opponent: "Oklahoma State", location: "at", stadium: "Boone Pickens Stadium" },
      { week: 4, opponent: "Arizona State", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 5, opponent: "Baylor", location: "at", stadium: "McLane Stadium" },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Marshall", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 8, opponent: "UCF", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 9, opponent: "Colorado", location: "at", stadium: "Folsom Field" },
      { week: 10, opponent: "Iowa State", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 11, opponent: "Cincinnati", location: "at", stadium: "Nippert Stadium" },
      { week: 12, opponent: "BYU", location: "vs", stadium: "Milan Puskar Stadium" },
      { week: 13, opponent: "Kansas State", location: "at", stadium: "Bill Snyder Family Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Colorado",
    conference: "Big 12",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Colorado State", location: "vs", stadium: "Folsom Field", teamScore: 54, opponentScore: 0 },
      { week: 2, opponent: "Oregon", location: "at", stadium: "Autzen Stadium" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Iowa State", location: "at", stadium: "Jack Trice Stadium" },
      { week: 5, opponent: "Houston", location: "at", stadium: "TDECU Stadium" },
      { week: 6, opponent: "Arizona", location: "at", stadium: "Casino Del Sol Stadium" },
      { week: 7, opponent: "UCF", location: "at", stadium: "Acrisure Bounce House" },
      { week: 8, opponent: "SMU", location: "vs", stadium: "Folsom Field" },
      { week: 9, opponent: "West Virginia", location: "vs", stadium: "Folsom Field" },
      { week: 10, opponent: "Kansas", location: "vs", stadium: "Folsom Field" },
      { week: 11, opponent: "Arizona State", location: "vs", stadium: "Folsom Field" },
      { week: 12, opponent: "TCU", location: "vs", stadium: "Folsom Field" },
      { week: 13, opponent: "BYU", location: "at", stadium: "LaVell Edwards Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wake Forest",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Tennessee", location: "vs", neutral: true, stadium: "Mercedes-Benz Stadium" },
      { week: 2, opponent: "Virginia", location: "at", stadium: "Scott Stadium" },
      { week: 3, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium" },
      { week: 4, opponent: "Duke", location: "at", stadium: "Wallace Wade Stadium" },
      { week: 5, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 6, opponent: "Notre Dame", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 7, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 8, opponent: "Kentucky", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 9, opponent: "Florida State", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 10, opponent: "Boston College", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 11, opponent: "NC State", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 12, opponent: "Virginia Tech", location: "vs", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 13, note: "BYE" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "UCLA",
    conference: "Big Ten",
    weeks: [
      { week: 0, opponent: "San Diego State", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 35, opponentScore: 10 },
      { week: 1, opponent: "California", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium" },
      { week: 4, opponent: "Iowa", location: "at", stadium: "Kinnick Stadium" },
      { week: 5, opponent: "Northwestern", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 6, opponent: "Fresno State", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 7, opponent: "Michigan", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 8, opponent: "Illinois", location: "at", stadium: "Gies Memorial Stadium" },
      { week: 9, opponent: "Oregon", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 10, opponent: "Wisconsin", location: "at", stadium: "Camp Randall Stadium" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Rutgers", location: "vs", stadium: "Rose Bowl Stadium" },
      { week: 13, opponent: "USC", location: "at", stadium: "Los Angeles Memorial Coliseum" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Miami",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Utah", location: "at", neutral: true, stadium: "Allegiant Stadium" },
      { week: 2, opponent: "Troy", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 3, opponent: "New Mexico St.", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 4, note: "BYE" },
      { week: 5, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium" },
      { week: 6, opponent: "Stanford", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 7, opponent: "Syracuse", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 8, opponent: "Virginia Tech", location: "at", stadium: "Lane Stadium" },
      { week: 9, opponent: "Clemson", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 10, opponent: "SMU", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 11, opponent: "Georgia Tech", location: "vs", stadium: "Hard Rock Stadium" },
      { week: 12, opponent: "Pittsburgh", location: "at", stadium: "Acrisure Stadium" },
      { week: 13, opponent: "California", location: "at", stadium: "California Memorial Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Notre Dame",
    conference: "Independent",
    weeks: [
      { week: 0, opponent: "Virginia Tech", location: "vs", stadium: "Notre Dame Stadium", teamScore: 63, opponentScore: 7 },
      { week: 1, opponent: "Purdue", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 2, opponent: "Ohio State", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 3, opponent: "TCU", location: "at", stadium: "Amon G. Carter Stadium" },
      { week: 4, opponent: "Washington", location: "at", stadium: "Husky Stadium" },
      { week: 5, opponent: "Oregon", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 6, opponent: "Wake Forest", location: "at", stadium: "Allegacy Federal Credit Union Stadium" },
      { week: 7, opponent: "USC", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Navy", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 10, opponent: "New Mexico", location: "vs", stadium: "Notre Dame Stadium" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Army", location: "at", stadium: "Michie Stadium" },
      { week: 13, opponent: "Stanford", location: "at", stadium: "Stanford Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "No conference championship (Independent)" },
    ],
  },
  {
    team: "Ole Miss",
    conference: "SEC",
    /* Coach is inactive for 2027, so this school is a CPU opponent
       and carries no coached schedule. */
    weeks: [
    ],
  },
  {
    team: "Oklahoma",
    conference: "SEC",
    weeks: [
      { week: 0, opponent: "Oklahoma State", location: "vs", stadium: "Gaylord-Oklahoma Memorial", teamScore: 45, opponentScore: 27 },
      { week: 1, opponent: "West Virginia", location: "at", stadium: "Milan Puskar Stadium", teamScore: 14, opponentScore: 38 },
      { week: 2, opponent: "SMU", location: "at", stadium: "Gerald J. Ford Stadium" },
      { week: 3, note: "BYE" },
      { week: 4, opponent: "Nebraska", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 5, opponent: "Vanderbilt", location: "at", stadium: "FirstBank Stadium" },
      { week: 6, opponent: "Texas", location: "at", neutral: true, stadium: "Cotton Bowl" },
      { week: 7, opponent: "Georgia", location: "at", stadium: "Sanford Stadium" },
      { week: 8, opponent: "Florida", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 9, opponent: "Kentucky", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Mississippi St", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 12, opponent: "Arkansas", location: "vs", stadium: "Gaylord-Oklahoma Memorial" },
      { week: 13, opponent: "Texas A&M", location: "at", stadium: "Kyle Field" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Alabama",
    conference: "SEC",
    /* CPU for all of 2027 — Woogity and Trick whitey both left after
       2026 and nobody has taken the school. No coached rows. */
    weeks: [
    ],
  },
  {
    team: "Louisville",
    conference: "ACC",
    /* Coach is inactive for 2027, so this school is a CPU opponent
       and carries no coached schedule. */
    weeks: [
    ],
  },
  {
    team: "LSU",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Houston", location: "vs", neutral: true, stadium: "Reliant Stadium", teamScore: 38, opponentScore: 0 },
      { week: 2, opponent: "West Virginia", location: "vs", stadium: "Tiger Stadium" },
      { week: 3, opponent: "Kentucky", location: "at", stadium: "Kroger Field" },
      { week: 4, opponent: "Louisiana Tech", location: "vs", stadium: "Tiger Stadium" },
      { week: 5, opponent: "Nevada", location: "vs", stadium: "Tiger Stadium" },
      { week: 6, opponent: "Tennessee", location: "vs", stadium: "Tiger Stadium" },
      { week: 7, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium" },
      { week: 8, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium" },
      { week: 9, opponent: "Mississippi St", location: "vs", stadium: "Tiger Stadium" },
      { week: 10, opponent: "Texas A&M", location: "vs", stadium: "Tiger Stadium" },
      { week: 11, note: "BYE" },
      { week: 12, opponent: "Georgia", location: "vs", stadium: "Tiger Stadium" },
      { week: 13, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium" },
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
