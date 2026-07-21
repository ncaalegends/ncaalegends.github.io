/* ============================================================
   NCAA LEGENDS — SITE LOGIC
   ------------------------------------------------------------
   You shouldn't need to edit this file. Everything you update
   week to week lives in:
     league-data.js    roster, season state, power rankings
     schedule-data.js  team schedules and scores

   No dates anywhere. Week number is the only clock, because
   in-game seasons drift years from real life. SEASON.currentWeek
   in league-data.js is the single source of truth for "now".
   ============================================================ */

/* ------------------------------------------------------------
   SAFETY
   Everything from the data files is escaped before it reaches
   the DOM, so an ampersand in a stadium name or a stray angle
   bracket in a gamertag can't break the page.
   ------------------------------------------------------------ */
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

// Only real web links become hrefs — blocks javascript: URLs.
function safeUrl(url) {
  const u = String(url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : "";
}

// Team colors go into a style attribute, so only accept a literal
// hex value — anything else can't break out into arbitrary CSS.
function safeHex(v) {
  const s = String(v ?? "").trim();
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(s) ? s : "";
}

/* ------------------------------------------------------------
   DATA HANDLES
   Guarded so a missing/typo'd data file degrades to an empty
   site instead of a blank white page.
   ------------------------------------------------------------ */
const SCHEDULES = typeof TEAM_SCHEDULES !== "undefined" ? TEAM_SCHEDULES : [];
const ALIASES = typeof SCHEDULE_TEAM_ALIASES !== "undefined" ? SCHEDULE_TEAM_ALIASES : {};
const ROSTER = typeof COACHES !== "undefined" ? COACHES : [];
const POLL = typeof RANKINGS !== "undefined" ? RANKINGS : [];
const INFO = typeof LEAGUE_INFO !== "undefined" ? LEAGUE_INFO : { name: "League", tag: "" };

/* ------------------------------------------------------------
   TEAM NAME RESOLUTION
   ------------------------------------------------------------
   Three different names can refer to the same program:
     in-game schedule name   "California"
     roster name             "Cal"
     undecided roster entry  "Wake Forest / Oklahoma State"

   normalize() collapses case and spacing. rosterKeyFor() maps a
   schedule name through the alias table. ROSTER_KEYS holds every
   name the league occupies, with slash entries counted on both
   sides, so an undecided coach still gets league games tagged.
   ------------------------------------------------------------ */
const normalize = (s) => String(s ?? "").trim().toLowerCase();

// Every name a roster team answers to, slash entries split out.
const ROSTER_KEYS = new Set();
ROSTER.forEach((c) => {
  String(c.team)
    .split("/")
    .forEach((part) => {
      const k = normalize(part);
      if (k) ROSTER_KEYS.add(k);
    });
});

// Schedule name -> roster name, via the alias table when needed.
function rosterKeyFor(scheduleName) {
  const direct = normalize(scheduleName);
  const aliased = ALIASES[scheduleName];
  return aliased ? normalize(aliased) : direct;
}

/* Is this opponent another coach in the league?
   Checked against the ROSTER (22 teams), not against who has
   turned in a schedule (15) — otherwise a game against a coach
   who hasn't sent a screenshot yet looks like a CPU game. */
function isLeagueTeam(scheduleName) {
  return ROSTER_KEYS.has(rosterKeyFor(scheduleName));
}

// Teams that have actually submitted a schedule. Used only for
// deduping — a matchup can only appear twice if both sides are in.
const KNOWN_SCHEDULE_TEAMS = new Set(SCHEDULES.map((t) => t.team));

function rosterEntryFor(scheduleName) {
  const key = rosterKeyFor(scheduleName);
  return ROSTER.find((c) =>
    String(c.team).split("/").some((part) => normalize(part) === key)
  );
}

function coachFor(scheduleName) {
  return rosterEntryFor(scheduleName)?.name || "";
}

// Falls back to gold for anyone without a color set.
function colorFor(scheduleName) {
  return safeHex(rosterEntryFor(scheduleName)?.color);
}

/* ------------------------------------------------------------
   TEAM MARKS (logo, with monogram fallback)
   ------------------------------------------------------------
   Logos are hotlinked from ESPN's CDN by numeric team id. Two
   things can go wrong and they fail very differently:

     - a MISSING id, or a dead URL, just 404s. The <img> removes
       itself on error and the monogram underneath shows through,
       so the layout never breaks.
     - a WRONG id silently renders another school's logo. Nothing
       errors, so no code can catch it. Open logo-check.html to
       eyeball all 22 at once — that's the only real check.

   Logos sit on a light plate because a good number of college
   marks are black or navy and would vanish on this background.
   ------------------------------------------------------------ */
const ESPN_LOGO = "https://a.espncdn.com/i/teamlogos/ncaa/500/";

// "Ohio State" -> OS, "UCLA" -> UCL, "Cal" -> CAL
function monogramFor(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

/* Two ways a team can have a logo, checked in this order:

     1. a local `logo` path on the roster entry — used by the 1-star
        league, whose teams are Team Builder originals with no
        real-world counterpart to hotlink
     2. an `espnId` — hotlinked from ESPN's CDN

   Local wins when both are set. Either way a failed load removes
   the <img> and the monogram underneath shows through, so a bad
   path degrades exactly like a bad id. */
function logoSrcFor(entry) {
  const local = String(entry?.logo ?? "").trim();
  if (local) return local;

  const id = String(entry?.espnId ?? "").trim();
  const useEspn = INFO.useEspnLogos !== false;
  return useEspn && /^\d+$/.test(id) ? `${ESPN_LOGO}${id}.png` : "";
}

function teamMarkHtml(scheduleName, size = "md") {
  const entry = rosterEntryFor(scheduleName);
  const color = safeHex(entry?.color);
  const src = logoSrcFor(entry);

  return `
    <span class="team-mark tm-${esc(size)}"${color ? ` style="--team:${color}"` : ""}>
      <span class="tm-fallback">${esc(monogramFor(entry?.team || scheduleName))}</span>
      ${
        src
          ? `<img class="tm-img" src="${esc(src)}" alt="" loading="lazy"
                  onerror="this.remove()">`
          : ""
      }
    </span>`;
}

/* ------------------------------------------------------------
   DATA SANITY CHECK
   Surfaces the most common editing mistake — a team name that
   doesn't line up between the two data files.
   ------------------------------------------------------------ */
function validateData() {
  const problems = [];

  SCHEDULES.forEach((t) => {
    if (!isLeagueTeam(t.team)) {
      problems.push(
        `schedule-data.js has "${t.team}" but no coach in league-data.js claims it ` +
        `(add an alias to SCHEDULE_TEAM_ALIASES if the in-game name differs)`
      );
    }
  });

  if (problems.length) console.warn("[data check]\n" + problems.join("\n"));
  return problems;
}

/* ------------------------------------------------------------
   WEEK HELPERS
   ------------------------------------------------------------ */
const isPreseason = () => SEASON.currentWeek === "PRESEASON";

/* Two ways to name a week, used in different places.

   weekNum()   always "Week 14" — for the narrow left-hand column of
               the By Team view, where the descriptive name both
               blew out the column width and duplicated the note
               sitting right beside it.
   weekLabel() the descriptive name, for dropdowns, tags and the
               ticker where there's room and the context helps. */
function weekNum(week) {
  return `Week ${week}`;
}

function weekLabel(week) {
  if (week === 14) return "Army-Navy Week";
  if (week === 15) return "CCG Week";
  return `Week ${week}`;
}

function gameRowKey(week, teamA, teamB) {
  return `${week}|${[teamA, teamB].sort().join("~")}`;
}

/* Resolve a week entry's teamScore/opponentScore (that team's own
   perspective) into absolute homeScore/awayScore based on whether
   that team was "vs" (home) or "at" (away) that week. */
function entryScores(entry) {
  const played = entry.teamScore != null && entry.opponentScore != null;
  if (!played) return { played: false };
  return entry.location === "vs"
    ? { played: true, homeScore: entry.teamScore, awayScore: entry.opponentScore }
    : { played: true, homeScore: entry.opponentScore, awayScore: entry.teamScore };
}

/* Shared by Schedule > Weekly and the Home tab preview.
   Returns deduped { rows, offRows } for a given week number. */
function buildWeekGames(week) {
  const rows = [];
  const offRows = [];
  const seen = new Set();

  SCHEDULES.forEach((team) => {
    const entry = team.weeks.find((w) => w.week === week);
    if (!entry) return;

    if (!entry.opponent) {
      offRows.push({ team: team.team, note: entry.note });
      return;
    }

    // Tagging and deduping are separate questions:
    // "is the opponent a league coach" vs "did they submit a schedule".
    const isLeague = isLeagueTeam(entry.opponent);
    const bothTracked = KNOWN_SCHEDULE_TEAMS.has(entry.opponent);

    if (bothTracked) {
      const key = gameRowKey(week, team.team, entry.opponent);
      if (seen.has(key)) return;
      seen.add(key);
    }

    const home = entry.location === "vs" ? team.team : entry.opponent;
    const away = entry.location === "vs" ? entry.opponent : team.team;

    rows.push({
      home,
      away,
      stadium: entry.stadium,
      league: isLeague,
      ...entryScores(entry),
    });
  });

  // League games first, then alphabetical — the matchups people care
  // about shouldn't be buried among CPU games.
  rows.sort((a, b) => (b.league - a.league) || a.home.localeCompare(b.home));
  return { rows, offRows };
}

/* ------------------------------------------------------------
   HOME TAB
   ------------------------------------------------------------ */
function renderLaunchStatus() {
  const el = document.getElementById("launch-status");
  if (el) el.textContent = SEASON.statusLine || "";
}

/* Advance deadline. Hidden entirely when nextAdvance is blank or
   missing, so an empty value degrades quietly instead of showing
   a dangling label. */
function renderNextAdvance() {
  const el = document.getElementById("next-advance");
  if (!el) return;

  const when = String(SEASON.nextAdvance ?? "").trim();
  if (!when) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.innerHTML =
    `<span class="advance-label">NEXT ADVANCE</span>` +
    `<span class="advance-when">${esc(when)}</span>`;
}

function renderJumbotron() {
  const frame = document.getElementById("jumbo-frame");
  const sub = document.getElementById("week-summary");
  if (!frame || !sub) return;

  if (isPreseason()) {
    frame.innerHTML = `
      <span class="jumbo-label">CURRENT STATUS</span>
      <span class="jumbo-preseason">PRESEASON</span>`;
    sub.textContent = "Kickoff starts once Week 0 goes live";
    return;
  }

  const week = SEASON.currentWeek;
  const { rows } = buildWeekGames(week);
  const leagueRows = rows.filter((g) => g.league);
  const played = rows.filter((g) => g.played).length;
  const upcoming = rows.length - played;

  frame.innerHTML = `
    <span class="jumbo-label">CURRENT</span>
    <span class="jumbo-word">WEEK</span>
    <span class="jumbo-number">${esc(week)}</span>`;

  sub.textContent =
    rows.length === 0
      ? "No tracked matchups this week."
      : `${rows.length} tracked game${rows.length === 1 ? "" : "s"} — ` +
        `${leagueRows.length} league, ${played} final, ${upcoming} upcoming`;
}

function gameCardHtml(g, week) {
  const homeWon = g.played && g.homeScore > g.awayScore;
  const awayWon = g.played && g.awayScore > g.homeScore;

  return `
    <article class="game-card${g.league ? " is-league" : ""}${g.played ? " is-final" : ""}">
      <div class="matchup">
        <span class="team away${awayWon ? " won" : g.played ? " lost" : ""}">${esc(g.away)}</span>
        <span class="at">@</span>
        <span class="team home${homeWon ? " won" : g.played ? " lost" : ""}">${esc(g.home)}</span>
      </div>
      ${
        g.played
          ? `<div class="score">
               <span class="s${awayWon ? " won" : " lost"}">${esc(g.awayScore)}</span>
               <span class="dash">&ndash;</span>
               <span class="s${homeWon ? " won" : " lost"}">${esc(g.homeScore)}</span>
             </div>`
          : ""
      }
      <div class="status">
        <span>${g.played ? "Final" : esc(weekLabel(week))}</span>
        ${g.league ? '<span class="wg-league-tag">League</span>' : ""}
      </div>
    </article>`;
}

function renderThisWeekGames() {
  const container = document.getElementById("this-week-games");
  const tag = document.getElementById("this-week-tag");
  if (!container || !tag) return;

  if (isPreseason()) {
    tag.textContent = "PRESEASON";
    container.innerHTML =
      '<p class="sched-empty">Matchups will show up here once Week 0 kicks off.</p>';
    return;
  }

  const week = SEASON.currentWeek;
  const { rows } = buildWeekGames(week);
  tag.textContent = weekLabel(week).toUpperCase();

  container.innerHTML = rows.length
    ? `<div class="game-grid">${rows.map((g) => gameCardHtml(g, week)).join("")}</div>`
    : '<p class="sched-empty">No tracked matchups this week.</p>';
}

function renderRecentResults() {
  const container = document.getElementById("recent-results");
  if (!container) return;

  if (isPreseason()) {
    container.innerHTML =
      '<li class="sched-empty">No results yet — season hasn\'t started.</li>';
    return;
  }

  // <= currentWeek, not <. Games finished during the week you're
  // currently on are still results, and shouldn't stay hidden until
  // you bump the week over.
  const results = [];
  for (let w = 0; w <= SEASON.currentWeek; w++) {
    buildWeekGames(w).rows.forEach((g) => {
      if (g.played) results.push({ ...g, week: w });
    });
  }

  // Most recent first, league games surfaced above CPU games.
  results.sort((a, b) => (b.week - a.week) || (b.league - a.league));

  const top5 = results.slice(0, 5);
  container.innerHTML = top5.length
    ? top5
        .map((g) => {
          const awayWon = g.awayScore > g.homeScore;
          return `
      <li>
        <span class="week-chip">WK ${esc(g.week)}</span>
        <span class="r-line">
          <span class="r-team${awayWon ? " won" : ""}">${esc(g.away)}</span>
          <span class="r-score${awayWon ? " won" : ""}">${esc(g.awayScore)}</span>
          <span class="r-at">&#64;</span>
          <span class="r-team${!awayWon ? " won" : ""}">${esc(g.home)}</span>
          <span class="r-score${!awayWon ? " won" : ""}">${esc(g.homeScore)}</span>
          ${g.league ? '<span class="wg-league-tag">League</span>' : ""}
        </span>
      </li>`;
        })
        .join("")
    : '<li class="sched-empty">No results yet.</li>';
}

/* ------------------------------------------------------------
   RANKINGS
   ------------------------------------------------------------ */
const pollWeeks = () =>
  [...new Set(POLL.map((r) => Number(r.week)))].sort((a, b) => a - b);

const latestPollWeek = () => pollWeeks()[pollWeeks().length - 1] ?? null;

function trendFor(team, week) {
  const weeks = pollWeeks();
  const idx = weeks.indexOf(Number(week));
  if (idx <= 0) return { symbol: "&ndash;", cls: "same", label: "no change" };

  const prev = POLL.find((r) => r.team === team && Number(r.week) === weeks[idx - 1]);
  const curr = POLL.find((r) => r.team === team && Number(r.week) === Number(week));
  if (!prev || !curr) return { symbol: "&#9733;", cls: "same", label: "new to poll" };

  const diff = Number(prev.rank) - Number(curr.rank);
  if (diff > 0) return { symbol: `&#9650;${diff}`, cls: "up", label: `up ${diff}` };
  if (diff < 0) return { symbol: `&#9660;${Math.abs(diff)}`, cls: "down", label: `down ${Math.abs(diff)}` };
  return { symbol: "&ndash;", cls: "same", label: "no change" };
}

/* The rank number is drawn by a CSS counter on the <li>, so this
   returns exactly 3 children to fill the remaining 3 grid columns.
   Adding an element here means adding a column in style.css. */
function rankingRowHtml(r, week) {
  const trend = trendFor(r.team, week);
  return `
    <li>
      <span class="p-main">
        ${teamMarkHtml(r.team, "sm")}
        <span class="p-text">
          <span class="p-team">${esc(r.team)}</span>
          <span class="p-coach">${esc(coachFor(r.team))}</span>
        </span>
      </span>
      <span class="p-record">${esc(r.record || "")}</span>
      <span class="p-trend ${trend.cls}" title="${esc(trend.label)}">${trend.symbol}</span>
    </li>`;
}

const RANKINGS_EMPTY_MSG =
  '<li class="poll-empty-msg">No power rankings yet — check back once there are enough league (coach vs. coach) games on the board.</li>';

function renderRankings() {
  const fullList = document.getElementById("full-rankings");
  const previewList = document.getElementById("rankings-preview");
  const label = document.getElementById("rankings-week-label");

  if (!POLL.length) {
    if (label) label.textContent = "NOT ENOUGH GAMES YET";
    [fullList, previewList].forEach((el) => {
      if (!el) return;
      el.classList.add("is-empty");
      el.innerHTML = RANKINGS_EMPTY_MSG;
    });
    return;
  }

  const week = latestPollWeek();
  const rows = POLL.filter((r) => Number(r.week) === week)
    .sort((a, b) => Number(a.rank) - Number(b.rank));

  if (label) label.textContent = `WEEK ${week} POLL`;
  if (fullList) {
    fullList.classList.remove("is-empty");
    fullList.innerHTML = rows.map((r) => rankingRowHtml(r, week)).join("");
  }
  if (previewList) {
    previewList.classList.remove("is-empty");
    previewList.innerHTML = rows.slice(0, 5).map((r) => rankingRowHtml(r, week)).join("");
  }
}

/* ------------------------------------------------------------
   ROSTER
   ------------------------------------------------------------ */
function renderRoster() {
  const grid = document.getElementById("roster-grid");
  if (!grid) return;

  const sorted = [...ROSTER].sort((a, b) => a.team.localeCompare(b.team));

  grid.innerHTML = sorted
    .map((c) => {
      const url = safeUrl(c.twitch);
      const color = safeHex(c.color);
      return `
      <article class="roster-card"${color ? ` style="--team:${color}"` : ""}>
        ${teamMarkHtml(c.team, "lg")}
        <div class="r-team">${esc(c.team)}</div>
        <div class="r-coach">${esc(c.name)}</div>
        ${/* Conference sits in a quiet meta line rather than
             competing with the logo up top. */ ""}
        <div class="r-meta">
          ${c.conference ? `<span class="r-conf">${esc(c.conference)}</span>` : ""}
        </div>
        ${
          url
            ? `<a class="twitch-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Watch on Twitch &rarr;</a>`
            /* No placeholder while links are still coming in — a card
               with no twitch value simply ends here. To bring the
               placeholder back, swap in:
               `<span class="no-stream">No stream linked</span>`
               (the .no-stream style is still in style.css). */
            : ""
        }
      </article>`;
    })
    .join("");
}

/* ------------------------------------------------------------
   SCHEDULE TAB — Weekly / By Team
   ------------------------------------------------------------ */
function setupScheduleToggle() {
  document.querySelectorAll(".sched-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.schedView;
      document.querySelectorAll(".sched-toggle-btn")
        .forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".sched-view")
        .forEach((v) => v.classList.toggle("active", v.id === `sched-${target}`));
    });
  });
}

function populateWeekSelect() {
  const sel = document.getElementById("week-select");
  if (!sel) return;

  sel.innerHTML = Array.from(
    { length: 16 },
    (_, w) => `<option value="${w}">${esc(weekLabel(w))}</option>`
  ).join("");

  // Open on the week the league is actually playing, not a fixed week 1.
  sel.value = String(isPreseason() ? 0 : SEASON.currentWeek);
  sel.addEventListener("change", renderWeeklyGames);
}

function populateTeamSelect() {
  const sel = document.getElementById("team-select");
  if (!sel) return;
  const sorted = [...SCHEDULES].sort((a, b) => a.team.localeCompare(b.team));
  sel.innerHTML = sorted
    .map((t) => `<option value="${esc(t.team)}">${esc(t.team)}</option>`)
    .join("");
  sel.addEventListener("change", renderTeamSchedule);
}

function renderWeeklyGames() {
  const container = document.getElementById("weekly-games");
  const weekSel = document.getElementById("week-select");
  if (!container || !weekSel) return;

  const week = Number(weekSel.value);
  const { rows, offRows } = buildWeekGames(week);

  const gamesHtml =
    rows
      .map((g) => {
        const awayWon = g.played && g.awayScore > g.homeScore;
        const homeWon = g.played && g.homeScore > g.awayScore;
        return `
    <div class="week-game-row ${g.league ? "is-league" : ""}">
      <div class="wg-teams">
        <span class="wg-team${awayWon ? " won" : g.played ? " lost" : ""}">${esc(g.away)}</span>
        ${g.played ? `<span class="wg-score${awayWon ? " won" : " lost"}">${esc(g.awayScore)}</span>` : ""}
        <span class="wg-at">&#64;</span>
        <span class="wg-team${homeWon ? " won" : g.played ? " lost" : ""}">${esc(g.home)}</span>
        ${g.played ? `<span class="wg-score${homeWon ? " won" : " lost"}">${esc(g.homeScore)}</span>` : ""}
      </div>
      <div class="wg-meta">
        ${g.played ? '<span class="wg-final-tag">Final</span>' : ""}
        ${g.league ? '<span class="wg-league-tag">League Game</span>' : ""}
        <span class="wg-stadium">${esc(g.stadium || "")}</span>
      </div>
    </div>`;
      })
      .join("") || '<p class="sched-empty">No games recorded for this week yet.</p>';

  const offHtml = offRows.length
    ? `
    <div class="sched-off-block">
      <span class="sched-off-label">Off this week</span>
      <div class="sched-off-list">
        ${offRows
          .map((o) => `<span class="sched-off-chip">${esc(o.team)} <i>${esc(o.note)}</i></span>`)
          .join("")}
      </div>
    </div>`
    : "";

  container.innerHTML = gamesHtml + offHtml;
}

function renderTeamSchedule() {
  const container = document.getElementById("team-schedule");
  const teamSel = document.getElementById("team-select");
  if (!container || !teamSel) return;

  const team = SCHEDULES.find((t) => t.team === teamSel.value);
  if (!team) {
    container.innerHTML = '<p class="sched-empty">Schedule not yet available for this team.</p>';
    return;
  }

  const coach = coachFor(team.team);
  let wins = 0;
  let losses = 0;

  const rowsHtml = team.weeks
    .map((w) => {
      if (!w.opponent) {
        return `
        <div class="team-sched-row is-note">
          <span class="tsr-week">${esc(weekNum(w.week))}</span>
          <span class="tsr-note">${esc(w.note)}</span>
        </div>`;
      }

      const isLeague = isLeagueTeam(w.opponent);
      const oppCoach = isLeague ? coachFor(w.opponent) : "";
      const played = w.teamScore != null && w.opponentScore != null;

      let resultCls = "";
      if (played) {
        if (w.teamScore > w.opponentScore) { resultCls = "win"; wins++; }
        else if (w.teamScore < w.opponentScore) { resultCls = "loss"; losses++; }
        else resultCls = "tie";
      }

      const isCurrent = !isPreseason() && w.week === SEASON.currentWeek;

      return `
        <div class="team-sched-row${isCurrent ? " is-current" : ""}">
          <span class="tsr-week">${esc(weekNum(w.week))}</span>
          <span class="tsr-loc">${w.location === "vs" ? "VS" : "AT"}</span>
          <span class="tsr-opp">
            <span class="tsr-opp-name">${esc(w.opponent)}</span>
            ${
              isLeague
                ? `<span class="wg-league-tag">League${
                    oppCoach
                      /* Coach name is split out so narrow screens can drop
                         just that part and keep the League tag itself. */
                      ? `<span class="lt-coach"> &middot; ${esc(oppCoach)}</span>`
                      : ""
                  }</span>`
                : ""
            }
          </span>
          <span class="tsr-stadium">${esc(w.stadium || "")}</span>
          ${
            played
              ? `<span class="tsr-score ${resultCls}">${esc(w.teamScore)}&ndash;${esc(w.opponentScore)}</span>`
              : `<span class="tsr-score pending">&mdash;</span>`
          }
        </div>`;
    })
    .join("");

  const recordText = wins + losses > 0 ? `${wins}-${losses}` : "";

  const teamColor = colorFor(team.team);

  container.innerHTML = `
    ${/* Grouped into mark / text / record so the header can reflow to a
         two-line stack on narrow screens instead of wrapping raggedly.
         Only the selected team gets a mark — opponents stay text, since
         covering every CPU school would mean sourcing 90+ logos
         including EA's fictional FCS teams. */ ""}
    <div class="team-sched-head"${teamColor ? ` style="--team:${teamColor}"` : ""}>
      ${teamMarkHtml(team.team, "xl")}
      <div class="tsh-text">
        <span class="team-sched-name">${esc(team.team)}</span>
        <span class="tsh-meta">
          <span class="team-sched-conf">${esc(team.conference)}</span>
          ${coach ? `<span class="team-sched-coach">${esc(coach)}</span>` : ""}
        </span>
      </div>
      ${recordText ? `<span class="team-sched-record">${esc(recordText)}</span>` : ""}
    </div>
    <div class="team-sched-rows">${rowsHtml}</div>`;
}

function initSchedule() {
  /* A league with no schedule at all is a different situation from a
     week with no games in it. Without this, both the Weekly and By
     Team views would render an empty dropdown next to a vague "no
     games" line, which reads like a bug rather than "we haven't
     transcribed the screenshots yet". */
  if (!SCHEDULES.length) {
    const panel = document.getElementById("schedule");
    if (panel) {
      const toggle = panel.querySelector(".sched-toggle");
      const weekly = document.getElementById("sched-weekly");
      const byTeam = document.getElementById("sched-team");
      if (toggle) toggle.hidden = true;
      if (byTeam) byTeam.hidden = true;
      if (weekly) {
        weekly.innerHTML =
          '<p class="sched-empty">No schedule posted yet. Once coaches share their ' +
          'in-game schedule screenshots, every week and matchup shows up here.</p>';
      }
    }
    return;
  }

  setupScheduleToggle();
  populateWeekSelect();
  populateTeamSelect();
  renderWeeklyGames();
  renderTeamSchedule();
}

/* ------------------------------------------------------------
   TICKER — live content, not decoration
   Builds its segments from the data files so it always says
   something true. Preseason it chases missing schedules; in
   season it carries the latest finals and what's up next.
   The list is emitted twice because the scroll animation
   translates by -50% for a seamless loop.
   ------------------------------------------------------------ */
function tickerSegments() {
  const segs = [`${INFO.name} · ${INFO.tag}`.toUpperCase()];

  if (isPreseason()) {
    const missing = ROSTER.filter(
      (c) => !SCHEDULES.some((t) => rosterKeyFor(t.team) === rosterKeyFor(c.team))
    );

    segs.push(`${SCHEDULES.length} of ${ROSTER.length} schedules in`.toUpperCase());

    if (missing.length) {
      segs.push(`Still needed: ${missing.map((c) => c.team).join(", ")}`.toUpperCase());
    } else {
      segs.push("ALL SCHEDULES IN — READY FOR WEEK 0");
    }
    segs.push(`${ROSTER.length} coaches signed up`.toUpperCase());
    return segs;
  }

  const week = SEASON.currentWeek;
  segs.push(weekLabel(week).toUpperCase());

  // Latest finals, league games first.
  const finals = [];
  for (let w = 0; w <= week; w++) {
    buildWeekGames(w).rows.forEach((g) => { if (g.played) finals.push({ ...g, week: w }); });
  }
  finals.sort((a, b) => (b.week - a.week) || (b.league - a.league));
  finals.slice(0, 4).forEach((g) => {
    const awayWon = g.awayScore > g.homeScore;
    const [wT, wS, lT, lS] = awayWon
      ? [g.away, g.awayScore, g.home, g.homeScore]
      : [g.home, g.homeScore, g.away, g.awayScore];
    segs.push(`${wT} ${wS}, ${lT} ${lS}`.toUpperCase());
  });

  // Still to play this week, league games only.
  const upcoming = buildWeekGames(week).rows.filter((g) => !g.played && g.league);
  upcoming.slice(0, 3).forEach((g) => {
    segs.push(`Up next: ${g.away} at ${g.home}`.toUpperCase());
  });

  if (finals.length === 0 && upcoming.length === 0) {
    segs.push("NO TRACKED GAMES THIS WEEK");
  }
  return segs;
}

/* The loop animates the track by -50%, so the track must be exactly
   two identical halves and each half must be at least as wide as the
   viewport — otherwise the content runs out mid-scroll and you see a
   gap before it wraps. Short segment lists get repeated until one
   half fills the screen. */
function renderTicker() {
  const track = document.getElementById("ticker-track");
  if (!track) return;

  const segs = tickerSegments();
  if (!segs.length) return;

  // The league name leads every repetition and is the only gold
  // segment. Keyed by class, not :first-child, or the gold would
  // appear once across the whole track and visibly jump on wrap.
  const oneCopy = segs
    .map((s, i) => `<span${i === 0 ? ' class="ts-lead"' : ""}>${esc(s)}</span>`)
    .join("");

  track.innerHTML = oneCopy;

  const viewport = track.parentElement?.clientWidth || 0;
  let half = oneCopy;
  let guard = 0;
  // Grow one half until it covers the viewport (cap the loop so a
  // zero-width measurement can't spin forever).
  while (track.scrollWidth < viewport && guard < 12) {
    half += oneCopy;
    track.innerHTML = half;
    guard++;
  }

  const halfWidth = track.scrollWidth;
  track.innerHTML = half + half; // two identical halves -> seamless -50%

  // Constant speed regardless of how much content there is.
  const PX_PER_SEC = 55;
  track.style.animationDuration = `${Math.max(12, halfWidth / PX_PER_SEC)}s`;
}

/* ------------------------------------------------------------
   FOOTER — live status bar
   Every segment is computed from the data files, so it stays
   accurate on its own as schedules come in and weeks advance.
   ------------------------------------------------------------ */
function renderFooter() {
  const statusEl = document.getElementById("footer-status");
  const linksEl = document.getElementById("footer-links");

  if (statusEl) {
    const covered = SCHEDULES.length;
    const total = ROSTER.length;
    const coverage =
      total > 0 && covered >= total
        ? `ALL ${total} SCHEDULES IN`
        : `${covered}/${total} SCHEDULES IN`;

    const phase = isPreseason()
      ? "PRESEASON"
      : weekLabel(SEASON.currentWeek).toUpperCase();

    statusEl.innerHTML = [INFO.name.toUpperCase(), coverage, phase]
      .map((seg) => `<span class="fs-seg">${esc(seg)}</span>`)
      .join('<span class="fs-sep">&middot;</span>');
  }

  if (linksEl) {
    // Only links with a real URL render — empty slots stay invisible.
    const links = (INFO.links || {});
    const items = [
      { label: "Discord", url: safeUrl(links.discord) },
      { label: "Rules", url: safeUrl(links.rules) },
    ].filter((l) => l.url);

    linksEl.innerHTML = items
      .map(
        (l) =>
          `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`
      )
      .join('<span class="fs-sep">&middot;</span>');
  }
}

/* ------------------------------------------------------------
   TABS
   Tab state lives in the URL hash, so a refresh keeps your place
   and you can drop someone straight into #rankings in Discord.
   ------------------------------------------------------------ */
const TABS = ["home", "schedule", "rankings", "roster"];

function showTab(name, { scroll = true } = {}) {
  const target = TABS.includes(name) ? name : "home";

  document.querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.toggle("active", p.id === target));

  document.querySelectorAll(".tab-btn").forEach((b) => {
    const on = b.dataset.tab === target;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      if (location.hash.slice(1) === target) showTab(target);
      else location.hash = target; // hashchange listener finishes the job
    });
  });

  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1), { scroll: false });
}

/* ------------------------------------------------------------
   LEAGUE SWITCHER
   ------------------------------------------------------------
   The header badge opens into the other dynasties. Built from
   SITE_LEAGUES in people.js so adding a league doesn't mean editing
   three near-identical index.html files.

   Which league we're on comes from <body data-league>, the same
   attribute that drives the accent palette — one source of truth
   rather than parsing the URL, which would break on local preview
   and on any future custom domain.

   <details> handles open/close and keyboard access for free. The
   only things it doesn't do are close on outside click and close on
   Escape, both added below.
   ------------------------------------------------------------ */
function renderLeagueSwitch() {
  const wrap = document.getElementById("league-switch");
  const menu = document.getElementById("league-menu");
  const leagues = typeof SITE_LEAGUES !== "undefined" ? SITE_LEAGUES : [];

  // Degrade to a plain, non-interactive badge if anything's missing.
  if (!wrap || !menu || leagues.length < 2) {
    if (wrap) wrap.classList.add("no-switch");
    return;
  }

  const current = document.body.dataset.league || "";

  menu.innerHTML = leagues
    .map((l) => {
      const here = l.dir === current;
      return `
        <a class="league-menu-item${here ? " is-current" : ""}"
           href="../${esc(l.dir)}/"
           style="--team:${esc(l.accent)}"
           ${here ? 'aria-current="page"' : ""}>
          <span class="lm-dot"></span>
          <span class="lm-label">${esc(l.label)}</span>
          ${here ? '<span class="lm-here">You are here</span>' : ""}
        </a>`;
    })
    .join("");

  document.addEventListener("click", (e) => {
    if (wrap.open && !wrap.contains(e.target)) wrap.open = false;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap.open) {
      wrap.open = false;
      wrap.querySelector("summary")?.focus();
    }
  });
}

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
function init() {
  /* Everything league-specific in the page shell is filled from
     LEAGUE_INFO, so the three index.html files stay byte-identical
     apart from their <meta> tags — which have to be static because
     crawlers and link-preview bots don't run JavaScript. */
  const nameEl = document.getElementById("league-name");
  if (nameEl) nameEl.textContent = INFO.name.toUpperCase();

  const badgeEl = document.getElementById("league-badge");
  if (badgeEl) badgeEl.textContent = (INFO.tag || "").toUpperCase();

  renderLeagueSwitch();

  const heroSubEl = document.getElementById("hero-sub");
  if (heroSubEl) heroSubEl.textContent = (INFO.tag || "").toUpperCase();

  document.title = INFO.tag ? `${INFO.name} — ${INFO.tag}` : INFO.name;

  validateData();

  renderLaunchStatus();
  renderJumbotron();
  renderNextAdvance();
  renderThisWeekGames();
  renderRecentResults();
  renderRankings();
  renderRoster();
  initSchedule();
  renderTicker();
  renderFooter();
  setupTabs();
}

init();
