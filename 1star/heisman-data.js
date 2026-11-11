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
      { rank: 1, name: "Donovan Olugbode", pos: "WR", team: "Texas Tech", year: "SR", number: 17, archetype: "Contested Specialist", ovr: 95, height: "6'2\"", weight: 210, hometown: "Chicago, IL",
        stats: [["CATCHES", 0], ["REC YDS", 0], ["REC TD", 0], ["LONG REC", 0], ["REC YAC", 0], ["DROPS", 0]] },
      { rank: 2, name: "Grant Lawless", pos: "QB", team: "Clemson", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 91, height: "6'4\"", weight: 200, hometown: "Wendell, NC",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 3, name: "Jake Fette", pos: "QB", team: "Texas A&M", year: "SO (RS)", number: 16, archetype: "Pure Runner", ovr: 90, height: "6'1\"", weight: 201, hometown: "El Paso, TX",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 4, name: "Bryce Underwood", pos: "QB", team: "LSU", year: "SR", number: 19, archetype: "Backfield Creator", ovr: 90, height: "6'4\"", weight: 230, hometown: "Detroit, MI",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 1,
    players: [
      { rank: 1, name: "Donovan Olugbode", pos: "WR", team: "Texas Tech", year: "SR", number: 17, archetype: "Contested Specialist", ovr: 95, height: "6'2\"", weight: 210, hometown: "Chicago, IL",
        stats: [["CATCHES", 7], ["REC YDS", 96], ["REC TD", 0], ["LONG REC", 36], ["REC YAC", 34], ["DROPS", 0]] },
      { rank: 2, name: "Grant Lawless", pos: "QB", team: "Clemson", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 91, height: "6'4\"", weight: 200, hometown: "Wendell, NC",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 3, name: "Jake Fette", pos: "QB", team: "Texas A&M", year: "SO (RS)", number: 16, archetype: "Pure Runner", ovr: 90, height: "6'1\"", weight: 201, hometown: "El Paso, TX",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
      { rank: 4, name: "Bryce Underwood", pos: "QB", team: "LSU", year: "SR", number: 19, archetype: "Backfield Creator", ovr: 90, height: "6'4\"", weight: 230, hometown: "Detroit, MI",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 2,
    players: [
      { rank: 1, name: "Donovan Olugbode", pos: "WR", team: "Texas Tech", year: "SR", number: 17, archetype: "Contested Specialist", ovr: 95, height: "6'2\"", weight: 210, hometown: "Chicago, IL",
        stats: [["CATCHES", 11], ["REC YDS", 146], ["REC TD", 0], ["LONG REC", 36], ["REC YAC", 52], ["DROPS", 1]] },
      { rank: 2, name: "Grant Lawless", pos: "QB", team: "Clemson", year: "SO (RS)", number: 11, archetype: "Pure Runner", ovr: 91, height: "6'4\"", weight: 200, hometown: "Wendell, NC",
        stats: [["PASS YDS", 268], ["PASS TD", 4], ["PASS COMP %", 57], ["PASS INT", 0], ["RUSH ATT", 14], ["RUSH YDS", 84]] },
      { rank: 3, name: "Jake Fette", pos: "QB", team: "Texas A&M", year: "SO (RS)", number: 16, archetype: "Pure Runner", ovr: 90, height: "6'1\"", weight: 201, hometown: "El Paso, TX",
        stats: [["PASS YDS", 182], ["PASS TD", 3], ["PASS COMP %", 50], ["PASS INT", 0], ["RUSH ATT", 13], ["RUSH YDS", 82]] },
      { rank: 4, name: "Landon Duckworth", pos: "QB", team: "Texas A&M", year: "SO (RS)", number: 4, archetype: "Pure Runner", ovr: 90, height: "6'4\"", weight: 213, hometown: "Jackson, AL",
        stats: [["PASS YDS", 0], ["PASS TD", 0], ["PASS COMP %", 0], ["PASS INT", 0], ["RUSH ATT", 0], ["RUSH YDS", 0]] },
    ],
  },
  {
    week: 3,
    players: [
      { rank: 1, name: "Quincy Porter", pos: "WR", team: "Miami", year: "JR (RS)", number: 80, archetype: "Contested Specialist", ovr: 90, height: "6'4\"", weight: 213, hometown: "Cherry Hill, NJ",
        stats: [["CATCHES", 13], ["REC YDS", 233], ["REC TD", 6], ["LONG REC", 52], ["REC YAC", 110], ["DROPS", 1]] },
      { rank: 2, name: "Gerald Ezekiel", pos: "QB", team: "Baldwin Wallace", year: "FR", number: 9, archetype: "Dual Threat", ovr: 73, height: "6'3\"", weight: 218, hometown: "Danville, KY",
        stats: [["PASS YDS", 584], ["PASS TD", 4], ["PASS COMP %", 70], ["PASS INT", 2], ["RUSH ATT", 47], ["RUSH YDS", 236]],
        gameLog: [
          { week: 0, opponent: "California", result: "W 45-14", stats: [["RATING", 160.8], ["YARDS", 193], ["TD", 2], ["INT", 0], ["LONG", 27], ["SACKS", 0], ["COMP", 19], ["ATT", 26], ["COMP%", 73], ["YPA", 7.4], ["SNAPS", 60]] },
          { week: 1, opponent: "Ole Miss", result: "W 33-7", stats: [["RATING", 104.8], ["YARDS", 121], ["TD", 0], ["INT", 2], ["LONG", 16], ["SACKS", 2], ["COMP", 19], ["ATT", 24], ["COMP%", 79], ["YPA", 5], ["SNAPS", 59]] },
          { week: 2, opponent: "Middle Tennessee", result: "W 28-10", stats: [["RATING", 163], ["YARDS", 270], ["TD", 2], ["INT", 0], ["LONG", 65], ["SACKS", 5], ["COMP", 18], ["ATT", 29], ["COMP%", 62], ["YPA", 9.3], ["SNAPS", 62]] },
        ] },
      { rank: 3, name: "Nick Bercovici", pos: "QB", team: "Oklahoma", year: "SO", number: 15, archetype: "Pure Runner", ovr: 85, height: "6'5\"", weight: 204, hometown: "Wichita Falls, TX",
        stats: [["PASS YDS", 437], ["PASS TD", 6], ["PASS COMP %", 75], ["PASS INT", 0], ["RUSH ATT", 34], ["RUSH YDS", 210]] },
      { rank: 4, name: "Jayden Sellers", pos: "WR", team: "South Carolina", year: "SR", number: 17, archetype: "Elusive Route Runner", ovr: 83, height: "5'11\"", weight: 190, hometown: "Florence, SC",
        stats: [["CATCHES", 17], ["REC YDS", 275], ["REC TD", 4], ["LONG REC", 81], ["REC YAC", 140], ["DROPS", 0]] },
    ],
  },
  {
    week: 4,
    players: [
      { rank: 1, name: "Quincy Porter", pos: "WR", team: "Miami", year: "JR (RS)", number: 80, archetype: "Contested Specialist", ovr: 90, height: "6'4\"", weight: 213, hometown: "Cherry Hill, NJ",
        stats: [["CATCHES", 19], ["REC YDS", 417], ["REC TD", 8], ["LONG REC", 84], ["REC YAC", 235], ["DROPS", 1]] },
      { rank: 2, name: "Chris Denson", pos: "QB", team: "Miami", year: "JR (RS)", number: 15, archetype: "Pure Runner", ovr: 87, height: "6'2\"", weight: 203, hometown: "Plant City, FL",
        stats: [["PASS YDS", 1117], ["PASS TD", 13], ["PASS COMP %", 65], ["PASS INT", 3], ["RUSH ATT", 30], ["RUSH YDS", 161]] },
      { rank: 3, name: "Bryce Underwood", pos: "QB", team: "LSU", year: "SR", number: 19, archetype: "Backfield Creator", ovr: 91, height: "6'4\"", weight: 230, hometown: "Detroit, MI",
        stats: [["PASS YDS", 857], ["PASS TD", 9], ["PASS COMP %", 70], ["PASS INT", 1], ["RUSH ATT", 30], ["RUSH YDS", 164]] },
      { rank: 4, name: "Jake Fette", pos: "QB", team: "Texas A&M", year: "SO (RS)", number: 16, archetype: "Pure Runner", ovr: 90, height: "6'1\"", weight: 201, hometown: "El Paso, TX",
        stats: [["PASS YDS", 767], ["PASS TD", 9], ["PASS COMP %", 63], ["PASS INT", 1], ["RUSH ATT", 43], ["RUSH YDS", 273]] },
    ],
  },
  {
    week: 5,
    players: [
      { rank: 1, name: "Jake Fette", pos: "QB", team: "Texas A&M", year: "SO (RS)", number: 16, archetype: "Pure Runner", ovr: 90, height: "6'1\"", weight: 201, hometown: "El Paso, TX",
        stats: [["PASS YDS", 1089], ["PASS TD", 11], ["PASS COMP %", 68], ["PASS INT", 1], ["RUSH ATT", 54], ["RUSH YDS", 403]] },
      { rank: 2, name: "Chris Denson", pos: "QB", team: "Miami", year: "JR (RS)", number: 15, archetype: "Pure Runner", ovr: 87, height: "6'2\"", weight: 203, hometown: "Plant City, FL",
        stats: [["PASS YDS", 1495], ["PASS TD", 17], ["PASS COMP %", 69], ["PASS INT", 4], ["RUSH ATT", 40], ["RUSH YDS", 162]] },
      { rank: 3, name: "Quincy Porter", pos: "WR", team: "Miami", year: "JR (RS)", number: 80, archetype: "Contested Specialist", ovr: 91, height: "6'4\"", weight: 213, hometown: "Cherry Hill, NJ",
        stats: [["CATCHES", 24], ["REC YDS", 479], ["REC TD", 9], ["LONG REC", 84], ["REC YAC", 257], ["DROPS", 2]] },
      { rank: 4, name: "Jimmy Simon", pos: "QB", team: "USC", year: "SO", number: 1, archetype: "Backfield Creator", ovr: 82, height: "6'3\"", weight: 196, hometown: "Concord, CA",
        stats: [["PASS YDS", 1357], ["PASS TD", 10], ["PASS COMP %", 63], ["PASS INT", 2], ["RUSH ATT", 38], ["RUSH YDS", 130]] },
    ],
  },
];
