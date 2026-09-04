/* ============================================================
   3-STAR DYNASTY — roster, season state, and power rankings
   ------------------------------------------------------------
   Same shape as every other league's league-data.js. script.js and
   style.css are shared from the repo root and need no changes.

   Split of duties:
     league-data.js    who's in the league, what week it is, the poll
     schedule-data.js  each team's 16-week schedule + scores
   ============================================================ */

/* ------------------------------------------------------------
   SEASON STATE — manually advanced, never date-driven.

   currentWeek: "PRESEASON" until Week 0 kicks off in-game, then
   the week number (0-15) currently being played.

   The advance deadline is the only real-world date on the site, and
   it's stored twice: nextAdvanceAt is the authored value and
   nextAdvance is the sentence generated from it. See the long note
   in main/league-data.js — neither should be hand-edited, and both
   go blank together to hide the countdown line.

   Like 1-star, this league names a day and not a clock time, so the
   stored value is a bare date and the badge carries no clock time.
   A bare date resolves to 10 PM Eastern internally, used only to
   decide whether an advance is still ahead; that never reaches the
   site.
   ------------------------------------------------------------ */
const SEASON = {
  // In-game year for this season's data. See the long note in
  // main/league-data.js — it governs the seasons/<year>/ archive.
  year: 2027,

  currentWeek: 1,
  statusLine: "WEEK 1",
  /* Entered as "Monday, August 13th" on the Week 9 advance, back
     when this was free text. The 13th is a Thursday — the date was
     right and the weekday was the typo, so the generated text says
     Thursday now. This is the class of mistake the picker removes:
     nobody types the weekday any more. */
  nextAdvanceAt: "2026-09-07",
  nextAdvance: "Monday, September 7th",
};

/* ------------------------------------------------------------
   LEAGUE IDENTITY
   ------------------------------------------------------------ */
const LEAGUE_INFO = {
  name: "NCAA Legends",
  tag: "3-Star Dynasty",

  links: {
    discord: "",
    rules: "",
  },

  useEspnLogos: true,
};

/* ------------------------------------------------------------
   COACHES — from the Active Roster tab, snapshot 2026-07-21.

   TEAM NAMES are expanded from the sign-up sheet's shorthand so
   they read consistently with the other leagues and so the ESPN
   logo lookup is unambiguous:
     Cal -> California      ISU  -> Iowa State
     JMU -> James Madison   NDSU -> North Dakota State
     Pitt -> Pittsburgh     VA Tech -> Virginia Tech

   CONFERENCES are the league's own custom realignment, not the
   real-world alignment — James Madison, North Texas, Charlotte and
   North Dakota State genuinely sit in this league's SEC. Don't
   "correct" these to stock conferences.

   espnId values are unverified — open /logo-check.html to eyeball
   them all at once. A wrong id silently renders another school's
   logo; a missing one just falls back to the monogram chip.
   ------------------------------------------------------------ */
const COACHES = [
  { name: "Bl00dVayN3",      team: "California",         conference: "ACC", color: "#FDB515", twitch: "https://www.twitch.tv/bl00dvayn3", espnId: "25" },
  { name: "Temptiger",       team: "James Madison",      conference: "SEC", color: "#9B6BD8", twitch: "https://www.twitch.tv/temptiger", espnId: "256" },
  { name: "DiabeticSnail22", team: "North Texas",        conference: "SEC", color: "#35B06A", twitch: "https://www.twitch.tv/diabeticsnail22", espnId: "249", active: false },  // Went inactive here after Week 4; still active in the main dynasty. Weeks 0-4 stand (Texan_hog keeps the Week 4 loss); North Texas is CPU from Week 5. See the flag notes in main/league-data.js.
  { name: "Brian52682",      team: "Baylor",             conference: "XII", color: "#F5C542", twitch: "https://www.twitch.tv/brian52682", espnId: "239" },
  { name: "Dway",            team: "Iowa State",         conference: "XII", color: "#D6394E", twitch: "https://www.twitch.tv/dwayinspired", espnId: "66" },
  { name: "Salzy",           team: "Wisconsin",          conference: "B1G", color: "#D63B45", twitch: "https://www.twitch.tv/salzy117", espnId: "275" },
  { name: "Oldarmy324",      team: "Pittsburgh",         conference: "ACC", color: "#F5C542", twitch: "https://www.twitch.tv/oldarmy324", espnId: "221" },
  { name: "Cleveland",       team: "Virginia Tech",      conference: "ACC", color: "#E8703F", twitch: "https://www.twitch.tv/buckeyefan_", espnId: "259", active: false },  // Left the league from week 15, the same way Trick whitey did — weeks 0-14 stand as real head-to-head games; Virginia Tech is CPU from week 15 on, so Oldarmy324's ACC Championship win over Virginia Tech is a CPU game, and so is RonRicoFSU's Pop-Tarts Bowl.
  { name: "Trick whitey",    team: "Maryland",           conference: "B1G", color: "#FFD24D", twitch: "https://www.twitch.tv/trickwhitey44", espnId: "120", active: false },  // Left the league during championship week for personal reasons — weeks 0-14 stand as real head-to-head games; Maryland is CPU from week 15 on, so Salzy's Big Ten Championship win over Maryland is a CPU game, not a head-to-head result. Also left the main dynasty (Alabama) in the same move.
  { name: "Texan_hog",       team: "North Dakota State", conference: "B1G", color: "#35B86A", twitch: "https://www.twitch.tv/texan_hog08", espnId: "2449" },
  { name: "RonRicoFSU",      team: "Colorado",           conference: "XII", color: "#CFB87C", twitch: "https://www.twitch.tv/ronricofsu", espnId: "38" },
  { name: "EHDC12",          team: "North Carolina",     conference: "ACC", color: "#7BAFD4", twitch: "https://www.twitch.tv/DCGQManOfTheYear7", espnId: "153" },
  { name: "wacky9speedy",    team: "Charlotte",          conference: "SEC", color: "#4FAE84", twitch: "https://www.twitch.tv/wacky9speedy", espnId: "2429" },
  { name: "EYEDONTPULL19",   team: "UCF",                conference: "SEC", color: "#E0C158", twitch: "", espnId: "2116" },
  { name: "RekenCrew",       team: "Oklahoma State",     conference: "XII", color: "#FF7300", twitch: "https://www.twitch.tv/rekencrew", espnId: "197" },  // Joined for 2027. Same RekenCrew as the main dynasty (Ohio State): one Twitch, and one shared entry in tools/config.json for Discord pings.
  { name: "BlueMiniMeaniee", team: "Oregon State",       conference: "B1G", color: "#DC4405", twitch: "https://www.twitch.tv/blueminimeaniee", espnId: "204" },  // Joined for 2027. Same BlueMiniMeaniee as the main dynasty (Cal): one Twitch, and one shared entry in tools/config.json for Discord pings.
  { name: "Miles",           team: "Rutgers",            conference: "B1G", color: "#E03A57", twitch: "https://www.twitch.tv/kyrvach", espnId: "164" },  // Took Rutgers over mid-2026 (joinedAtWeek: 11, now cleared) and is active for all of 2027 — the CPU weeks that flag guarded live in seasons/2026/. Same Miles as the main dynasty (Georgia): one Twitch, and one shared entry in tools/config.json for Discord pings.
];

/* ------------------------------------------------------------
   POWER RANKINGS

   Empty until enough H2H (user vs. user) games are on the board.
   The Rankings tab shows an explanatory empty state until this
   array has rows. Shape:
     { week: 3, rank: 1, team: "Wisconsin", record: "3-0", score: 97.5 }
   ------------------------------------------------------------ */
const RANKINGS = [];
