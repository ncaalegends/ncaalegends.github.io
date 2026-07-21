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

   nextAdvance is the only real-world date on the site. This league
   is run by a different commissioner and isn't on the automated
   advance tooling yet, so it's blank — which hides the countdown
   line entirely rather than showing a stale deadline.
   ------------------------------------------------------------ */
const SEASON = {
  currentWeek: 0,
  statusLine: "WEEK 0 — SEASON KICKOFF",
  nextAdvance: "",
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
  { name: "DiabeticSnail22", team: "North Texas",        conference: "SEC", color: "#35B06A", twitch: "https://www.twitch.tv/diabeticsnail22", espnId: "249" },
  { name: "Brian52682",      team: "Baylor",             conference: "XII", color: "#F5C542", twitch: "https://www.twitch.tv/brian52682", espnId: "239" },
  { name: "Dway",            team: "Iowa State",         conference: "XII", color: "#D6394E", twitch: "https://www.twitch.tv/dwayinspired", espnId: "66" },
  { name: "Salzy",           team: "Wisconsin",          conference: "B1G", color: "#D63B45", twitch: "", espnId: "275" },
  { name: "Oldarmy324",      team: "Pittsburgh",         conference: "ACC", color: "#F5C542", twitch: "https://www.twitch.tv/oldarmy324", espnId: "221" },
  { name: "Cleveland",       team: "Virginia Tech",      conference: "ACC", color: "#E8703F", twitch: "", espnId: "259" },
  { name: "Trick whitey",    team: "Maryland",           conference: "B1G", color: "#FFD24D", twitch: "", espnId: "120" },
  { name: "Texan_hog",       team: "North Dakota State", conference: "SEC", color: "#35B86A", twitch: "https://www.twitch.tv/texan_hog08", espnId: "2449" },
  { name: "RonRicoFSU",      team: "Colorado",           conference: "XII", color: "#CFB87C", twitch: "https://www.twitch.tv/ronricofsu", espnId: "38" },
  { name: "EHDC12",          team: "North Carolina",     conference: "ACC", color: "#7BAFD4", twitch: "", espnId: "153" },
  { name: "wacky9speedy",    team: "Charlotte",          conference: "SEC", color: "#4FAE84", twitch: "https://www.twitch.tv/wacky9speedy", espnId: "2429" },
  { name: "EYEDONTPULL19",   team: "UCF",                conference: "XII", color: "#E0C158", twitch: "", espnId: "2116" },
  { name: "CoachLawless",    team: "Rutgers",            conference: "B1G", color: "#E03A57", twitch: "", espnId: "164" },
];

/* ------------------------------------------------------------
   POWER RANKINGS

   Empty until enough H2H (user vs. user) games are on the board.
   The Rankings tab shows an explanatory empty state until this
   array has rows. Shape:
     { week: 3, rank: 1, team: "Wisconsin", record: "3-0", score: 97.5 }
   ------------------------------------------------------------ */
const RANKINGS = [];
