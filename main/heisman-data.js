/* ============================================================
   HEISMAN WATCH — the in-game watch list, one snapshot per week
   ------------------------------------------------------------
   This is the EA College Football 27 "Heisman Watch" screen as it
   appeared in the game, one entry per week. It is always exactly
   four players. The site shows it on the Top 25 tab, under the poll,
   and builds each player's history from every week he appears in.

   Like the Top 25, each week is frozen history: a snapshot of what the
   screen said that week. Never edit an earlier week to reflect a later
   one — add a new week instead. Players come and go; a player who
   drops off simply has no row that week, and that gap IS his history.

   WHAT THE SITE SHOWS, AND WHEN
   The same reveal rule as the poll: the site shows the newest week
   at or before SEASON.currentWeek. A week added here for a week the
   season hasn't reached sits in the repo invisible until the advance.

   HOW TO ADD A WEEK
   node tools/heisman.js --week N --file watch.json
   The tool checks for exactly four players, ranks 1-4, known team
   names, and refuses to overwrite a week that's already here.

   Player shape:
     { rank, name, pos, team, year, number, archetype, ovr, height,
       weight, hometown, stats }
       rank       1-4, the order on the screen
       name       as the game prints it
       pos        "QB", "WR", "RB", ... as the game prints it
       team       must resolve to a roster or schedule team name
       year       "SR", "JR (RS)", ... as the game prints it
       number .. hometown
                  optional — the player card on the right of the
                  screen. Leave out anything not captured.
       stats      the SEASON STATS panel, in screen order, as
                  [label, value] pairs. Labels are whatever the game
                  shows for that position, so a QB and a WR carry
                  different sets. [] when not captured that week.
                  The six the screen shows, in order:
                    QB  PASS YDS, PASS TD, PASS COMP %, PASS INT,
                        RUSH ATT, RUSH YDS
                    WR  CATCHES, REC YDS, REC TD, LONG REC, REC YAC,
                        DROPS
       gameLog    optional — View Player Stats > Game Log, one entry
                  per game: { week, opponent, result, stats }, stats
                  as [label, value] pairs in the game's own columns.
                  The newest week's log is what the player history
                  shows game by game.
   ============================================================ */
const HEISMAN = [
  {
    week: 0,
    players: [
      { rank: 1, name: "Malachi Toney", pos: "WR", team: "Miami", year: "SR", number: 1, archetype: "Elusive Route Runner", ovr: 98, height: "5'11\"", weight: 190, hometown: "Freeport, FL",
        stats: [["CATCHES", 0], ["REC YDS", 0], ["REC TD", 0], ["LONG REC", 0], ["REC YAC", 0], ["DROPS", 0]] },
      { rank: 2, name: "Dakorien Moore", pos: "WR", team: "Oregon", year: "SR",
        stats: [["CATCHES", 0], ["REC YDS", 0], ["REC TD", 0], ["LONG REC", 0], ["REC YAC", 0], ["DROPS", 0]] },
      { rank: 3, name: "Tavien St. Clair", pos: "QB", team: "Ohio State", year: "SR",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 4, name: "Drew Mestemaker", pos: "QB", team: "Texas", year: "SR (RS)",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 1,
    players: [
      { rank: 1, name: "Malachi Toney", pos: "WR", team: "Miami", year: "SR", number: 1, archetype: "Elusive Route Runner", ovr: 98, height: "5'11\"", weight: 190, hometown: "Freeport, FL",
        stats: [["CATCHES", 0], ["REC YDS", 0], ["REC TD", 0], ["LONG REC", 0], ["REC YAC", 0]] },
      { rank: 2, name: "Dakorien Moore", pos: "WR", team: "Oregon", year: "SR", number: 1, archetype: "Gadget", ovr: 98, height: "5'11\"", weight: 199, hometown: "Duncanville, TX",
        stats: [["CATCHES", 0], ["REC YDS", 0], ["REC TD", 0], ["LONG REC", 0], ["REC YAC", 0]] },
      { rank: 3, name: "Tavien St. Clair", pos: "QB", team: "Ohio State", year: "SR", number: 9, archetype: "Dual Threat", ovr: 94, height: "6'4\"", weight: 233, hometown: "Perry, OH",
        stats: [["PASS YDS", 304], ["PASS TD", 5], ["PASS COMP %", 69], ["PASS INT", 0], ["RUSH ATT", 5], ["RUSH YDS", 29]] },
      { rank: 4, name: "Drew Mestemaker", pos: "QB", team: "Texas", year: "SR (RS)", number: 11, archetype: "Pocket Passer", ovr: 94, height: "6'3\"", weight: 218, hometown: "Austin, TX",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 2,
    players: [
      { rank: 1, name: "Malachi Toney", pos: "WR", team: "Miami", year: "SR", number: 1, archetype: "Elusive Route Runner", ovr: 98, height: "5'11\"", weight: 190, hometown: "Freeport, FL",
        stats: [["CATCHES", 2], ["REC YDS", 14], ["REC TD", 0], ["LONG REC", 7], ["REC YAC", 1], ["DROPS", 0]],
        gameLog: [
          { week: 0, opponent: "USF", result: "W 31-23", stats: [["REC", 0], ["YARDS", 0], ["AVG", 0], ["TD", 0], ["RAC", 0], ["RAC AVG", 0], ["LONG", 0], ["SNAPS", 58]] },
          { week: 1, opponent: "Texas A&M", result: "L 38-17", stats: [["REC", 2], ["YARDS", 14], ["AVG", 7], ["TD", 0], ["RAC", 1], ["RAC AVG", 0.5], ["LONG", 7], ["SNAPS", 54]] },
        ] },
      { rank: 2, name: "Dakorien Moore", pos: "WR", team: "Oregon", year: "SR", number: 1, archetype: "Gadget", ovr: 98, height: "5'11\"", weight: 199, hometown: "Duncanville, TX",
        stats: [["CATCHES", 3], ["REC YDS", 63], ["REC TD", 1], ["LONG REC", 55], ["REC YAC", 57], ["DROPS", 0]],
        gameLog: [
          { week: 1, opponent: "Colorado", result: "W 38-10", stats: [["REC", 3], ["YARDS", 63], ["AVG", 21], ["TD", 1], ["RAC", 57], ["RAC AVG", 19], ["LONG", 55], ["SNAPS", 47]] },
        ] },
      { rank: 3, name: "Tavien St. Clair", pos: "QB", team: "Ohio State", year: "SR", number: 9, archetype: "Dual Threat", ovr: 94, height: "6'4\"", weight: 233, hometown: "Perry, OH",
        stats: [["PASS YDS", 574], ["PASS TD", 8], ["PASS COMP %", 62], ["PASS INT", 3], ["RUSH ATT", 17], ["RUSH YDS", 53]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["RATING", 230.9], ["YARDS", 304], ["TD", 5], ["INT", 0], ["LONG", 74], ["SACKS", 0], ["COMP", 18], ["ATT", 26], ["COMP%", 69], ["YPA", 11.7], ["SNAPS", 44]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["RATING", 133], ["YARDS", 270], ["TD", 3], ["INT", 3], ["LONG", 47], ["SACKS", 5], ["COMP", 20], ["ATT", 35], ["COMP%", 57], ["YPA", 7.7], ["SNAPS", 57]] },
        ] },
      { rank: 4, name: "Drew Mestemaker", pos: "QB", team: "Texas", year: "SR (RS)", number: 11, archetype: "Pocket Passer", ovr: 94, height: "6'3\"", weight: 218, hometown: "Austin, TX",
        stats: [["PASS YDS", 287], ["PASS TD", 4], ["PASS COMP %", 79], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]],
        gameLog: [
          { week: 1, opponent: "Louisiana Tech", result: "W 63-0", stats: [["RATING", 189.1], ["YARDS", 287], ["TD", 4], ["INT", 0], ["LONG", 36], ["SACKS", 0], ["COMP", 27], ["ATT", 34], ["COMP%", 79], ["YPA", 8.4], ["SNAPS", 66]] },
        ] },
    ],
  },
  {
    week: 3,
    players: [
      { rank: 1, name: "Luke Kromenhoek", pos: "QB", team: "Kansas State", year: "SR (RS)", number: 17, archetype: "Pure Runner", ovr: 88, height: "6'4\"", weight: 223, hometown: "Savannah, GA",
        stats: [["PASS YDS", 696], ["PASS TD", 8], ["PASS COMP %", 69], ["PASS INT", 0], ["RUSH ATT", 29], ["RUSH YDS", 213]] },
      { rank: 2, name: "Doug Schau", pos: "QB", team: "SMU", year: "SO", number: 18, archetype: "Dual Threat", ovr: 83, height: "6'1\"", weight: 199, hometown: "Mount Pleasant, TX",
        stats: [["PASS YDS", 1053], ["PASS TD", 8], ["PASS COMP %", 64], ["PASS INT", 0], ["RUSH ATT", 34], ["RUSH YDS", 123]] },
      { rank: 3, name: "Sawyer Anderson", pos: "QB", team: "Texas Tech", year: "JR (RS)", number: 4, archetype: "Pure Runner", ovr: 87, height: "5'11\"", weight: 188, hometown: "Dallas, TX",
        stats: [["PASS YDS", 755], ["PASS TD", 6], ["PASS COMP %", 65], ["PASS INT", 1], ["RUSH ATT", 28], ["RUSH YDS", 76]] },
      { rank: 4, name: "Corey Smith", pos: "HB", team: "West Virginia", year: "SR (RS)", number: 20, archetype: "East/West Playmaker", ovr: 87, height: "5'10\"", weight: 178, hometown: "Milwaukee, WI",
        stats: [["RUSH ATT", 26], ["RUSH YDS", 303], ["YPC", 11], ["RUSH TD", 3], ["CATCHES", 3], ["REC YDS", 89]],
        gameLog: [
          { week: 0, opponent: "California", result: "W 52-24", stats: [["CAR", 15], ["YARDS", 176], ["AVG", 11.7], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 21], ["LONG", 81], ["SNAPS", 33]] },
          { week: 1, opponent: "Oklahoma", result: "W 56-44", stats: [["CAR", 11], ["YARDS", 127], ["AVG", 11.5], ["TD", 1], ["FUMB", 1], ["BTK", 0], ["YAC", 16], ["LONG", 63], ["SNAPS", 44]] },
        ] },
    ],
  },
  {
    week: 4,
    players: [
      { rank: 1, name: "Luke Kromenhoek", pos: "QB", team: "Kansas State", year: "SR (RS)", number: 17, archetype: "Pure Runner", ovr: 88, height: "6'4\"", weight: 223, hometown: "Savannah, GA",
        stats: [["PASS YDS", 894], ["PASS TD", 10], ["PASS COMP %", 67], ["PASS INT", 1], ["RUSH ATT", 43], ["RUSH YDS", 268]] },
      { rank: 2, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 32], ["RUSH YDS", 506], ["YPC", 15], ["RUSH TD", 5], ["CATCHES", 13], ["REC YDS", 120]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
        ] },
      { rank: 3, name: "Doug Schau", pos: "QB", team: "SMU", year: "SO", number: 18, archetype: "Dual Threat", ovr: 83, height: "6'1\"", weight: 199, hometown: "Mount Pleasant, TX",
        stats: [["PASS YDS", 1369], ["PASS TD", 10], ["PASS COMP %", 65], ["PASS INT", 0], ["RUSH ATT", 43], ["RUSH YDS", 142]] },
      { rank: 4, name: "KaMario Taylor", pos: "QB", team: "Auburn", year: "JR (RS)",
        stats: [["PASS YDS", 918], ["PASS TD", 7], ["PASS COMP %", 70], ["PASS INT", 1], ["RUSH ATT", 33], ["RUSH YDS", 268]] },
    ],
  },
  {
    week: 5,
    players: [
      { rank: 1, name: "Luke Kromenhoek", pos: "QB", team: "Kansas State", year: "SR (RS)", number: 17, archetype: "Pure Runner", ovr: 88, height: "6'4\"", weight: 223, hometown: "Savannah, GA",
        stats: [["PASS YDS", 1077], ["PASS TD", 11], ["PASS COMP %", 69], ["PASS INT", 1], ["RUSH ATT", 55], ["RUSH YDS", 289]] },
      { rank: 2, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 51], ["RUSH YDS", 661], ["YPC", 12], ["RUSH TD", 6], ["CATCHES", 14], ["REC YDS", 140]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
          { week: 4, opponent: "UCLA", result: "W 24-13", stats: [["CAR", 19], ["YARDS", 155], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 47], ["LONG", 30], ["SNAPS", 37]] },
        ] },
      { rank: 3, name: "C.J. Kubah-Taylor", pos: "MIKE", team: "Clemson", year: "SR (RS)", number: 26, archetype: "Lurker", ovr: 85, height: "6'2\"", weight: 228, hometown: "Frederick, MD",
        stats: [["INT", 5], ["PASS DEF", 1], ["TACKLES", 12], ["TACKLE ASSISTS", 18], ["SACKS", 1], ["GAMES STARTED", 5]],
        gameLog: [
          { week: 0, opponent: "Ohio State", result: "L 58-21", stats: [["SOLO", 2], ["ASSISTS", 2], ["TAK", 4], ["TFL", 0], ["SACK", 0], ["INT", 0], ["INT YDS", 0], ["INT AVG", 0], ["INT LG", 0], ["DEFL", 0], ["CTHA", 0], ["FFUMB", 0]] },
          { week: 1, opponent: "Syracuse", result: "W 45-37", stats: [["SOLO", 3], ["ASSISTS", 4], ["TAK", 7], ["TFL", 3], ["SACK", 1], ["INT", 1], ["INT YDS", 57], ["INT AVG", 57], ["INT LG", 57], ["DEFL", 0], ["CTHA", 0], ["FFUMB", 0]] },
          { week: 2, opponent: "Pittsburgh", result: "W 45-31", stats: [["SOLO", 4], ["ASSISTS", 2], ["TAK", 6], ["TFL", 4], ["SACK", 0], ["INT", 0], ["INT YDS", 0], ["INT AVG", 0], ["INT LG", 0], ["DEFL", 0], ["CTHA", 0], ["FFUMB", 0]] },
          { week: 3, opponent: "Georgia", result: "W 41-7", stats: [["SOLO", 2], ["ASSISTS", 6], ["TAK", 8], ["TFL", 1], ["SACK", 0], ["INT", 3], ["INT YDS", 10], ["INT AVG", 3.3], ["INT LG", 6], ["DEFL", 0], ["CTHA", 0], ["FFUMB", 0]] },
          { week: 4, opponent: "Georgia Tech", result: "W 59-24", stats: [["SOLO", 1], ["ASSISTS", 4], ["TAK", 5], ["TFL", 3], ["SACK", 0], ["INT", 1], ["INT YDS", 8], ["INT AVG", 8], ["INT LG", 8], ["DEFL", 1], ["CTHA", 0], ["FFUMB", 0]] },
        ] },
      { rank: 4, name: "Doug Schau", pos: "QB", team: "SMU", year: "SO", number: 18, archetype: "Dual Threat", height: "6'1\"", weight: 199, hometown: "Mount Pleasant, TX",
        stats: [["PASS YDS", 1501], ["PASS TD", 12], ["PASS COMP %", 67], ["PASS INT", 0], ["RUSH ATT", 49], ["RUSH YDS", 144]] },
    ],
  },
  {
    week: 6,
    players: [
      { rank: 1, name: "Luke Kromenhoek", pos: "QB", team: "Kansas State", year: "SR (RS)", number: 17, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 223, hometown: "Savannah, GA",
        stats: [["PASS YDS", 1474], ["PASS TD", 11], ["PASS COMP %", 68], ["PASS INT", 2], ["RUSH ATT", 65], ["RUSH YDS", 294]] },
      { rank: 2, name: "Doug Schau", pos: "QB", team: "SMU", year: "SO", number: 18, archetype: "Dual Threat", ovr: 83, height: "6'1\"", weight: 199, hometown: "Mount Pleasant, TX",
        stats: [["PASS YDS", 1702], ["PASS TD", 16], ["PASS COMP %", 65], ["PASS INT", 0], ["RUSH ATT", 56], ["RUSH YDS", 152]] },
      { rank: 3, name: "Kaliq Lockett", pos: "WR", team: "Texas", year: "JR (RS)", number: 7, archetype: "Gadget", ovr: 94, height: "6'2\"", weight: 191, hometown: "Dallas, TX",
        stats: [["CATCHES", 31], ["REC YDS", 416], ["REC TD", 5], ["LONG REC", 58], ["REC YAC", 159]],
        gameLog: [
          { week: 1, opponent: "Louisiana Tech", result: "W 63-0", stats: [["REC", 10], ["YARDS", 129], ["AVG", 12.9], ["TD", 1], ["RAC", 68], ["RAC AVG", 6.8], ["LONG", 36], ["SNAPS", 66]] },
          { week: 3, opponent: "Indiana", result: "W 45-17", stats: [["REC", 6], ["YARDS", 92], ["AVG", 15.3], ["TD", 2], ["RAC", 23], ["RAC AVG", 3.8], ["LONG", 30], ["SNAPS", 62]] },
          { week: 4, opponent: "Baylor", result: "W 57-10", stats: [["REC", 4], ["YARDS", 14], ["AVG", 3.5], ["TD", 0], ["RAC", 4], ["RAC AVG", 1], ["LONG", 14], ["SNAPS", 77]] },
          { week: 5, opponent: "Mississippi State", result: "W 48-0", stats: [["REC", 11], ["YARDS", 181], ["AVG", 16.5], ["TD", 2], ["RAC", 64], ["RAC AVG", 5.8], ["LONG", 58], ["SNAPS", 77]] },
        ] },
      { rank: 4, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 51], ["RUSH YDS", 661], ["YPC", 13], ["RUSH TD", 6], ["CATCHES", 14], ["REC YDS", 140]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
          { week: 4, opponent: "UCLA", result: "W 24-13", stats: [["CAR", 19], ["YARDS", 155], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 47], ["LONG", 30], ["SNAPS", 37]] },
        ] },
    ],
  },
  {
    week: 7,
    players: [
      { rank: 1, name: "Kaliq Lockett", pos: "WR", team: "Texas", year: "JR (RS)", number: 7, archetype: "Gadget", ovr: 94, height: "6'2\"", weight: 191, hometown: "Dallas, TX",
        stats: [["CATCHES", 43], ["REC YDS", 580], ["REC TD", 7], ["LONG REC", 58], ["REC YAC", 226], ["DROPS", 0]],
        gameLog: [
          { week: 1, opponent: "Louisiana Tech", result: "W 63-0", stats: [["REC", 10], ["YARDS", 129], ["AVG", 12.9], ["TD", 1], ["RAC", 68], ["RAC AVG", 6.8], ["LONG", 36], ["SNAPS", 66]] },
          { week: 3, opponent: "Indiana", result: "W 45-17", stats: [["REC", 6], ["YARDS", 92], ["AVG", 15.3], ["TD", 2], ["RAC", 23], ["RAC AVG", 3.8], ["LONG", 30], ["SNAPS", 62]] },
          { week: 4, opponent: "Baylor", result: "W 57-10", stats: [["REC", 4], ["YARDS", 14], ["AVG", 3.5], ["TD", 0], ["RAC", 4], ["RAC AVG", 1], ["LONG", 14], ["SNAPS", 77]] },
          { week: 5, opponent: "Mississippi State", result: "W 48-0", stats: [["REC", 11], ["YARDS", 181], ["AVG", 16.5], ["TD", 2], ["RAC", 64], ["RAC AVG", 5.8], ["LONG", 58], ["SNAPS", 77]] },
          { week: 6, opponent: "Kentucky", result: "W 49-31", stats: [["REC", 12], ["YARDS", 164], ["AVG", 13.7], ["TD", 2], ["RAC", 67], ["RAC AVG", 5.6], ["LONG", 51], ["SNAPS", 75]] },
        ] },
      { rank: 2, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 73], ["RUSH YDS", 789], ["YPC", 10], ["RUSH TD", 9], ["CATCHES", 16], ["REC YDS", 163]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
          { week: 4, opponent: "UCLA", result: "W 24-13", stats: [["CAR", 19], ["YARDS", 155], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 47], ["LONG", 30], ["SNAPS", 37]] },
          { week: 6, opponent: "Washington", result: "W 45-13", stats: [["CAR", 22], ["YARDS", 128], ["AVG", 5.8], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 38], ["LONG", 16], ["SNAPS", 48]] },
        ] },
      { rank: 3, name: "Luke Kromenhoek", pos: "QB", team: "Kansas State", year: "SR (RS)", number: 17, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 223, hometown: "Savannah, GA",
        stats: [["PASS YDS", 1823], ["PASS TD", 13], ["PASS COMP %", 68], ["PASS INT", 2], ["RUSH ATT", 82], ["RUSH YDS", 300]] },
      { rank: 4, name: "Tyler Chambers", pos: "QB", team: "South Carolina", year: "JR (RS)", number: 12, archetype: "Pure Runner", ovr: 84, height: "6'5\"", weight: 209, hometown: "Gastonia, NC",
        stats: [["PASS YDS", 1723], ["PASS TD", 17], ["PASS COMP %", 66], ["PASS INT", 5], ["RUSH ATT", 62], ["RUSH YDS", 286]] },
    ],
  },
  {
    week: 8,
    players: [
      { rank: 1, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 87], ["RUSH YDS", 902], ["YPC", 10], ["RUSH TD", 11], ["CATCHES", 18], ["REC YDS", 188]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
          { week: 4, opponent: "UCLA", result: "W 24-13", stats: [["CAR", 19], ["YARDS", 155], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 47], ["LONG", 30], ["SNAPS", 37]] },
          { week: 6, opponent: "Washington", result: "W 45-13", stats: [["CAR", 22], ["YARDS", 128], ["AVG", 5.8], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 38], ["LONG", 16], ["SNAPS", 48]] },
          { week: 7, opponent: "Wisconsin", result: "W 49-35", stats: [["CAR", 14], ["YARDS", 113], ["AVG", 8.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 21], ["SNAPS", 24]] },
        ] },
      { rank: 2, name: "Kaliq Lockett", pos: "WR", team: "Texas", year: "JR (RS)", number: 7, archetype: "Gadget", ovr: 94, height: "6'2\"", weight: 191, hometown: "Dallas, TX",
        stats: [["CATCHES", 48], ["REC YDS", 648], ["REC TD", 8], ["LONG REC", 58], ["REC YAC", 261], ["DROPS", 0]],
        gameLog: [
          { week: 1, opponent: "Louisiana Tech", result: "W 63-0", stats: [["REC", 10], ["YARDS", 129], ["AVG", 12.9], ["TD", 1], ["RAC", 68], ["RAC AVG", 6.8], ["LONG", 36], ["SNAPS", 66]] },
          { week: 3, opponent: "Indiana", result: "W 45-17", stats: [["REC", 6], ["YARDS", 92], ["AVG", 15.3], ["TD", 2], ["RAC", 23], ["RAC AVG", 3.8], ["LONG", 30], ["SNAPS", 62]] },
          { week: 4, opponent: "Baylor", result: "W 57-10", stats: [["REC", 4], ["YARDS", 14], ["AVG", 3.5], ["TD", 0], ["RAC", 4], ["RAC AVG", 1], ["LONG", 14], ["SNAPS", 77]] },
          { week: 5, opponent: "Mississippi State", result: "W 48-0", stats: [["REC", 11], ["YARDS", 181], ["AVG", 16.5], ["TD", 2], ["RAC", 64], ["RAC AVG", 5.8], ["LONG", 58], ["SNAPS", 77]] },
          { week: 6, opponent: "Kentucky", result: "W 49-31", stats: [["REC", 12], ["YARDS", 164], ["AVG", 13.7], ["TD", 2], ["RAC", 67], ["RAC AVG", 5.6], ["LONG", 51], ["SNAPS", 75]] },
          { week: 7, opponent: "Oklahoma", result: "W 35-10", stats: [["REC", 5], ["YARDS", 68], ["AVG", 13.6], ["TD", 1], ["RAC", 35], ["RAC AVG", 7], ["LONG", 26], ["SNAPS", 35]] },
        ] },
      { rank: 3, name: "Luke Kromenhoek", pos: "QB", team: "Kansas State", year: "SR (RS)", number: 17, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 223, hometown: "Savannah, GA",
        stats: [["PASS YDS", 2000], ["PASS TD", 14], ["PASS COMP %", 65], ["PASS INT", 2], ["RUSH ATT", 95], ["RUSH YDS", 404]] },
      { rank: 4, name: "T.J. Mobley", pos: "HB", team: "Notre Dame", year: "SR (RS)", number: 49, archetype: "East/West Playmaker", ovr: 91, height: "5'10\"", weight: 197, hometown: "Zionsville, IN",
        stats: [["RUSH ATT", 137], ["RUSH YDS", 1026], ["YPC", 7], ["RUSH TD", 8], ["CATCHES", 18], ["REC YDS", 142]],
        gameLog: [
          { week: 0, opponent: "TCU", result: "W 31-21", stats: [["CAR", 15], ["YARDS", 81], ["AVG", 5.4], ["TD", 0], ["FUMB", 0], ["BTK", 0], ["YAC", 18], ["LONG", 21], ["SNAPS", 32]] },
          { week: 2, opponent: "Oklahoma", result: "L 32-21", stats: [["CAR", 15], ["YARDS", 111], ["AVG", 7.4], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 17], ["LONG", 60], ["SNAPS", 39]] },
          { week: 3, opponent: "Ohio State", result: "L 50-26", stats: [["CAR", 19], ["YARDS", 136], ["AVG", 7.2], ["TD", 0], ["FUMB", 0], ["BTK", 3], ["YAC", 30], ["LONG", 62], ["SNAPS", 36]] },
          { week: 4, opponent: "Oregon", result: "L 35-21", stats: [["CAR", 16], ["YARDS", 129], ["AVG", 8.1], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 20], ["LONG", 54], ["SNAPS", 35]] },
          { week: 5, opponent: "Boise State", result: "W 24-16", stats: [["CAR", 26], ["YARDS", 103], ["AVG", 4], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 36], ["LONG", 23], ["SNAPS", 45]] },
          { week: 6, opponent: "Auburn", result: "W 27-17", stats: [["CAR", 27], ["YARDS", 303], ["AVG", 11.2], ["TD", 3], ["FUMB", 0], ["BTK", 3], ["YAC", 41], ["LONG", 80], ["SNAPS", 40]] },
          { week: 7, opponent: "Stanford", result: "W 41-9", stats: [["CAR", 19], ["YARDS", 163], ["AVG", 8.6], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 20], ["LONG", 59], ["SNAPS", 28]] },
        ] },
    ],
  },
  {
    week: 9,
    players: [
      { rank: 1, name: "T.J. Mobley", pos: "HB", team: "Notre Dame", year: "SR (RS)", number: 49, archetype: "East/West Playmaker", ovr: 92, height: "5'10\"", weight: 197, hometown: "Zionsville, IN",
        stats: [["RUSH ATT", 157], ["RUSH YDS", 1252], ["YPC", 7], ["RUSH TD", 11], ["CATCHES", 22], ["REC YDS", 232]],
        gameLog: [
          { week: 0, opponent: "TCU", result: "W 31-21", stats: [["CAR", 15], ["YARDS", 81], ["AVG", 5.4], ["TD", 0], ["FUMB", 0], ["BTK", 0], ["YAC", 18], ["LONG", 21], ["SNAPS", 32]] },
          { week: 2, opponent: "Oklahoma", result: "L 32-21", stats: [["CAR", 15], ["YARDS", 111], ["AVG", 7.4], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 17], ["LONG", 60], ["SNAPS", 39]] },
          { week: 3, opponent: "Ohio State", result: "L 50-26", stats: [["CAR", 19], ["YARDS", 136], ["AVG", 7.2], ["TD", 0], ["FUMB", 0], ["BTK", 3], ["YAC", 30], ["LONG", 62], ["SNAPS", 36]] },
          { week: 4, opponent: "Oregon", result: "L 35-21", stats: [["CAR", 16], ["YARDS", 129], ["AVG", 8.1], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 20], ["LONG", 54], ["SNAPS", 35]] },
          { week: 5, opponent: "Boise State", result: "W 24-16", stats: [["CAR", 26], ["YARDS", 103], ["AVG", 4], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 36], ["LONG", 23], ["SNAPS", 45]] },
          { week: 6, opponent: "Auburn", result: "W 27-17", stats: [["CAR", 27], ["YARDS", 303], ["AVG", 11.2], ["TD", 3], ["FUMB", 0], ["BTK", 3], ["YAC", 41], ["LONG", 80], ["SNAPS", 40]] },
          { week: 7, opponent: "Stanford", result: "W 41-9", stats: [["CAR", 19], ["YARDS", 163], ["AVG", 8.6], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 20], ["LONG", 59], ["SNAPS", 28]] },
          { week: 8, opponent: "Boston College", result: "W 45-20", stats: [["CAR", 20], ["YARDS", 226], ["AVG", 11.3], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 61], ["LONG", 72], ["SNAPS", 27]] },
        ] },
      { rank: 2, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 115], ["RUSH YDS", 1128], ["YPC", 9], ["RUSH TD", 14], ["CATCHES", 18], ["REC YDS", 188]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
          { week: 4, opponent: "UCLA", result: "W 24-13", stats: [["CAR", 19], ["YARDS", 155], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 47], ["LONG", 30], ["SNAPS", 37]] },
          { week: 6, opponent: "Washington", result: "W 45-13", stats: [["CAR", 22], ["YARDS", 128], ["AVG", 5.8], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 38], ["LONG", 16], ["SNAPS", 48]] },
          { week: 7, opponent: "Wisconsin", result: "W 49-35", stats: [["CAR", 14], ["YARDS", 113], ["AVG", 8.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 21], ["SNAPS", 24]] },
          { week: 8, opponent: "Penn State", result: "W 42-28", stats: [["CAR", 25], ["YARDS", 201], ["AVG", 8], ["TD", 3], ["FUMB", 0], ["BTK", 2], ["YAC", 24], ["LONG", 80], ["SNAPS", 47]] },
          { week: 9, opponent: "Minnesota", result: "W 52-7", stats: [["CAR", 3], ["YARDS", 25], ["AVG", 8.3], ["TD", 0], ["FUMB", 0], ["BTK", 1], ["YAC", 13], ["LONG", 18], ["SNAPS", 3]] },
        ] },
      { rank: 3, name: "Kaliq Lockett", pos: "WR", team: "Texas", year: "JR (RS)", number: 7, archetype: "Gadget", ovr: 95, height: "6'2\"", weight: 191, hometown: "Dallas, TX",
        stats: [["CATCHES", 49], ["REC YDS", 706], ["REC TD", 9], ["LONG REC", 58], ["REC YAC", 286], ["DROPS", 0]],
        gameLog: [
          { week: 1, opponent: "Louisiana Tech", result: "W 63-0", stats: [["REC", 10], ["YARDS", 129], ["AVG", 12.9], ["TD", 1], ["RAC", 68], ["RAC AVG", 6.8], ["LONG", 36], ["SNAPS", 66]] },
          { week: 3, opponent: "Indiana", result: "W 45-17", stats: [["REC", 6], ["YARDS", 92], ["AVG", 15.3], ["TD", 2], ["RAC", 23], ["RAC AVG", 3.8], ["LONG", 30], ["SNAPS", 62]] },
          { week: 4, opponent: "Baylor", result: "W 57-10", stats: [["REC", 4], ["YARDS", 14], ["AVG", 3.5], ["TD", 0], ["RAC", 4], ["RAC AVG", 1], ["LONG", 14], ["SNAPS", 77]] },
          { week: 5, opponent: "Mississippi State", result: "W 48-0", stats: [["REC", 11], ["YARDS", 181], ["AVG", 16.5], ["TD", 2], ["RAC", 64], ["RAC AVG", 5.8], ["LONG", 58], ["SNAPS", 77]] },
          { week: 6, opponent: "Kentucky", result: "W 49-31", stats: [["REC", 12], ["YARDS", 164], ["AVG", 13.7], ["TD", 2], ["RAC", 67], ["RAC AVG", 5.6], ["LONG", 51], ["SNAPS", 75]] },
          { week: 7, opponent: "Oklahoma", result: "W 35-10", stats: [["REC", 5], ["YARDS", 68], ["AVG", 13.6], ["TD", 1], ["RAC", 35], ["RAC AVG", 7], ["LONG", 26], ["SNAPS", 35]] },
          { week: 8, opponent: "Florida", result: "W 42-21", stats: [["REC", 1], ["YARDS", 58], ["AVG", 58], ["TD", 1], ["RAC", 25], ["RAC AVG", 25], ["LONG", 58], ["SNAPS", 48]] },
        ] },
      { rank: 4, name: "Doug Schau", pos: "QB", team: "SMU", year: "SO", number: 18, archetype: "Dual Threat", ovr: 83, height: "6'1\"", weight: 199, hometown: "Mount Pleasant, TX",
        stats: [["PASS YDS", 2624], ["PASS TD", 22], ["PASS COMP %", 66], ["PASS INT", 2], ["RUSH ATT", 89], ["RUSH YDS", 270]] },
    ],
  },
  {
    week: 10,
    players: [
      { rank: 1, name: "T.J. Mobley", pos: "HB", team: "Notre Dame", year: "SR (RS)", number: 49, archetype: "East/West Playmaker", ovr: 92, height: "5'10\"", weight: 197, hometown: "Zionsville, IN",
        stats: [["RUSH ATT", 206], ["RUSH YDS", 1670], ["YPC", 8], ["RUSH TD", 16], ["CATCHES", 26], ["REC YDS", 258]],
        gameLog: [
          { week: 0, opponent: "TCU", result: "W 31-21", stats: [["CAR", 15], ["YARDS", 81], ["AVG", 5.4], ["TD", 0], ["FUMB", 0], ["BTK", 0], ["YAC", 18], ["LONG", 21], ["SNAPS", 32]] },
          { week: 2, opponent: "Oklahoma", result: "L 32-21", stats: [["CAR", 15], ["YARDS", 111], ["AVG", 7.4], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 17], ["LONG", 60], ["SNAPS", 39]] },
          { week: 3, opponent: "Ohio State", result: "L 50-26", stats: [["CAR", 19], ["YARDS", 136], ["AVG", 7.2], ["TD", 0], ["FUMB", 0], ["BTK", 3], ["YAC", 30], ["LONG", 62], ["SNAPS", 36]] },
          { week: 4, opponent: "Oregon", result: "L 35-21", stats: [["CAR", 16], ["YARDS", 129], ["AVG", 8.1], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 20], ["LONG", 54], ["SNAPS", 35]] },
          { week: 5, opponent: "Boise State", result: "W 24-16", stats: [["CAR", 26], ["YARDS", 103], ["AVG", 4], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 36], ["LONG", 23], ["SNAPS", 45]] },
          { week: 6, opponent: "Auburn", result: "W 27-17", stats: [["CAR", 27], ["YARDS", 303], ["AVG", 11.2], ["TD", 3], ["FUMB", 0], ["BTK", 3], ["YAC", 41], ["LONG", 80], ["SNAPS", 40]] },
          { week: 7, opponent: "Stanford", result: "W 41-9", stats: [["CAR", 19], ["YARDS", 163], ["AVG", 8.6], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 20], ["LONG", 59], ["SNAPS", 28]] },
          { week: 8, opponent: "Boston College", result: "W 45-20", stats: [["CAR", 20], ["YARDS", 226], ["AVG", 11.3], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 61], ["LONG", 72], ["SNAPS", 27]] },
          { week: 9, opponent: "Navy", result: "W 38-7", stats: [["CAR", 27], ["YARDS", 262], ["AVG", 9.7], ["TD", 3], ["FUMB", 0], ["BTK", 0], ["YAC", 25], ["LONG", 71], ["SNAPS", 45]] },
          { week: 10, opponent: "Purdue", result: "W 31-17", stats: [["CAR", 22], ["YARDS", 156], ["AVG", 7.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 35], ["LONG", 20], ["SNAPS", 27]] },
        ] },
      { rank: 2, name: "Bo Jackson", pos: "HB", team: "Ohio State", year: "SR", number: 25, archetype: "East/West Playmaker", ovr: 96, height: "6'0\"", weight: 225, hometown: "Cleveland, OH",
        stats: [["RUSH ATT", 115], ["RUSH YDS", 1128], ["YPC", 9], ["RUSH TD", 14], ["CATCHES", 18], ["REC YDS", 188]],
        gameLog: [
          { week: 0, opponent: "Clemson", result: "W 58-21", stats: [["CAR", 13], ["YARDS", 291], ["AVG", 22.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 27], ["LONG", 86], ["SNAPS", 43]] },
          { week: 1, opponent: "LSU", result: "L 52-21", stats: [["CAR", 9], ["YARDS", 36], ["AVG", 4], ["TD", 0], ["FUMB", 1], ["BTK", 1], ["YAC", 11], ["LONG", 9], ["SNAPS", 56]] },
          { week: 3, opponent: "Notre Dame", result: "W 50-26", stats: [["CAR", 10], ["YARDS", 179], ["AVG", 17.9], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 12], ["LONG", 68], ["SNAPS", 29]] },
          { week: 4, opponent: "UCLA", result: "W 24-13", stats: [["CAR", 19], ["YARDS", 155], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 47], ["LONG", 30], ["SNAPS", 37]] },
          { week: 6, opponent: "Washington", result: "W 45-13", stats: [["CAR", 22], ["YARDS", 128], ["AVG", 5.8], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 38], ["LONG", 16], ["SNAPS", 48]] },
          { week: 7, opponent: "Wisconsin", result: "W 49-35", stats: [["CAR", 14], ["YARDS", 113], ["AVG", 8.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 21], ["SNAPS", 24]] },
          { week: 8, opponent: "Penn State", result: "W 42-28", stats: [["CAR", 25], ["YARDS", 201], ["AVG", 8], ["TD", 3], ["FUMB", 0], ["BTK", 2], ["YAC", 24], ["LONG", 80], ["SNAPS", 47]] },
          { week: 9, opponent: "Minnesota", result: "W 52-7", stats: [["CAR", 3], ["YARDS", 25], ["AVG", 8.3], ["TD", 0], ["FUMB", 0], ["BTK", 1], ["YAC", 13], ["LONG", 18], ["SNAPS", 3]] },
        ] },
      { rank: 3, name: "Harlem Berry", pos: "HB", team: "LSU", year: "SR", number: 22, archetype: "East/West Playmaker", ovr: 92, height: "5'10\"", weight: 190, hometown: "New Orleans, LA",
        stats: [["RUSH ATT", 147], ["RUSH YDS", 1270], ["YPC", 8], ["RUSH TD", 16], ["CATCHES", 13], ["REC YDS", 185]],
        gameLog: [
          { week: 1, opponent: "Ohio State", result: "W 52-21", stats: [["CAR", 8], ["YARDS", 94], ["AVG", 11.8], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 14], ["LONG", 56], ["SNAPS", 16]] },
          { week: 3, opponent: "West Virginia", result: "L 47-32", stats: [["CAR", 16], ["YARDS", 131], ["AVG", 8.2], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 29], ["LONG", 40], ["SNAPS", 33]] },
          { week: 4, opponent: "Missouri State", result: "W 35-14", stats: [["CAR", 16], ["YARDS", 104], ["AVG", 6.5], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 19], ["LONG", 31], ["SNAPS", 27]] },
          { week: 5, opponent: "Florida", result: "W 25-21", stats: [["CAR", 10], ["YARDS", 68], ["AVG", 6.8], ["TD", 0], ["FUMB", 1], ["BTK", 3], ["YAC", 21], ["LONG", 14], ["SNAPS", 18]] },
          { week: 6, opponent: "Arkansas", result: "W 52-14", stats: [["CAR", 7], ["YARDS", 101], ["AVG", 14.4], ["TD", 3], ["FUMB", 0], ["BTK", 1], ["YAC", 49], ["LONG", 52], ["SNAPS", 16]] },
          { week: 7, opponent: "Vanderbilt", result: "W 48-32", stats: [["CAR", 23], ["YARDS", 215], ["AVG", 9.3], ["TD", 3], ["FUMB", 0], ["BTK", 3], ["YAC", 31], ["LONG", 75], ["SNAPS", 42]] },
          { week: 8, opponent: "Western Michigan", result: "W 42-8", stats: [["CAR", 23], ["YARDS", 134], ["AVG", 5.8], ["TD", 4], ["FUMB", 0], ["BTK", 2], ["YAC", 19], ["LONG", 19], ["SNAPS", 35]] },
          { week: 9, opponent: "South Carolina", result: "W 49-17", stats: [["CAR", 20], ["YARDS", 200], ["AVG", 10], ["TD", 1], ["FUMB", 0], ["BTK", 3], ["YAC", 29], ["LONG", 54], ["SNAPS", 31]] },
          { week: 10, opponent: "Texas A&M", result: "W 28-23", stats: [["CAR", 24], ["YARDS", 223], ["AVG", 9.3], ["TD", 2], ["FUMB", 0], ["BTK", 2], ["YAC", 99], ["LONG", 73], ["SNAPS", 35]] },
        ] },
      { rank: 4, name: "King Miller", pos: "HB", team: "Texas", year: "SR (RS)", number: 5, archetype: "East/West Playmaker", ovr: 90, height: "6'0\"", weight: 219, hometown: "Calabasas, CA",
        stats: [["RUSH ATT", 132], ["RUSH YDS", 944], ["YPC", 7], ["RUSH TD", 15], ["CATCHES", 10], ["REC YDS", 84]],
        gameLog: [
          { week: 1, opponent: "Louisiana Tech", result: "W 63-0", stats: [["CAR", 19], ["YARDS", 172], ["AVG", 9.1], ["TD", 3], ["FUMB", 0], ["BTK", 5], ["YAC", 42], ["LONG", 48], ["SNAPS", 32]] },
          { week: 3, opponent: "Indiana", result: "W 45-17", stats: [["CAR", 21], ["YARDS", 99], ["AVG", 4.7], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 30], ["LONG", 19], ["SNAPS", 38]] },
          { week: 4, opponent: "Baylor", result: "W 57-10", stats: [["CAR", 16], ["YARDS", 106], ["AVG", 6.6], ["TD", 1], ["FUMB", 0], ["BTK", 1], ["YAC", 27], ["LONG", 21], ["SNAPS", 43]] },
          { week: 5, opponent: "Mississippi State", result: "W 48-0", stats: [["CAR", 23], ["YARDS", 76], ["AVG", 3.3], ["TD", 3], ["FUMB", 0], ["BTK", 2], ["YAC", 35], ["LONG", 10], ["SNAPS", 51]] },
          { week: 6, opponent: "Kentucky", result: "W 49-31", stats: [["CAR", 19], ["YARDS", 111], ["AVG", 5.8], ["TD", 2], ["FUMB", 0], ["BTK", 2], ["YAC", 33], ["LONG", 14], ["SNAPS", 40]] },
          { week: 7, opponent: "Oklahoma", result: "W 35-10", stats: [["CAR", 11], ["YARDS", 66], ["AVG", 6], ["TD", 1], ["FUMB", 0], ["BTK", 0], ["YAC", 14], ["LONG", 19], ["SNAPS", 23]] },
          { week: 8, opponent: "Florida", result: "W 42-21", stats: [["CAR", 14], ["YARDS", 196], ["AVG", 14], ["TD", 2], ["FUMB", 0], ["BTK", 1], ["YAC", 27], ["LONG", 67], ["SNAPS", 26]] },
          { week: 9, opponent: "Georgia", result: "W 38-20", stats: [["CAR", 9], ["YARDS", 118], ["AVG", 13.1], ["TD", 2], ["FUMB", 0], ["BTK", 2], ["YAC", 88], ["LONG", 75], ["SNAPS", 19]] },
        ] },
    ],
  },
];
