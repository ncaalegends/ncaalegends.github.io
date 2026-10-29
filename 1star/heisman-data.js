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
const HEISMAN = [];
