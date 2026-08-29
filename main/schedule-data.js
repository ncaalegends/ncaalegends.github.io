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
      { week: 1, opponent: "UCLA", location: "vs", stadium: "California Memorial Stadium", teamScore: 22, opponentScore: 9 },
      { week: 2, opponent: "Syracuse", location: "at", stadium: "JMA Wireless Dome", teamScore: 38, opponentScore: 17 },
      { week: 3, opponent: "FCS West", location: "vs", stadium: "California Memorial Stadium", teamScore: 63, opponentScore: 7 },
      { week: 4, opponent: "Clemson", location: "vs", stadium: "California Memorial Stadium", teamScore: 48, opponentScore: 37 },
      { week: 5, opponent: "UNLV", location: "at", stadium: "Allegiant Stadium", teamScore: 49, opponentScore: 7 },
      { week: 6, opponent: "Virginia Tech", location: "vs", stadium: "California Memorial Stadium", teamScore: 52, opponentScore: 7 },
      { week: 7, opponent: "Wake Forest", location: "vs", stadium: "California Memorial Stadium", teamScore: 38, opponentScore: 23 },
      { week: 8, opponent: "SMU", location: "at", stadium: "Gerald J. Ford Stadium", teamScore: 48, opponentScore: 31 },
      { week: 9, opponent: "NC State", location: "at", stadium: "Carter-Finley Stadium", teamScore: 28, opponentScore: 20 },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Virginia", location: "at", stadium: "Scott Stadium", teamScore: 38, opponentScore: 24 },
      { week: 12, opponent: "Stanford", location: "vs", stadium: "California Memorial Stadium", teamScore: 24, opponentScore: 30 },
      { week: 13, opponent: "Pittsburgh", location: "vs", stadium: "California Memorial Stadium", teamScore: 44, opponentScore: 10 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Clemson", location: "at", neutral: true, stadium: "Bank of America Stadium", title: "ACC Championship", round: "ccg" },
    ],
  },
  {
    team: "TCU",
    conference: "Big 12",
    weeks: [
      { week: 0, opponent: "North Carolina", location: "vs", stadium: "Dublin Stadium", teamScore: 27, opponentScore: 17 },
      { week: 1, note: "BYE" },
      { week: 2, opponent: "FCS Midwest", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 63, opponentScore: 9 },
      { week: 3, opponent: "Arkansas State", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 59, opponentScore: 10 },
      { week: 4, opponent: "UCF", location: "at", stadium: "Acrisure Bounce House", teamScore: 28, opponentScore: 38 },
      { week: 5, opponent: "BYU", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 33, opponentScore: 14 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Baylor", location: "at", stadium: "McLane Stadium", teamScore: 30, opponentScore: 16 },
      { week: 8, opponent: "West Virginia", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 35, opponentScore: 32 },
      { week: 9, opponent: "Kansas", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 49, opponentScore: 7 },
      { week: 10, opponent: "Arizona", location: "at", stadium: "Casino Del Sol Stadium", teamScore: 37, opponentScore: 31 },
      { week: 11, opponent: "Kansas State", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 27, opponentScore: 7 },
      { week: 12, opponent: "Utah", location: "vs", stadium: "Amon G. Carter Stadium", teamScore: 41, opponentScore: 3 },
      { week: 13, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium", teamScore: 24, opponentScore: 14 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "West Virginia", location: "at", neutral: true, stadium: "AT&T Stadium", title: "Big 12 Championship", round: "ccg" },
    ],
  },
  {
    team: "Clemson",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "LSU", location: "at", stadium: "Tiger Stadium", teamScore: 21, opponentScore: 37 },
      { week: 2, opponent: "Ga Southern", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 37, opponentScore: 17 },
      { week: 3, opponent: "North Carolina", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 59, opponentScore: 20 },
      { week: 4, opponent: "California", location: "at", stadium: "California Memorial Stadium", teamScore: 37, opponentScore: 48 },
      { week: 5, opponent: "Miami", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 38, opponentScore: 23 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "FCS Southeast", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 66, opponentScore: 3 },
      { week: 8, opponent: "Virginia Tech", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 40, opponentScore: 10 },
      { week: 9, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium", teamScore: 35, opponentScore: 7 },
      { week: 10, opponent: "Syracuse", location: "at", stadium: "JMA Wireless Dome", teamScore: 39, opponentScore: 10 },
      { week: 11, opponent: "Georgia Tech", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 37, opponentScore: 14 },
      { week: 12, opponent: "Duke", location: "at", stadium: "Wallace Wade Stadium", teamScore: 37, opponentScore: 7 },
      { week: 13, opponent: "South Carolina", location: "vs", stadium: "Clemson Memorial Stadium", teamScore: 34, opponentScore: 32 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "California", location: "vs", neutral: true, stadium: "Bank of America Stadium", title: "ACC Championship", round: "ccg" },
    ],
  },
  {
    team: "Florida",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "FLA Atlantic", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 41, opponentScore: 10 },
      { week: 2, opponent: "FCS Southeast", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 63, opponentScore: 3 },
      { week: 3, opponent: "Auburn", location: "at", stadium: "Jordan-Hare Stadium", teamScore: 28, opponentScore: 24 },
      { week: 4, opponent: "Ole Miss", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 18, opponentScore: 38 },
      { week: 5, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium", teamScore: 51, opponentScore: 31 },
      { week: 6, opponent: "South Carolina", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 21, opponentScore: 27 },
      { week: 7, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium", teamScore: 0, opponentScore: 10 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Georgia", location: "at", stadium: "Mercedes-Benz Stadium", teamScore: 28, opponentScore: 31 },
      { week: 10, opponent: "Oklahoma", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 31, opponentScore: 17 },
      { week: 11, opponent: "Kentucky", location: "at", stadium: "Kroger Field", teamScore: 28, opponentScore: 21 },
      { week: 12, opponent: "Vanderbilt", location: "vs", stadium: "Ben Hill Griffin Stadium", teamScore: 52, opponentScore: 10 },
      { week: 13, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium", teamScore: 18, opponentScore: 14 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Oregon",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Boise State", location: "vs", stadium: "Autzen Stadium", teamScore: 42, opponentScore: 7 },
      { week: 2, opponent: "Oklahoma State", location: "at", stadium: "Boone Pickens Stadium", teamScore: 42, opponentScore: 17 },
      { week: 3, opponent: "FCS Northwest", location: "vs", stadium: "Autzen Stadium", teamScore: 53, opponentScore: 14 },
      { week: 4, opponent: "USC", location: "at", stadium: "Los Angeles Memorial Coliseum", teamScore: 28, opponentScore: 33 },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "UCLA", location: "vs", stadium: "Autzen Stadium", teamScore: 28, opponentScore: 29 },
      { week: 7, opponent: "Nebraska", location: "vs", stadium: "Autzen Stadium", teamScore: 55, opponentScore: 17 },
      { week: 8, opponent: "Illinois", location: "at", stadium: "Gies Memorial Stadium", teamScore: 73, opponentScore: 13 },
      { week: 9, opponent: "Northwestern", location: "vs", stadium: "Autzen Stadium", teamScore: 47, opponentScore: 7 },
      { week: 10, opponent: "Ohio State", location: "at", stadium: "Ohio Stadium", teamScore: 37, opponentScore: 44 },
      { week: 11, opponent: "Michigan", location: "vs", stadium: "Autzen Stadium", teamScore: 21, opponentScore: 0 },
      { week: 12, opponent: "Michigan State", location: "at", stadium: "Spartan Stadium", teamScore: 42, opponentScore: 6 },
      { week: 13, opponent: "Washington", location: "vs", stadium: "Autzen Stadium", teamScore: 24, opponentScore: 14 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Florida State",
    conference: "ACC",
    weeks: [
      { week: 0, opponent: "New Mexico St.", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 49, opponentScore: 37 },
      { week: 1, opponent: "SMU", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 21, opponentScore: 28 },
      { week: 2, note: "BYE" },
      { week: 3, opponent: "Alabama", location: "at", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 31, opponentScore: 30 },
      { week: 4, opponent: "FCS Southeast", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 59, opponentScore: 14 },
      { week: 5, opponent: "Virginia", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 37, opponentScore: 24 },
      { week: 6, opponent: "Louisville", location: "at", stadium: "L&N Stadium", teamScore: 36, opponentScore: 24 },
      { week: 7, opponent: "Miami", location: "at", stadium: "Hard Rock Stadium", teamScore: 16, opponentScore: 31 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Clemson", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 7, opponentScore: 35 },
      { week: 10, opponent: "Boston College", location: "at", stadium: "Alumni Stadium", teamScore: 52, opponentScore: 14 },
      { week: 11, opponent: "Pittsburgh", location: "at", stadium: "Acrisure Stadium", teamScore: 42, opponentScore: 28 },
      { week: 12, opponent: "NC State", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 42, opponentScore: 24 },
      { week: 13, opponent: "Florida", location: "vs", stadium: "Doak Campbell Stadium", teamScore: 14, opponentScore: 18 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "SMU",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Florida State", location: "at", stadium: "Doak Campbell Stadium", teamScore: 28, opponentScore: 21 },
      { week: 2, opponent: "FCS Midwest", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 30, opponentScore: 3 },
      { week: 3, opponent: "Louisville", location: "at", stadium: "L&N Stadium", teamScore: 20, opponentScore: 10 },
      { week: 4, opponent: "Missouri State", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 28, opponentScore: 0 },
      { week: 5, opponent: "Boston College", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 27, opponentScore: 24 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Virginia", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 20, opponentScore: 17 },
      { week: 8, opponent: "California", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 31, opponentScore: 48 },
      { week: 9, opponent: "Syracuse", location: "at", stadium: "JMA Wireless Dome", teamScore: 20, opponentScore: 17 },
      { week: 10, opponent: "Virginia Tech", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 34, opponentScore: 14 },
      { week: 11, opponent: "Wake Forest", location: "vs", stadium: "Gerald J. Ford Stadium", teamScore: 23, opponentScore: 10 },
      { week: 12, opponent: "Notre Dame", location: "at", stadium: "Notre Dame Stadium", teamScore: 28, opponentScore: 30 },
      { week: 13, opponent: "Stanford", location: "at", stadium: "Stanford Stadium", teamScore: 14, opponentScore: 24 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Washington",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Washington St.", location: "vs", stadium: "Husky Stadium", teamScore: 38, opponentScore: 28 },
      { week: 2, opponent: "Utah State", location: "vs", stadium: "Husky Stadium", teamScore: 48, opponentScore: 20 },
      { week: 3, opponent: "FCS Northwest", location: "vs", stadium: "Husky Stadium", teamScore: 63, opponentScore: 0 },
      { week: 4, opponent: "Minnesota", location: "vs", stadium: "Husky Stadium", teamScore: 52, opponentScore: 0 },
      { week: 5, opponent: "USC", location: "at", stadium: "Los Angeles Memorial Coliseum", teamScore: 31, opponentScore: 24 },
      { week: 6, opponent: "Iowa", location: "vs", stadium: "Husky Stadium", teamScore: 28, opponentScore: 7 },
      { week: 7, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium", teamScore: 56, opponentScore: 7 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Nebraska", location: "at", stadium: "Memorial Stadium", teamScore: 56, opponentScore: 14 },
      { week: 10, opponent: "Penn State", location: "vs", stadium: "Husky Stadium", teamScore: 23, opponentScore: 21 },
      { week: 11, opponent: "Michigan State", location: "at", stadium: "Spartan Stadium", teamScore: 38, opponentScore: 27 },
      { week: 12, opponent: "Indiana", location: "vs", stadium: "Husky Stadium", teamScore: 20, opponentScore: 15 },
      { week: 13, opponent: "Oregon", location: "at", stadium: "Autzen Stadium", teamScore: 14, opponentScore: 24 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Ohio State", location: "vs", neutral: true, stadium: "Lucas Oil Stadium", title: "Big Ten Championship", round: "ccg", teamScore: 0, opponentScore: 31 },
    ],
  },
  {
    team: "South Carolina",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Kent State", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 52, opponentScore: 15 },
      { week: 2, opponent: "FCS Southeast", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 62, opponentScore: 10 },
      { week: 3, opponent: "Mississippi St", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 17, opponentScore: 10 },
      { week: 4, opponent: "Alabama", location: "at", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 41, opponentScore: 29 },
      { week: 5, opponent: "Kentucky", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 45, opponentScore: 3 },
      { week: 6, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium", teamScore: 27, opponentScore: 21 },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Tennessee", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 27, opponentScore: 14 },
      { week: 9, opponent: "Oklahoma", location: "at", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 27, opponentScore: 14 },
      { week: 10, opponent: "Texas A&M", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 21, opponentScore: 14 },
      { week: 11, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium", teamScore: 24, opponentScore: 7 },
      { week: 12, opponent: "Georgia", location: "vs", stadium: "Williams-Brice Stadium", teamScore: 20, opponentScore: 37 },
      { week: 13, opponent: "Clemson", location: "at", stadium: "Clemson Memorial Stadium", teamScore: 32, opponentScore: 34 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Texas", location: "at", neutral: true, stadium: "Mercedes-Benz Stadium", title: "SEC Championship", round: "ccg" },
    ],
  },
  {
    team: "Ohio State",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Ball State", location: "vs", stadium: "Ohio Stadium", teamScore: 50, opponentScore: 10 },
      { week: 2, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium", teamScore: 35, opponentScore: 42 },
      { week: 3, opponent: "Kent State", location: "vs", stadium: "Ohio Stadium", teamScore: 45, opponentScore: 3 },
      { week: 4, opponent: "Illinois", location: "vs", stadium: "Ohio Stadium", teamScore: 55, opponentScore: 31 },
      { week: 5, opponent: "Iowa", location: "at", stadium: "Kinnick Stadium", teamScore: 35, opponentScore: 19 },
      { week: 6, opponent: "Maryland", location: "vs", stadium: "Ohio Stadium", teamScore: 45, opponentScore: 24 },
      { week: 7, opponent: "Indiana", location: "at", stadium: "Memorial Stadium", teamScore: 46, opponentScore: 27 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "USC", location: "at", stadium: "Los Angeles Memorial Coliseum", teamScore: 37, opponentScore: 24 },
      { week: 10, opponent: "Oregon", location: "vs", stadium: "Ohio Stadium", teamScore: 44, opponentScore: 37 },
      { week: 11, opponent: "Northwestern", location: "vs", stadium: "Ohio Stadium", teamScore: 38, opponentScore: 17 },
      { week: 12, opponent: "Nebraska", location: "at", stadium: "Memorial Stadium", teamScore: 43, opponentScore: 28 },
      { week: 13, opponent: "Michigan", location: "vs", stadium: "Ohio Stadium", teamScore: 21, opponentScore: 31 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "Washington", location: "at", neutral: true, stadium: "Lucas Oil Stadium", title: "Big Ten Championship", round: "ccg", teamScore: 31, opponentScore: 0 },
    ],
  },
  {
    team: "Texas",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Texas State", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 51, opponentScore: 7 },
      { week: 2, opponent: "Ohio State", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 42, opponentScore: 35 },
      { week: 3, opponent: "UTSA", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 59, opponentScore: 35 },
      { week: 4, opponent: "Tennessee", location: "at", stadium: "Neyland Stadium", teamScore: 31, opponentScore: 44 },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Oklahoma", location: "at", stadium: "Cotton Bowl", teamScore: 42, opponentScore: 7 },
      { week: 7, opponent: "Florida", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 10, opponentScore: 0 },
      { week: 8, opponent: "Ole Miss", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 37, opponentScore: 14, sim: true },
      { week: 9, opponent: "Mississippi St", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 44, opponentScore: 21 },
      { week: 10, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium", teamScore: 28, opponentScore: 21 },
      { week: 11, opponent: "LSU", location: "at", stadium: "Tiger Stadium", teamScore: 31, opponentScore: 13 },
      { week: 12, opponent: "Arkansas", location: "vs", stadium: "Texas Memorial Stadium", teamScore: 24, opponentScore: 10 },
      { week: 13, opponent: "Texas A&M", location: "at", stadium: "Kyle Field", teamScore: 21, opponentScore: 50 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "South Carolina", location: "vs", neutral: true, stadium: "Mercedes-Benz Stadium", title: "SEC Championship", round: "ccg" },
    ],
  },
  {
    team: "USC",
    conference: "Big Ten",
    weeks: [
      { week: 0, opponent: "San Jose State", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 38, opponentScore: 14 },
      { week: 1, opponent: "Fresno State", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 41, opponentScore: 23 },
      { week: 2, opponent: "Louisiana", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 54, opponentScore: 0 },
      { week: 3, opponent: "Rutgers", location: "at", stadium: "SHI Stadium", teamScore: 41, opponentScore: 23 },
      { week: 4, opponent: "Oregon", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 33, opponentScore: 28 },
      { week: 5, opponent: "Washington", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 24, opponentScore: 31 },
      { week: 6, opponent: "Penn State", location: "at", stadium: "West Shore Home Field at Beaver Stadium", teamScore: 38, opponentScore: 27 },
      { week: 7, note: "BYE" },
      { week: 8, opponent: "Wisconsin", location: "at", stadium: "Camp Randall Stadium", teamScore: 42, opponentScore: 10 },
      { week: 9, opponent: "Ohio State", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 24, opponentScore: 37 },
      { week: 10, note: "BYE" },
      { week: 11, opponent: "Indiana", location: "at", stadium: "Memorial Stadium", teamScore: 19, opponentScore: 44 },
      { week: 12, opponent: "Maryland", location: "vs", stadium: "Los Angeles Memorial Coliseum", teamScore: 59, opponentScore: 7 },
      { week: 13, opponent: "UCLA", location: "at", stadium: "Rose Bowl Stadium", teamScore: 35, opponentScore: 28 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Georgia",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "FCS Southeast", location: "vs", stadium: "Sanford Stadium", teamScore: 37, opponentScore: 19 },
      { week: 2, opponent: "W. Kentucky", location: "vs", stadium: "Sanford Stadium", teamScore: 56, opponentScore: 17 },
      { week: 3, opponent: "Arkansas", location: "at", stadium: "DW Reynolds Razorback Stadium", teamScore: 31, opponentScore: 17 },
      { week: 4, opponent: "Oklahoma", location: "vs", stadium: "Sanford Stadium", teamScore: 21, opponentScore: 49 },
      { week: 5, opponent: "Vanderbilt", location: "vs", stadium: "Sanford Stadium", teamScore: 52, opponentScore: 26 },
      { week: 6, opponent: "Alabama", location: "at", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 31, opponentScore: 10 },
      { week: 7, opponent: "Auburn", location: "vs", stadium: "Sanford Stadium", teamScore: 41, opponentScore: 34 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Florida", location: "vs", stadium: "Mercedes-Benz Stadium", teamScore: 31, opponentScore: 28 },
      { week: 10, opponent: "Ole Miss", location: "at", stadium: "Vaught-Hemingway Stadium", teamScore: 27, opponentScore: 33 },
      { week: 11, opponent: "Missouri", location: "vs", stadium: "Sanford Stadium", teamScore: 34, opponentScore: 24 },
      { week: 12, opponent: "South Carolina", location: "at", stadium: "Williams-Brice Stadium", teamScore: 37, opponentScore: 20 },
      { week: 13, opponent: "Georgia Tech", location: "vs", stadium: "Sanford Stadium", teamScore: 41, opponentScore: 7 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Michigan",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "W. Michigan", location: "vs", stadium: "Michigan Stadium", teamScore: 42, opponentScore: 17 },
      { week: 2, opponent: "Oklahoma", location: "vs", stadium: "Michigan Stadium", teamScore: 24, opponentScore: 14 },
      { week: 3, opponent: "UTEP", location: "vs", stadium: "Michigan Stadium", teamScore: 39, opponentScore: 6 },
      { week: 4, opponent: "Iowa", location: "vs", stadium: "Michigan Stadium", teamScore: 35, opponentScore: 3 },
      { week: 5, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium", teamScore: 48, opponentScore: 13 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Penn State", location: "vs", stadium: "Michigan Stadium", teamScore: 35, opponentScore: 14 },
      { week: 8, opponent: "Indiana", location: "vs", stadium: "Michigan Stadium", teamScore: 31, opponentScore: 30 },
      { week: 9, opponent: "Rutgers", location: "at", stadium: "SHI Stadium", teamScore: 40, opponentScore: 14 },
      { week: 10, opponent: "Michigan State", location: "vs", stadium: "Michigan Stadium", teamScore: 31, opponentScore: 10 },
      { week: 11, opponent: "Oregon", location: "at", stadium: "Autzen Stadium", teamScore: 0, opponentScore: 21 },
      { week: 12, opponent: "UCLA", location: "vs", stadium: "Michigan Stadium", teamScore: 28, opponentScore: 38 },
      { week: 13, opponent: "Ohio State", location: "at", stadium: "Ohio Stadium", teamScore: 31, opponentScore: 21 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "West Virginia",
    conference: "Big 12",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Coastal Carolina", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 55, opponentScore: 14 },
      { week: 2, opponent: "FCS East", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 62, opponentScore: 21 },
      { week: 3, opponent: "Virginia", location: "vs", stadium: "Bank of America Stadium", teamScore: 48, opponentScore: 42 },
      { week: 4, opponent: "Oklahoma State", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 56, opponentScore: 3 },
      { week: 5, opponent: "Iowa State", location: "at", stadium: "Jack Trice Stadium", teamScore: 42, opponentScore: 21 },
      { week: 6, opponent: "Arizona", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 36, opponentScore: 31 },
      { week: 7, opponent: "Cincinnati", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 24, opponentScore: 10 },
      { week: 8, opponent: "TCU", location: "at", stadium: "Amon G. Carter Stadium", teamScore: 32, opponentScore: 35 },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "Texas Tech", location: "at", stadium: "Jones Stadium", teamScore: 31, opponentScore: 28 },
      { week: 11, opponent: "Kansas", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 34, opponentScore: 17 },
      { week: 12, opponent: "Houston", location: "vs", stadium: "Milan Puskar Stadium", teamScore: 34, opponentScore: 31 },
      { week: 13, opponent: "Utah", location: "at", stadium: "Rice-Eccles Stadium", teamScore: 28, opponentScore: 27 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, opponent: "TCU", location: "vs", neutral: true, stadium: "AT&T Stadium", title: "Big 12 Championship", round: "ccg" },
    ],
  },
  {
    team: "Colorado",
    conference: "Big 12",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium", teamScore: 40, opponentScore: 28 },
      { week: 2, opponent: "FCS Midwest", location: "vs", stadium: "Folsom Field", teamScore: 49, opponentScore: 3 },
      { week: 3, opponent: "Northwestern", location: "at", stadium: "Ryan Field", teamScore: 35, opponentScore: 28 },
      { week: 4, opponent: "Baylor", location: "at", stadium: "McLane Stadium", teamScore: 36, opponentScore: 35 },
      { week: 5, opponent: "Texas Tech", location: "vs", stadium: "Folsom Field", teamScore: 35, opponentScore: 28 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Utah", location: "vs", stadium: "Folsom Field", teamScore: 34, opponentScore: 10 },
      { week: 8, opponent: "Oklahoma State", location: "at", stadium: "Boone Pickens Stadium", teamScore: 49, opponentScore: 10 },
      { week: 9, opponent: "Kansas State", location: "vs", stadium: "Folsom Field", teamScore: 47, opponentScore: 31 },
      { week: 10, opponent: "Arizona State", location: "at", stadium: "Mountain America Stadium", teamScore: 21, opponentScore: 35 },
      { week: 11, opponent: "Houston", location: "vs", stadium: "Folsom Field", teamScore: 24, opponentScore: 20 },
      { week: 12, opponent: "Cincinnati", location: "at", stadium: "Nippert Stadium", teamScore: 27, opponentScore: 24 },
      { week: 13, opponent: "UCF", location: "vs", stadium: "Folsom Field", teamScore: 49, opponentScore: 31 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Wake Forest",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Akron", location: "vs", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 38, opponentScore: 24 },
      { week: 2, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium", teamScore: 35, opponentScore: 13 },
      { week: 3, opponent: "Miami", location: "vs", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 15, opponentScore: 48 },
      { week: 4, opponent: "Louisville", location: "at", stadium: "L&N Stadium", teamScore: 34, opponentScore: 31 },
      { week: 5, opponent: "Stanford", location: "vs", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 38, opponentScore: 14 },
      { week: 6, opponent: "NC State", location: "at", stadium: "Carter-Finley Stadium", teamScore: 39, opponentScore: 38 },
      { week: 7, opponent: "California", location: "at", stadium: "California Memorial Stadium", teamScore: 23, opponentScore: 38 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Virginia", location: "vs", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 34, opponentScore: 31 },
      { week: 10, opponent: "FCS Southeast", location: "vs", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 55, opponentScore: 0 },
      { week: 11, opponent: "SMU", location: "at", stadium: "Gerald J. Ford Stadium", teamScore: 10, opponentScore: 23 },
      { week: 12, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium", teamScore: 24, opponentScore: 30 },
      { week: 13, opponent: "Duke", location: "vs", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 44, opponentScore: 27 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "UCLA",
    conference: "Big Ten",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "California", location: "at", stadium: "California Memorial Stadium", teamScore: 9, opponentScore: 22 },
      { week: 2, opponent: "San Diego St.", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 45, opponentScore: 7 },
      { week: 3, opponent: "Purdue", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 18, opponentScore: 14 },
      { week: 4, opponent: "Maryland", location: "at", stadium: "SECU Stadium", teamScore: 35, opponentScore: 28 },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Oregon", location: "at", stadium: "Autzen Stadium", teamScore: 29, opponentScore: 28 },
      { week: 7, opponent: "Wisconsin", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 31, opponentScore: 28 },
      { week: 8, opponent: "Michigan State", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 21, opponentScore: 17 },
      { week: 9, opponent: "Nevada", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 20, opponentScore: 17 },
      { week: 10, opponent: "Minnesota", location: "at", stadium: "Huntington Bank Stadium", teamScore: 24, opponentScore: 12 },
      { week: 11, opponent: "Illinois", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 49, opponentScore: 10 },
      { week: 12, opponent: "Michigan", location: "at", stadium: "Michigan Stadium", teamScore: 38, opponentScore: 28 },
      { week: 13, opponent: "USC", location: "vs", stadium: "Rose Bowl Stadium", teamScore: 28, opponentScore: 35 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Miami",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Stanford", location: "at", stadium: "Stanford Stadium", teamScore: 30, opponentScore: 23 },
      { week: 2, opponent: "FCS Southeast", location: "vs", stadium: "Hard Rock Stadium", teamScore: 37, opponentScore: 3 },
      { week: 3, opponent: "Wake Forest", location: "at", stadium: "Allegacy Federal Credit Union Stadium", teamScore: 48, opponentScore: 15 },
      { week: 4, opponent: "C. Michigan", location: "vs", stadium: "Hard Rock Stadium", teamScore: 35, opponentScore: 3 },
      { week: 5, opponent: "Clemson", location: "at", stadium: "Clemson Memorial Stadium", teamScore: 23, opponentScore: 38 },
      { week: 6, note: "BYE" },
      { week: 7, opponent: "Florida State", location: "vs", stadium: "Hard Rock Stadium", teamScore: 31, opponentScore: 16 },
      { week: 8, opponent: "Pittsburgh", location: "vs", stadium: "Hard Rock Stadium", teamScore: 14, opponentScore: 33 },
      { week: 9, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium", teamScore: 13, opponentScore: 20 },
      { week: 10, opponent: "Notre Dame", location: "at", stadium: "Notre Dame Stadium", teamScore: 21, opponentScore: 24 },
      { week: 11, opponent: "Duke", location: "vs", stadium: "Hard Rock Stadium", teamScore: 21, opponentScore: 29 },
      { week: 12, opponent: "Virginia Tech", location: "vs", stadium: "Hard Rock Stadium", teamScore: 38, opponentScore: 17 },
      { week: 13, opponent: "Boston College", location: "vs", stadium: "Hard Rock Stadium", teamScore: 25, opponentScore: 21 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Notre Dame",
    conference: "Independent",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "Wisconsin", location: "vs", stadium: "Notre Dame Stadium", teamScore: 44, opponentScore: 14 },
      { week: 2, opponent: "Rice", location: "vs", stadium: "Notre Dame Stadium", teamScore: 69, opponentScore: 17 },
      { week: 3, opponent: "Michigan State", location: "vs", stadium: "Notre Dame Stadium", teamScore: 59, opponentScore: 3 },
      { week: 4, opponent: "Purdue", location: "at", stadium: "Ross-Ade Stadium", teamScore: 60, opponentScore: 21 },
      { week: 5, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium", teamScore: 45, opponentScore: 13 },
      { week: 6, opponent: "Stanford", location: "vs", stadium: "Notre Dame Stadium", teamScore: 48, opponentScore: 34 },
      { week: 7, opponent: "BYU", location: "at", stadium: "LaVell Edwards Stadium", teamScore: 34, opponentScore: 17 },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Navy", location: "at", stadium: "Gillette Stadium", teamScore: 55, opponentScore: 24 },
      { week: 10, opponent: "Miami", location: "vs", stadium: "Notre Dame Stadium", teamScore: 24, opponentScore: 21 },
      { week: 11, opponent: "Boston College", location: "vs", stadium: "Notre Dame Stadium", teamScore: 38, opponentScore: 15 },
      { week: 12, opponent: "SMU", location: "vs", stadium: "Notre Dame Stadium", teamScore: 30, opponentScore: 28 },
      { week: 13, opponent: "Syracuse", location: "at", stadium: "JMA Wireless Dome", teamScore: 40, opponentScore: 10 },
      { week: 14, note: "Army-Navy Week" },
      // Week 15 was not visible in the screenshots. Notre Dame is an
      // independent so it plays no conference championship - confirm
      // whether the game shows OPEN here and adjust if needed.
      { week: 15, note: "No conference championship (Independent)" },
    ],
  },
  {
    team: "Ole Miss",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      // Neutral site - listed "vs" in-game but played at Nissan Stadium
      // in Nashville, not Vaught-Hemingway.
      { week: 1, opponent: "Louisville", location: "vs", stadium: "Nissan Stadium", teamScore: 47, opponentScore: 17 },
      { week: 2, opponent: "Charlotte", location: "vs", stadium: "Vaught-Hemingway Stadium", teamScore: 80, opponentScore: 0 },
      { week: 3, opponent: "LSU", location: "vs", stadium: "Vaught-Hemingway Stadium", teamScore: 45, opponentScore: 35 },
      { week: 4, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium", teamScore: 38, opponentScore: 18 },
      { week: 5, note: "BYE" },
      { week: 6, opponent: "Vanderbilt", location: "at", stadium: "FirstBank Stadium", teamScore: 17, opponentScore: 15 },
      { week: 7, opponent: "Missouri", location: "vs", stadium: "Vaught-Hemingway Stadium", teamScore: 13, opponentScore: 55 },
      { week: 8, opponent: "Texas", location: "at", stadium: "Texas Memorial Stadium", teamScore: 14, opponentScore: 37, sim: true },
      { week: 9, opponent: "Auburn", location: "vs", stadium: "Vaught-Hemingway Stadium", teamScore: 20, opponentScore: 38 },
      { week: 10, opponent: "Georgia", location: "vs", stadium: "Vaught-Hemingway Stadium" },
      { week: 11, opponent: "Oklahoma", location: "at", stadium: "Gaylord Family Oklahoma Memorial Stadium" },
      { week: 12, opponent: "FCS Southeast", location: "vs", stadium: "Vaught-Hemingway Stadium" },
      { week: 13, opponent: "Mississippi St", location: "vs", stadium: "Vaught-Hemingway Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Oklahoma",
    conference: "SEC",
    weeks: [
      { week: 0, note: "BYE" },
      { week: 1, opponent: "UTEP", location: "vs", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 27, opponentScore: 7 },
      { week: 2, opponent: "Michigan", location: "at", stadium: "Michigan Stadium", teamScore: 14, opponentScore: 24 },
      { week: 3, opponent: "New Mexico", location: "vs", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 49, opponentScore: 14 },
      { week: 4, opponent: "Georgia", location: "at", stadium: "Sanford Stadium", teamScore: 49, opponentScore: 21 },
      { week: 5, note: "BYE" },
      // Red River rivalry - listed "vs" on Oklahoma's screen but played
      // at the neutral-site Cotton Bowl, which is what Texas's file says.
      { week: 6, opponent: "Texas", location: "vs", stadium: "Cotton Bowl", teamScore: 7, opponentScore: 42 },
      { week: 7, opponent: "Kentucky", location: "vs", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 31, opponentScore: 24 },
      { week: 8, opponent: "Mississippi State", location: "at", stadium: "Davis Wade Stadium", teamScore: 45, opponentScore: 10 },
      { week: 9, opponent: "South Carolina", location: "vs", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 14, opponentScore: 27 },
      { week: 10, opponent: "Florida", location: "at", stadium: "Ben Hill Griffin Stadium", teamScore: 17, opponentScore: 31 },
      { week: 11, opponent: "Ole Miss", location: "vs", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 17, opponentScore: 13 },
      { week: 12, opponent: "Texas A&M", location: "vs", stadium: "Gaylord Family Oklahoma Memorial Stadium", teamScore: 18, opponentScore: 28 },
      { week: 13, opponent: "Missouri", location: "at", stadium: "Faurot Field at Memorial Stadium", teamScore: 21, opponentScore: 14 },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
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
      { week: 0, note: "BYE" },
      { week: 1, opponent: "East Carolina", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 70, opponentScore: 10 },
      { week: 2, opponent: "Kentucky", location: "at", stadium: "Kroger Field", teamScore: 31, opponentScore: 27 },
      { week: 3, opponent: "Florida State", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 30, opponentScore: 31 },
      { week: 4, opponent: "South Carolina", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 29, opponentScore: 41 },
      { week: 5, opponent: "Mississippi State", location: "at", stadium: "Davis Wade Stadium", teamScore: 30, opponentScore: 38 },
      { week: 6, opponent: "Georgia", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 10, opponentScore: 31 },
      { week: 7, opponent: "Tennessee", location: "at", stadium: "Neyland Stadium", teamScore: 17, opponentScore: 27 },
      { week: 8, opponent: "Texas A&M", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 48, opponentScore: 26 },
      { week: 9, note: "BYE" },
      { week: 10, opponent: "LSU", location: "at", stadium: "Tiger Stadium", teamScore: 16, opponentScore: 49 },
      { week: 11, opponent: "Vanderbilt", location: "at", stadium: "FirstBank Stadium", teamScore: 45, opponentScore: 3 },
      { week: 12, opponent: "FCS Southeast", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium", teamScore: 51, opponentScore: 17 },
      { week: 13, opponent: "Auburn", location: "vs", stadium: "Saban Field at Bryant-Denny Stadium" },
      { week: 14, note: "Army-Navy Week" },
      { week: 15, note: "BYE" },
    ],
  },
  {
    team: "Louisville",
    conference: "ACC",
    weeks: [
      { week: 0, note: "BYE" },
      // Neutral site - listed "vs" on both teams' screens but played at
      // Nissan Stadium in Nashville, which matches Ole Miss's file.
      { week: 1, opponent: "Ole Miss", location: "vs", stadium: "Nissan Stadium" },
      { week: 2, opponent: "FCS Southeast", location: "vs", stadium: "L&N Stadium" },
      { week: 3, opponent: "SMU", location: "vs", stadium: "L&N Stadium" },
      { week: 4, opponent: "Wake Forest", location: "vs", stadium: "L&N Stadium" },
      { week: 5, opponent: "NC State", location: "at", stadium: "Carter-Finley Stadium" },
      { week: 6, opponent: "Florida State", location: "vs", stadium: "L&N Stadium" },
      { week: 7, opponent: "Syracuse", location: "at", stadium: "JMA Wireless Dome" },
      { week: 8, note: "BYE" },
      { week: 9, opponent: "Stanford", location: "vs", stadium: "L&N Stadium" },
      { week: 10, opponent: "Georgia Tech", location: "at", stadium: "Bobby Dodd Stadium" },
      { week: 11, opponent: "North Carolina", location: "at", stadium: "Kenan Stadium" },
      { week: 12, opponent: "Pittsburgh", location: "vs", stadium: "L&N Stadium" },
      { week: 13, opponent: "Kentucky", location: "at", stadium: "Kroger Field" },
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
