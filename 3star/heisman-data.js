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
];
