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
];
