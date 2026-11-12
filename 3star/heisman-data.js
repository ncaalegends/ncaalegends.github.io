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
      { rank: 1, name: "Savion Hiter", pos: "HB", team: "Ohio State", year: "JR", number: 19, archetype: "East/West Playmaker", ovr: 93, height: "6'0\"", weight: 217, hometown: "Hampton, VA",
        stats: [["RUSH ATT", 11], ["RUSH YDS", 61], ["YPC", 5], ["RUSH TD", 0], ["CATCHES", 2], ["REC YDS", 35]] },
      { rank: 2, name: "Dierre Hill Jr.", pos: "HB", team: "Wisconsin", year: "SR", number: 22, archetype: "East/West Playmaker", ovr: 93, height: "5'11\"", weight: 210, hometown: "Centralia, IL",
        stats: [["RUSH ATT", 21], ["RUSH YDS", 91], ["YPC", 4], ["RUSH TD", 2], ["CATCHES", 0], ["REC YDS", 0]],
        gameLog: [
          { week: 0, opponent: "Notre Dame", result: "W 27-0", stats: [["CAR", 21], ["YARDS", 91], ["AVG", 4.3], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 28], ["LONG", 16], ["SNAPS", 34]] },
        ] },
      { rank: 3, name: "Landon Duckworth", pos: "QB", team: "Alabama", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 222, hometown: "Jackson, AL",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 4, name: "Deuce Knight", pos: "QB", team: "Ole Miss", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 90, height: "6'5\"", weight: 234, hometown: "Lucedale, MS",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 1,
    players: [
      { rank: 1, name: "Savion Hiter", pos: "HB", team: "Ohio State", year: "JR", number: 19, archetype: "East/West Playmaker", ovr: 93, height: "6'0\"", weight: 217, hometown: "Hampton, VA",
        stats: [["RUSH ATT", 11], ["RUSH YDS", 61], ["YPC", 5], ["RUSH TD", 0], ["CATCHES", 2], ["REC YDS", 35]] },
      { rank: 2, name: "Dierre Hill Jr.", pos: "HB", team: "Wisconsin", year: "SR", number: 22, archetype: "East/West Playmaker", ovr: 93, height: "5'11\"", weight: 210, hometown: "Centralia, IL",
        stats: [["RUSH ATT", 31], ["RUSH YDS", 227], ["YPC", 7], ["RUSH TD", 2], ["CATCHES", 3], ["REC YDS", 25]],
        gameLog: [
          { week: 0, opponent: "Notre Dame", result: "W 27-0", stats: [["CAR", 21], ["YARDS", 91], ["AVG", 4.3], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 28], ["LONG", 16], ["SNAPS", 34]] },
          { week: 1, opponent: "Marshall", result: "W 52-10", stats: [["CAR", 10], ["YARDS", 136], ["AVG", 13.6], ["TD", 0], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 31], ["SNAPS", 42]] },
        ] },
      { rank: 3, name: "Landon Duckworth", pos: "QB", team: "Alabama", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 222, hometown: "Jackson, AL",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 4, name: "Deuce Knight", pos: "QB", team: "Ole Miss", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 90, height: "6'5\"", weight: 234, hometown: "Lucedale, MS",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 2,
    players: [
      { rank: 1, name: "Savion Hiter", pos: "HB", team: "Ohio State", year: "JR", number: 19, archetype: "East/West Playmaker", ovr: 93, height: "6'0\"", weight: 217, hometown: "Hampton, VA",
        stats: [["RUSH ATT", 27], ["RUSH YDS", 170], ["YPC", 6], ["RUSH TD", 0], ["CATCHES", 3], ["REC YDS", 42]] },
      { rank: 2, name: "Dierre Hill Jr.", pos: "HB", team: "Wisconsin", year: "SR", number: 22, archetype: "East/West Playmaker", ovr: 93, height: "5'11\"", weight: 210, hometown: "Centralia, IL",
        stats: [["RUSH ATT", 31], ["RUSH YDS", 227], ["YPC", 7], ["RUSH TD", 2], ["CATCHES", 3], ["REC YDS", 25]],
        gameLog: [
          { week: 0, opponent: "Notre Dame", result: "W 27-0", stats: [["CAR", 21], ["YARDS", 91], ["AVG", 4.3], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 28], ["LONG", 16], ["SNAPS", 34]] },
          { week: 1, opponent: "Marshall", result: "W 52-10", stats: [["CAR", 10], ["YARDS", 136], ["AVG", 13.6], ["TD", 0], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 31], ["SNAPS", 42]] },
        ] },
      { rank: 3, name: "Landon Duckworth", pos: "QB", team: "Alabama", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 222, hometown: "Jackson, AL",
        stats: [["PASS YDS", 346], ["PASS TD", 2], ["PASS COMP %", 66], ["PASS INT", 1], ["RUSH ATT", 7], ["RUSH YDS", 44]] },
      { rank: 4, name: "Deuce Knight", pos: "QB", team: "Ole Miss", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 90, height: "6'5\"", weight: 234, hometown: "Lucedale, MS",
        stats: [["PASS YDS", 294], ["PASS TD", 1], ["PASS COMP %", 78], ["PASS INT", 0], ["RUSH ATT", 15], ["RUSH YDS", 37]] },
    ],
  },
  {
    week: 3,
    players: [
      { rank: 1, name: "Mitch Sanderson", pos: "HB", team: "Rutgers", year: "SR (RS)", number: 38, archetype: "East/West Playmaker", ovr: 87, height: "6'0\"", weight: 209, hometown: "Irvington, NJ",
        stats: [["RUSH ATT", 55], ["RUSH YDS", 624], ["YPC", 11], ["RUSH TD", 6], ["CATCHES", 7], ["REC YDS", 158]],
        gameLog: [
          { week: 0, opponent: "Georgia", result: "W 50-47", stats: [["CAR", 27], ["YARDS", 163], ["AVG", 6], ["TD", 2], ["FUMB", 0], ["BTK", 2], ["YAC", 39], ["LONG", 20], ["SNAPS", 57]] },
          { week: 1, opponent: "UConn", result: "W 38-24", stats: [["CAR", 15], ["YARDS", 226], ["AVG", 15.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 17], ["LONG", 82], ["SNAPS", 28]] },
          { week: 2, opponent: "Ole Miss", result: "W 45-27", stats: [["CAR", 13], ["YARDS", 235], ["AVG", 18.1], ["TD", 2], ["FUMB", 0], ["BTK", 1], ["YAC", 21], ["LONG", 79], ["SNAPS", 21]] },
        ] },
      { rank: 2, name: "Quinton Martin Jr.", pos: "HB", team: "Oklahoma State", year: "SR (RS)", number: 9, archetype: "East/West Playmaker", ovr: 87, height: "6'1\"", weight: 207, hometown: "Belle Vernon, PA",
        stats: [["RUSH ATT", 47], ["RUSH YDS", 484], ["YPC", 10], ["RUSH TD", 5], ["CATCHES", 6], ["REC YDS", 157]],
        gameLog: [
          { week: 0, opponent: "Ohio State", result: "W 49-24", stats: [["CAR", 15], ["YARDS", 137], ["AVG", 9.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 23], ["LONG", 49], ["SNAPS", 43]] },
          { week: 1, opponent: "Tulsa", result: "W 49-17", stats: [["CAR", 14], ["YARDS", 105], ["AVG", 7.5], ["TD", 0], ["FUMB", 0], ["BTK", 2], ["YAC", 27], ["LONG", 18], ["SNAPS", 36]] },
          { week: 2, opponent: "Cincinnati", result: "W 35-21", stats: [["CAR", 18], ["YARDS", 242], ["AVG", 13.4], ["TD", 3], ["FUMB", 0], ["BTK", 3], ["YAC", 25], ["LONG", 69], ["SNAPS", 47]] },
        ] },
      { rank: 3, name: "Karson Cox", pos: "HB", team: "California", year: "JR (RS)", number: 33, archetype: "East/West Playmaker", ovr: 86, height: "5'11\"", weight: 221, hometown: "Moreno Valley, CA",
        stats: [["RUSH ATT", 65], ["RUSH YDS", 611], ["YPC", 9], ["RUSH TD", 3], ["CATCHES", 16], ["REC YDS", 247]],
        gameLog: [
          { week: 0, opponent: "South Carolina", result: "W 31-10", stats: [["CAR", 22], ["YARDS", 160], ["AVG", 7.3], ["TD", 0], ["FUMB", 0], ["BTK", 1], ["YAC", 39], ["LONG", 52], ["SNAPS", 38]] },
          { week: 1, opponent: "UCLA", result: "W 40-38", stats: [["CAR", 32], ["YARDS", 333], ["AVG", 10.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 59], ["LONG", 81], ["SNAPS", 54]] },
          { week: 2, opponent: "North Dakota State", result: "L 44-40", stats: [["CAR", 11], ["YARDS", 118], ["AVG", 10.7], ["TD", 1], ["FUMB", 1], ["BTK", 5], ["YAC", 5], ["LONG", 81], ["SNAPS", 34]] },
        ] },
      { rank: 4, name: "Dierre Hill Jr.", pos: "HB", team: "Wisconsin", year: "SR", number: 22, ovr: 93, height: "5'11\"", weight: 210,
        stats: [["RUSH ATT", 51], ["RUSH YDS", 413], ["YPC", 8], ["RUSH TD", 4], ["CATCHES", 6], ["REC YDS", 52]],
        gameLog: [
          { week: 0, opponent: "Notre Dame", result: "W 27-0", stats: [["CAR", 21], ["YARDS", 91], ["AVG", 4.3], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 28], ["LONG", 16], ["SNAPS", 34]] },
          { week: 1, opponent: "Marshall", result: "W 52-10", stats: [["CAR", 10], ["YARDS", 136], ["AVG", 13.6], ["TD", 0], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 31], ["SNAPS", 42]] },
          { week: 2, opponent: "Ball State", result: "W 51-3", stats: [["CAR", 20], ["YARDS", 186], ["AVG", 9.3], ["TD", 2], ["FUMB", 0], ["BTK", 2], ["YAC", 33], ["LONG", 25], ["SNAPS", 32]] },
        ] },
    ],
  },
  {
    week: 4,
    players: [
      { rank: 1, name: "Mitch Sanderson", pos: "HB", team: "Rutgers", year: "SR (RS)", number: 38, archetype: "East/West Playmaker", ovr: 87, height: "6'0\"", weight: 209, hometown: "Irvington, NJ",
        stats: [["RUSH ATT", 81], ["RUSH YDS", 815], ["YPC", 10], ["RUSH TD", 10], ["CATCHES", 10], ["REC YDS", 184]],
        gameLog: [
          { week: 0, opponent: "Georgia", result: "W 50-47", stats: [["CAR", 27], ["YARDS", 163], ["AVG", 6], ["TD", 2], ["FUMB", 0], ["BTK", 2], ["YAC", 39], ["LONG", 20], ["SNAPS", 57]] },
          { week: 1, opponent: "UConn", result: "W 38-24", stats: [["CAR", 15], ["YARDS", 226], ["AVG", 15.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 17], ["LONG", 82], ["SNAPS", 28]] },
          { week: 2, opponent: "Ole Miss", result: "W 45-27", stats: [["CAR", 13], ["YARDS", 235], ["AVG", 18.1], ["TD", 2], ["FUMB", 0], ["BTK", 1], ["YAC", 21], ["LONG", 79], ["SNAPS", 21]] },
          { week: 3, opponent: "Kent State", result: "W 52-14", stats: [["CAR", 26], ["YARDS", 191], ["AVG", 7.3], ["TD", 4], ["FUMB", 0], ["BTK", 0], ["YAC", 29], ["LONG", 61], ["SNAPS", 37]] },
        ] },
      { rank: 2, name: "Quinton Martin Jr.", pos: "HB", team: "Oklahoma State", year: "SR (RS)", number: 9, archetype: "East/West Playmaker", ovr: 87, height: "6'1\"", weight: 207, hometown: "Belle Vernon, PA",
        stats: [["RUSH ATT", 47], ["RUSH YDS", 484], ["YPC", 10], ["RUSH TD", 5], ["CATCHES", 6], ["REC YDS", 157]],
        gameLog: [
          { week: 0, opponent: "Ohio State", result: "W 49-24", stats: [["CAR", 15], ["YARDS", 137], ["AVG", 9.1], ["TD", 2], ["FUMB", 0], ["BTK", 0], ["YAC", 23], ["LONG", 49], ["SNAPS", 43]] },
          { week: 1, opponent: "Tulsa", result: "W 49-17", stats: [["CAR", 14], ["YARDS", 105], ["AVG", 7.5], ["TD", 0], ["FUMB", 0], ["BTK", 2], ["YAC", 27], ["LONG", 18], ["SNAPS", 36]] },
          { week: 2, opponent: "Cincinnati", result: "W 35-21", stats: [["CAR", 18], ["YARDS", 242], ["AVG", 13.4], ["TD", 3], ["FUMB", 0], ["BTK", 3], ["YAC", 25], ["LONG", 69], ["SNAPS", 47]] },
        ] },
      { rank: 3, name: "Karson Cox", pos: "HB", team: "California", year: "JR (RS)", number: 33, archetype: "East/West Playmaker", ovr: 87, height: "5'11\"", weight: 221, hometown: "Moreno Valley, CA",
        stats: [["RUSH ATT", 65], ["RUSH YDS", 611], ["YPC", 9], ["RUSH TD", 3], ["CATCHES", 16], ["REC YDS", 247]],
        gameLog: [
          { week: 0, opponent: "South Carolina", result: "W 31-10", stats: [["CAR", 22], ["YARDS", 160], ["AVG", 7.3], ["TD", 0], ["FUMB", 0], ["BTK", 1], ["YAC", 39], ["LONG", 52], ["SNAPS", 38]] },
          { week: 1, opponent: "UCLA", result: "W 40-38", stats: [["CAR", 32], ["YARDS", 333], ["AVG", 10.4], ["TD", 2], ["FUMB", 0], ["BTK", 3], ["YAC", 59], ["LONG", 81], ["SNAPS", 54]] },
          { week: 2, opponent: "North Dakota State", result: "L 44-40", stats: [["CAR", 11], ["YARDS", 118], ["AVG", 10.7], ["TD", 1], ["FUMB", 1], ["BTK", 5], ["YAC", 5], ["LONG", 81], ["SNAPS", 34]] },
        ] },
      { rank: 4, name: "Paris Hurd-Davis", pos: "HB", team: "Mississippi State", year: "SR", number: 12, archetype: "East/West Playmaker", ovr: 81, height: "5'10\"", weight: 192, hometown: "Hattiesburg, MS",
        stats: [["RUSH ATT", 63], ["RUSH YDS", 506], ["YPC", 8], ["RUSH TD", 6], ["CATCHES", 17], ["REC YDS", 160]],
        gameLog: [
          { week: 0, opponent: "Maryland", result: "W 42-14", stats: [["CAR", 23], ["YARDS", 166], ["AVG", 7.2], ["TD", 4], ["FUMB", 0], ["BTK", 3], ["YAC", 32], ["LONG", 16], ["SNAPS", 47]] },
          { week: 1, opponent: "Wake Forest", result: "W 34-3", stats: [["CAR", 21], ["YARDS", 225], ["AVG", 10.7], ["TD", 2], ["FUMB", 0], ["BTK", 1], ["YAC", 35], ["LONG", 34], ["SNAPS", 55]] },
          { week: 3, opponent: "Memphis", result: "W 31-6", stats: [["CAR", 19], ["YARDS", 115], ["AVG", 6.1], ["TD", 0], ["FUMB", 0], ["BTK", 2], ["YAC", 30], ["LONG", 23], ["SNAPS", 54]] },
        ] },
    ],
  },
];
