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

   nextAdvance is the only real-world date on the site — it's a
   scheduling deadline for coaches, not part of season chronology.
   ------------------------------------------------------------ */
const SEASON = {
  /* IN-GAME YEAR — the dynasty's season identity.

     This is the season the files in THIS folder describe. When the
     dynasty rolls over, the completed season's data files move to
     seasons/<year>/ and this number goes up; see the SEASON ARCHIVE
     note below. Everything historical (career H2H, records against a
     given coach, peak rankings) is keyed on this, so it has to be set
     before the first archive happens — a season archived without a
     year can't be placed on the timeline afterwards.

     In-game year, not real-world year: the roster is EA College
     Football 27's 2026 season, and in-game years drift away from real
     life as the dynasty runs. 2026 -> 2027 -> 2028 and so on. */
  year: 2026,

  currentWeek: 15,

  // Shown in the hero. Update as the league moves through phases.
  statusLine: "WEEK 15 (CHAMPIONSHIPS)",

  /* ADVANCE DEADLINE — the one place real-world time appears.
     League rule: the next advance happens no later than 6:00 PM EDT
     three days after the last advance.

     TWO FIELDS, ONE AUTHORED. nextAdvanceAt is the real value: an
     ISO timestamp with an explicit Eastern offset. nextAdvance is
     the sentence the site shows, and it is GENERATED from that
     timestamp — the admin page and advance.js both write the pair
     together, so don't hand-edit either one. If they ever disagree,
     nextAdvanceAt is right and the next advance will correct the
     text.

     The timestamp exists because free text can't be computed with,
     and the advance-day heads-up (tools/heads-up.js) has to answer
     "is the advance today?" every morning before it decides whether
     to post next week's H2H matchups. /deadline.js does the
     conversion in both directions and explains the Eastern rule.

     Set BOTH to "" to hide the countdown line entirely. */
  nextAdvanceAt: "2026-09-01T18:00:00-04:00",
  nextAdvance: "Tuesday, September 1st - 6:00 PM EDT",
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
   active:     optional. Leave it off for anyone currently playing.
               Set `active: false` for a coach who has stepped away
               but whose spot you're holding — they drop off the
               roster, their team reverts to a CPU opponent in every
               schedule, and they leave the By Team dropdown, while
               all their data stays right here. Delete the flag to
               reinstate them exactly as they were.

               Use this ONLY when they have no played games worth
               keeping. It applies to the whole season, including
               weeks already in the books, so a coach who had played
               would take their opponents' results down with them.

   departedAfterWeek:
               optional, and the flag to reach for when someone quits
               PART WAY THROUGH a season they've played in. `4` means
               weeks 0-4 stand as real head-to-head games — their
               opponents keep those results, records and power-poll
               windows — and from week 5 the team is a CPU opponent.
               They leave the roster grid, the By Team dropdown and
               the power rankings, exactly like `active: false`.

               Per-season and self-limiting: it belongs to the season
               the departure happened in, freezes into seasons/<year>/
               at rollover, and is simply not carried into next year's
               roster. It never piles up.

   joinedAtWeek:
               optional, and the mirror of departedAfterWeek: someone
               taking a team over PART WAY THROUGH a season already in
               progress. `11` means weeks 0-10 were played by the CPU
               and stay CPU — nobody's earlier win over that school
               turns into a head-to-head result — and from week 11 the
               team is a league team like any other.

               UNLIKE the other two flags, this one does NOT hide the
               coach. They are on the roster grid, in the By Team
               dropdown and in the power rankings from the moment you
               add them, because they are in the league from the
               moment you add them; the flag governs which GAMES count,
               not whether the person exists. That asymmetry is
               deliberate — you want to announce a new coach before
               their first kickoff, and you never want to announce a
               departed one after their last.

               Their own earlier schedule rows still render, as the
               CPU results they were. Their record starts accruing
               head-to-head from the joined week.

               Per-season and self-limiting in the same way: drop the
               flag at rollover and they're an ordinary coach.

   No flag touches the career record. A game played between two
   humans stays in both their histories forever — see the note on
   computeH2H in week-core.js.
   ------------------------------------------------------------ */
const COACHES = [
  { name: "Bl00dVayN3",      team: "South Carolina",               conference: "SEC", color: "#A6192E", twitch: "https://www.twitch.tv/bl00dvayn3", espnId: "2579" },
  { name: "Temptiger",       team: "Clemson",                      conference: "ACC", color: "#F56600", twitch: "https://www.twitch.tv/temptiger", espnId: "228" },
  { name: "RekenCrew",       team: "Ohio State",                   conference: "B1G", color: "#CE2029", twitch: "https://www.twitch.tv/rekencrew", espnId: "194" },
  { name: "Turt17",          team: "Colorado",                     conference: "XII", color: "#CFB87C", twitch: "https://www.twitch.tv/turt17", espnId: "38" },
  { name: "Davey88",         team: "Oregon",                       conference: "B1G", color: "#FEE123", twitch: "https://www.twitch.tv/dbenjamin541", espnId: "2483" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Pointdexter420",  team: "Oklahoma",                     conference: "SEC", color: "#C8102E", twitch: "https://www.twitch.tv/smackintaint", espnId: "201" },
  { name: "Texan_hog",       team: "Washington",                   conference: "B1G", color: "#7A5BB5", twitch: "https://www.twitch.tv/texan_hog08", espnId: "264" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Miles",           team: "Georgia",                      conference: "SEC", color: "#D6203A", twitch: "https://www.twitch.tv/kyrvach", espnId: "61" },
  { name: "BlueMiniMeaniee", team: "Cal",                          conference: "ACC", color: "#FDB515", twitch: "https://www.twitch.tv/blueminimeaniee", espnId: "25" },
  { name: "Woogity",         team: "Alabama",                      conference: "SEC", color: "#C7304A", twitch: "https://www.twitch.tv/kingwoogity", espnId: "333", departedAfterWeek: 4 },  // Went inactive during week 5 — weeks 0-4 stand as real games; Alabama was CPU from week 5 until Trick whitey took it over in week 11 (below).
  { name: "Trick whitey",    team: "Alabama",                      conference: "SEC", color: "#C7304A", twitch: "https://www.twitch.tv/trickwhitey44", espnId: "333", joinedAtWeek: 11, departedAfterWeek: 12 },  // Took Alabama over from Woogity in week 11 and left the league after week 12 for personal reasons, so he held the school for weeks 11-12 only. Weeks 0-4 are Woogity's head-to-head games and stay his; weeks 5-10 belong to nobody and stay CPU — in particular Miles's Week 6 win over Alabama is NOT a head-to-head result — and Alabama is CPU again from week 13 on. Also left the 3-star dynasty (Maryland) after week 14 in the same move.
  { name: "Alex",            team: "Florida",                      conference: "SEC", color: "#FA4616", twitch: "https://www.twitch.tv/alexgators1", espnId: "57" },
  { name: "brewma",          team: "Wake Forest",                  conference: "ACC", color: "#C9A227", twitch: "https://www.twitch.tv/brewma2020", espnId: "154" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Jake",            team: "Louisville",                   conference: "ACC", color: "#CB3B47", twitch: "", espnId: "97", active: false },  // Stepped away (playing in another dynasty) — may return. See `active` note above. Remove this flag to reinstate.
  { name: "Projekt",         team: "Michigan",                     conference: "B1G", color: "#FFCB05", twitch: "https://www.twitch.tv/projekt6868", espnId: "130" },
  { name: "Dway",            team: "UCLA",                         conference: "B1G", color: "#4B92DB", twitch: "https://www.twitch.tv/dwayinspired", espnId: "26" },  // UNVERIFIED — confirm via logo-check.html
  { name: "DiabeticSnail22", team: "West Virginia",                conference: "XII", color: "#EAAA00", twitch: "https://www.twitch.tv/diabeticsnail22", espnId: "277" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Oldarmy324",      team: "TCU",                          conference: "XII", color: "#8A7FD1", twitch: "https://www.twitch.tv/oldarmy324", espnId: "2628" },
  { name: "ronricofsu",      team: "FSU",                          conference: "ACC", color: "#CEB888", twitch: "https://www.twitch.tv/ronricofsu", espnId: "52" },
  { name: "Big_Ry",          team: "Texas",                        conference: "SEC", color: "#BF5700", twitch: "https://www.twitch.tv/big_ry94", espnId: "251" },  // UNVERIFIED — confirm via logo-check.html
  { name: "EYEDONTPULL19",   team: "SMU",                          conference: "ACC", color: "#5A6FD1", twitch: "", espnId: "2567" },
  { name: "wacky9speedy",    team: "Miami",                        conference: "ACC", color: "#F47321", twitch: "https://www.twitch.tv/wacky9speedy", espnId: "2390" },  // UNVERIFIED — confirm via logo-check.html
  { name: "BluBus",          team: "USC",                          conference: "B1G", color: "#FFC72C", twitch: "https://www.twitch.tv/blubusbandit", espnId: "30" },  // UNVERIFIED — confirm via logo-check.html
  { name: "Brian52682",    team: "Notre Dame",                   conference: "IND", color: "#C99700", twitch: "https://www.twitch.tv/brian52682", espnId: "87" },   // UNVERIFIED — confirm via logo-check.html
  { name: "II_PROGGY_II",    team: "Ole Miss",                     conference: "SEC", color: "#CE1126", twitch: "https://www.twitch.tv/ii_proggy_ii", espnId: "145", departedAfterWeek: 9 },  // UNVERIFIED — confirm via logo-check.html // Went inactive during week 10 — weeks 0-9 stand as real games; Ole Miss is a CPU opponent from week 10 on.
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
