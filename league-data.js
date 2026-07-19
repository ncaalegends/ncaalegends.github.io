/* ============================================================
   LEAGUE DATA — roster, season state, and power rankings
   ------------------------------------------------------------
   This file plus schedule-data.js is everything you edit.
   script.js is pure logic and shouldn't need changes.

   Split of duties:
     league-data.js    who's in the league, what week it is, the poll
     schedule-data.js  each team's 16-week schedule + scores
   ============================================================ */

/* ------------------------------------------------------------
   SEASON STATE — manually advanced, never date-driven.

   The site has no concept of real-world dates, because in-game
   seasons drift years away from real life. Week number is the
   only clock.

   currentWeek: "PRESEASON" until Week 0 kicks off in-game, then
   set it to the week number (0-15) you're currently playing.
   That one value drives the Home tab, the "current week" flag on
   the schedule, and which results count as recent.
   ------------------------------------------------------------ */
const SEASON = {
  currentWeek: "PRESEASON",

  // Shown in the hero. Update as the league moves through phases.
  statusLine: "PRE-SEASON — COACHES SIGNING UP",
};

/* ------------------------------------------------------------
   LEAGUE IDENTITY
   ------------------------------------------------------------ */
const LEAGUE_INFO = {
  name: "NCAA Legends",
  tag: "Main Dynasty",

  /* Footer links. Each one only renders once you paste a URL in —
     leave a value as "" and that link stays hidden, so nothing
     looks broken while you're still setting things up.
     Must include https:// (bare "discord.gg/x" is rejected). */
  links: {
    discord: "",   // e.g. "https://discord.gg/yourinvite"
    rules: "",     // e.g. "https://docs.google.com/document/d/..."
  },

  /* Team logos are hotlinked from ESPN's CDN using the espnId on
     each coach below. Set this to false to turn logos off site-wide
     and fall back to the colored monogram chips everywhere. */
  useEspnLogos: true,
};

/* ------------------------------------------------------------
   COACHES — the sign-up sheet. Snapshot taken 2026-07-18.

   team:       must match the roster name. If the in-game school
               name differs (e.g. "California" in-game vs "Cal"
               here), add a mapping to SCHEDULE_TEAM_ALIASES at
               the bottom of schedule-data.js.
   conference: shown as a chip on the roster card.
   twitch:     full URL INCLUDING https:// — "www.twitch.tv/name"
               on its own is rejected and the button won't render.
               Leave "" until a coach sends theirs; cards with no
               link just omit the button, no placeholder text.

   Undecided teams: use a slash, e.g. "Wake Forest / Oklahoma
   State". The site treats BOTH as league teams for tagging
   purposes until the coach locks one in.

   color:      the team's accent, used for the bar on their roster
               card and the rule under their schedule header. These
               are brightened versions of each school's real color —
               a few programs (Washington purple, FSU garnet) are too
               dark to read against the navy at their true value, so
               they're lifted. Adjust any of them freely; they're
               only ever used as a graphic accent, never as text.
   ------------------------------------------------------------ */
const COACHES = [
  { name: "Bl00dVayN3",      team: "South Carolina",               conference: "SEC", color: "#A6192E", twitch: "", espnId: "2579" },
  { name: "Temptiger",       team: "Clemson",                      conference: "ACC", color: "#F56600", twitch: "", espnId: "228" },
  { name: "RekenCrew",       team: "Ohio State",                   conference: "B1G", color: "#CE2029", twitch: "https://www.twitch.tv/rekencrew", espnId: "194" },
  { name: "Turt17",          team: "Colorado",                     conference: "XII", color: "#CFB87C", twitch: "", espnId: "38" },
  { name: "Davey88",         team: "Oregon",                       conference: "B1G", color: "#FEE123", twitch: "", espnId: "2483" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Pointdexter420",  team: "Oklahoma",                     conference: "SEC", color: "#C8102E", twitch: "", espnId: "201" },
  { name: "Texan_hog",       team: "Washington",                   conference: "B1G", color: "#7A5BB5", twitch: "", espnId: "264" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Miles",           team: "Georgia",                      conference: "SEC", color: "#D6203A", twitch: "", espnId: "61" },
  { name: "BlueMiniMeaniee", team: "Cal",                          conference: "ACC", color: "#FDB515", twitch: "", espnId: "25" },
  { name: "Woogity",         team: "Alabama",                      conference: "SEC", color: "#C7304A", twitch: "", espnId: "333" },
  { name: "Alex",            team: "Florida",                      conference: "SEC", color: "#FA4616", twitch: "", espnId: "57" },
  { name: "brewma",          team: "Wake Forest",                  conference: "ACC", color: "#C9A227", twitch: "", espnId: "154" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Jake",            team: "Louisville",                   conference: "ACC", color: "#CB3B47", twitch: "", espnId: "97" },
  { name: "Projekt",         team: "Michigan",                     conference: "B1G", color: "#FFCB05", twitch: "", espnId: "130" },
  { name: "Dway",            team: "UCLA",                         conference: "B1G", color: "#4B92DB", twitch: "", espnId: "26" },  // UNVERIFIED — confirm via logo-check.html
  { name: "DiabeticSnail22", team: "West Virginia",                conference: "XII", color: "#EAAA00", twitch: "", espnId: "277" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Oldarmy324",      team: "TCU",                          conference: "XII", color: "#8A7FD1", twitch: "", espnId: "2628" },
  { name: "ronricofsu",      team: "FSU",                          conference: "ACC", color: "#CEB888", twitch: "", espnId: "52" },
  { name: "Big_Ry",          team: "Texas",                        conference: "SEC", color: "#BF5700", twitch: "", espnId: "251" },  // UNVERIFIED — confirm via logo-check.html
  { name: "EYEDONTPULL19",   team: "SMU",                          conference: "ACC", color: "#5A6FD1", twitch: "", espnId: "2567" },
  { name: "wacky9speedy",    team: "Miami",                        conference: "ACC", color: "#F47321", twitch: "", espnId: "2390" },  // UNVERIFIED — confirm via logo-check.html
  { name: "BluBus",          team: "USC",                          conference: "B1G", color: "#FFC72C", twitch: "", espnId: "30" },  // UNVERIFIED — confirm via logo-check.html
];

/* ------------------------------------------------------------
   POWER RANKINGS

   Empty on purpose. The poll ranks league games only — coach vs.
   coach results, not CPU matchups — so there's nothing to rank
   until enough of those are on the board. The Rankings tab shows
   an explanatory empty state until this array has rows.

   When you're ready to publish a poll, add one row per team:
     { week: 3, rank: 1, team: "Ohio State", record: "3-0", score: 97.5 }

   week   which week's poll this row belongs to
   rank   1 = best
   team   must match a COACHES team name above
   record optional W-L string, shown next to the team
   score  optional poll points

   The site displays the highest week present and computes the
   ▲▼ movement against the previous poll automatically.
   ------------------------------------------------------------ */
const RANKINGS = [];
