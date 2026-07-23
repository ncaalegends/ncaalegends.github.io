/* ============================================================
   COMMISSIONER TOOLS — page logic
   ------------------------------------------------------------
   Three jobs:
     1. exchange an access code for a name and a league list
     2. render the week's games from the league's own data files
     3. hand a submission to the Worker

   It never decides anything. Which games exist comes from
   week-core.js (the same code the CLI tools use); whether a
   submission is allowed comes from the Worker; whether it's valid
   comes from tools/apply.js. This file's checks exist to catch
   mistakes early and give a useful message, not to be the last
   line of defence.
   ============================================================ */

/* ------------------------------------------------------------
   CONFIG
   ------------------------------------------------------------
   The Worker's URL. Deploy steps are in worker/ADMIN-SETUP.md.
   Leave it blank and the page will say so instead of failing with
   a network error nobody can interpret.
   ------------------------------------------------------------ */
const ADMIN_API = "https://ncaa-legends-admin.westfall-105.workers.dev/";

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------
   The access code is held in a variable and nowhere else — not in
   localStorage, not in sessionStorage, not in the URL. That means
   a refresh asks for it again, which is mildly annoying and the
   right trade: these get used on phones that get handed around,
   and a code sitting in browser storage outlives any intent to
   share it. Signing out or closing the tab genuinely ends it.
   ------------------------------------------------------------ */
let accessCode = "";
let me = null; // { name, leagues: [] }
let data = null; // loaded league + schedule data for the current league
let games = []; // scoreableGames() for the selected week
let unlocked = new Set(); // indexes of already-final games the user chose to edit

const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function message(el, kind, text) {
  if (!text) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `<div class="msg msg-${kind}">${esc(text)}</div>`;
}

/* Bring a status message into view. The games list can be long
   enough that a message above the Save button is off screen on a
   phone, which is half of why a successful save felt like nothing
   had happened. Guarded — losing the scroll is survivable, throwing
   inside a click handler isn't. */
function scrollToMessage(el) {
  if (typeof el.scrollIntoView !== "function") return;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (e) {
    el.scrollIntoView();
  }
}

/* Week 14 and 15 carry names on the site; matching them here means
   the dropdown reads the way the schedule does. */
function weekOptionLabel(w) {
  if (w === 14) return "Week 14 — Army-Navy";
  if (w === 15) return "Week 15 — Championships";
  return `Week ${w}`;
}

/* ------------------------------------------------------------
   API
   ------------------------------------------------------------ */
async function api(route, body) {
  if (!ADMIN_API) {
    throw new Error(
      "This page isn't connected to its server yet. The ADMIN_API setting in admin/admin.js is blank — see worker/ADMIN-SETUP.md."
    );
  }

  let res;
  try {
    res = await fetch(`${ADMIN_API.replace(/\/+$/, "")}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    /* Non-JSON reply means something upstream broke, not the app. */
    throw new Error(`Server returned an unexpected response (${res.status}).`);
  }

  if (!res.ok) throw new Error(json.error || `Something went wrong (${res.status}).`);
  return json;
}

/* ------------------------------------------------------------
   LEAGUE DATA
   ------------------------------------------------------------
   Same trick the landing page uses: the data files are plain
   top-level `const` declarations meant for a <script> tag, so
   fetching the text and running it inside a Function body gives
   each league its own scope. That's what makes it safe to switch
   leagues without the constants colliding.
   ------------------------------------------------------------ */
async function fetchText(url, bust) {
  /* When polling for a change we've just made, the browser cache and
     the Pages CDN will both happily hand back the old file. A unique
     query string makes it a URL neither has seen, which is the only
     reliable way to know we're looking at what's actually published
     rather than what was published a minute ago. */
  const full = bust ? `${url}?_=${Date.now()}` : url;
  const res = await fetch(full, { cache: bust ? "no-store" : "no-cache" });
  if (!res.ok) throw new Error(`Couldn't load ${url} (HTTP ${res.status})`);
  return res.text();
}

async function loadLeagueData(slug, bust) {
  const [leagueSrc, scheduleSrc] = await Promise.all([
    fetchText(`../${slug}/league-data.js`, bust),
    fetchText(`../${slug}/schedule-data.js`, bust),
  ]);

  /* Not every league defines an alias table, so each global is
     probed rather than assumed — a missing one is a legitimate
     state, not an error. */
  return new Function(`
    ${leagueSrc}
    ${scheduleSrc}
    return {
      SEASON:         typeof SEASON !== "undefined" ? SEASON : {},
      COACHES:        typeof COACHES !== "undefined" ? COACHES : [],
      LEAGUE_INFO:    typeof LEAGUE_INFO !== "undefined" ? LEAGUE_INFO : {},
      TEAM_SCHEDULES: typeof TEAM_SCHEDULES !== "undefined" ? TEAM_SCHEDULES : [],
      ALIASES:        typeof SCHEDULE_TEAM_ALIASES !== "undefined" ? SCHEDULE_TEAM_ALIASES : {}
    };
  `)();
}

/* ------------------------------------------------------------
   SIGN IN
   ------------------------------------------------------------ */
$("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("signin-btn");
  const code = $("code-input").value.trim();
  if (!code) return;

  btn.disabled = true;
  message($("signin-msg"), "warn", "Checking…");

  try {
    const who = await api("/whoami", { code });
    accessCode = code;
    me = who;

    $("code-input").value = "";
    message($("signin-msg"), "");
    $("signin-panel").classList.add("hidden");
    $("workspace").classList.remove("hidden");
    $("who-name").textContent = who.name;

    const sel = $("league-select");
    sel.innerHTML = who.leagues
      .map((l) => `<option value="${esc(l)}">${esc(leagueLabel(l))}</option>`)
      .join("");

    await switchLeague(who.leagues[0]);
  } catch (err) {
    message($("signin-msg"), "error", err.message);
  } finally {
    btn.disabled = false;
  }
});

function leagueLabel(slug) {
  const found = (typeof SITE_LEAGUES !== "undefined" ? SITE_LEAGUES : []).find(
    (l) => l.dir === slug
  );
  return found ? found.label : slug;
}

$("signout-btn").addEventListener("click", () => {
  accessCode = "";
  me = null;
  data = null;
  games = [];
  unlocked.clear();
  $("workspace").classList.add("hidden");
  $("signin-panel").classList.remove("hidden");
  message($("signin-msg"), "");
  message($("scores-msg"), "");
  message($("advance-msg"), "");
});

/* ------------------------------------------------------------
   LEAGUE + WEEK SELECTION
   ------------------------------------------------------------ */
/* Leagues that can be advanced from the web. Main is scoreable but
   not advanceable here — advancing it locally also posts the Discord
   week announcement, which this path can't do. Mirrors ADVANCE_LEAGUES
   in the Worker and tools/apply.js; a submission would be refused
   there regardless, but hiding the panel means nobody's offered a
   button that can only fail. */
const ADVANCE_LEAGUES = ["1star", "3star"];

async function switchLeague(slug) {
  /* Drives the accent colour, exactly as on the league pages. */
  document.body.setAttribute("data-league", slug);

  message($("scores-msg"), "warn", "Loading…");
  try {
    data = await loadLeagueData(slug);
  } catch (err) {
    message($("scores-msg"), "error", err.message);
    return;
  }
  message($("scores-msg"), "");

  /* Show or hide the whole Advance panel for this league. Done here
     rather than in refreshWeekControls so it only re-evaluates on an
     actual league change, not on every re-render. */
  const canAdvance = ADVANCE_LEAGUES.includes(slug);
  $("advance-panel").classList.toggle("hidden", !canAdvance);
  /* Clear any lingering confirm state when moving to a league that
     can't advance, so switching back doesn't reveal a half-open
     confirmation. */
  if (!canAdvance) {
    $("advance-confirm").classList.add("hidden");
    $("advance-form").classList.remove("hidden");
    message($("advance-msg"), "");
  }

  refreshWeekControls();
}

/* Rebuild everything driven by SEASON: both week dropdowns, the
   deadline field and the status line. Split out of switchLeague so a
   confirmed advance can refresh the page from the published file
   without re-fetching or resetting the league. */
function refreshWeekControls() {
  const current = Number(data.SEASON.currentWeek) || 0;

  const opts = [];
  for (let w = 0; w <= 15; w++) {
    opts.push(`<option value="${w}">${esc(weekOptionLabel(w))}</option>`);
  }
  $("week-select").innerHTML = opts.join("");
  $("week-select").value = String(current);

  $("advance-week").innerHTML = opts.join("");
  $("advance-week").value = String(Math.min(current + 1, 15));

  $("advance-next").value = data.SEASON.nextAdvance || "";

  $("current-week").textContent =
    `Currently on ${weekOptionLabel(current).toUpperCase()}` +
    (data.SEASON.nextAdvance ? ` · next deadline ${data.SEASON.nextAdvance}` : "");

  renderGames();
}

$("league-select").addEventListener("change", (e) => switchLeague(e.target.value));
$("week-select").addEventListener("change", () => renderGames());

/* ------------------------------------------------------------
   RENDER THE WEEK
   ------------------------------------------------------------ */
function renderGames() {
  unlocked.clear();
  const week = Number($("week-select").value);
  const wk = WeekCore.buildWeek(data, week);
  games = WeekCore.scoreableGames(wk);

  const host = $("games");

  /* Before the early return below — a week where everyone is on a
     bye is exactly when you most want to be told that week 4 is
     still sitting there unscored. */
  renderGaps();

  if (!games.length) {
    const why = wk.notes.length
      ? "Everyone is on a bye or off week."
      : "No games are listed for this week.";
    host.innerHTML = `<p class="note-line">${esc(why)}</p>`;
    updateCount();
    return;
  }

  host.innerHTML = games.map((g, i) => gameHtml(g, i)).join("");

  /* Byes and notes are shown but not scoreable — seeing them
     confirms the week loaded correctly rather than leaving a coach
     wondering why their team is missing. */
  if (wk.notes.length) {
    host.insertAdjacentHTML(
      "beforeend",
      `<p class="note-line" style="margin-top:14px;">` +
        wk.notes.map((n) => `${esc(n.team)} &mdash; ${esc(n.note)}`).join("<br>") +
        `</p>`
    );
  }

  host.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-edit"));
      if (!confirm(`Replace the recorded result for ${games[i].label}?`)) return;
      unlocked.add(i);
      const row = host.querySelector(`[data-game="${i}"]`);
      row.classList.remove("is-final");
      row.querySelector(".final-line").remove();
      row.insertAdjacentHTML("beforeend", scoreInputsHtml(games[i], i, games[i].scoredPair));
      wireInputs(row);
    });
  });

  wireInputs(host);
  updateCount();
}

/* ------------------------------------------------------------
   UNSCORED EARLIER WEEKS
   ------------------------------------------------------------
   Advancing doesn't require scores, and shouldn't — games get
   simmed and the result isn't known until after the week has
   moved on. But the week dropdown defaults to whatever week the
   league is currently on, so a week left unscored is easy to
   never look at again.

   This scans the weeks the league has already moved PAST and
   offers a jump to any that still have gaps. Weeks from
   currentWeek onward are deliberately excluded: those are in
   progress or haven't happened, so missing scores there are the
   normal state, not something to chase.
   ------------------------------------------------------------ */
function findGaps() {
  const current = Number(data.SEASON.currentWeek) || 0;
  const viewing = Number($("week-select").value);
  const out = [];

  for (let w = 0; w < current; w++) {
    /* Skip the week already on screen — its gaps are visible. */
    if (w === viewing) continue;

    /* A bye week produces no scoreable games at all, so it can
       never register as a gap. That falls out of the same
       buildWeek() the tools use rather than needing a special
       case here. */
    const list = WeekCore.scoreableGames(WeekCore.buildWeek(data, w));
    const missing = list.filter((g) => !g.scored).length;
    if (missing) out.push({ week: w, missing });
  }

  return out;
}

function renderGaps() {
  const host = $("gaps");
  const gaps = findGaps();

  if (!gaps.length) {
    host.innerHTML = "";
    return;
  }

  const chips = gaps
    .map(
      (g) =>
        `<button type="button" class="gap-jump" data-jump="${g.week}">` +
        `${esc(weekOptionLabel(g.week))} &middot; ${g.missing} game${g.missing === 1 ? "" : "s"}` +
        `</button>`
    )
    .join("");

  host.innerHTML =
    `<div class="gaps">` +
    `<span class="gaps-label">Earlier weeks still missing scores &mdash; open one to fill it in:</span>` +
    chips +
    `</div>`;

  host.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("week-select").value = btn.getAttribute("data-jump");
      renderGames();
      /* The games list is below the fold on a phone once a few
         chips are stacked up. Guarded because this runs after the
         re-render — anywhere scrollIntoView is missing or refuses
         the options object, the jump has already worked and the
         scroll is the only thing worth losing. */
      const list = $("games");
      if (typeof list.scrollIntoView === "function") {
        try {
          list.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (e) {
          list.scrollIntoView();
        }
      }
    });
  });
}

function gameHtml(g, i) {
  const tag = g.kind === "cpu" ? `<span class="game-tag">CPU</span>` : "";
  const head =
    `<div class="game-label">${esc(g.label)}${tag}</div>` +
    (g.subtitle ? `<div class="game-sub">${esc(g.subtitle)}</div>` : "");

  if (g.scored) {
    const simTag = g.sim ? ` <span class="sim-tag">SIM</span>` : "";
    return (
      `<div class="game is-final" data-game="${i}">${head}` +
      `<div class="final-line">FINAL &nbsp;${esc(g.scored)}${simTag}` +
      `<button type="button" class="lock btn-quiet" data-edit="${i}" ` +
      `style="background:none;border:0;color:var(--steel);text-decoration:underline;cursor:pointer;">Edit</button>` +
      `</div></div>`
    );
  }

  return `<div class="game" data-game="${i}">${head}${scoreInputsHtml(g, i, null)}</div>`;
}

/* Two labelled boxes rather than one "27-24" field. The text form
   is fine at a terminal where the prompt names the team; on a
   phone it's ambiguous which number belongs to whom, and getting
   that backwards is the mistake that's hardest to spot afterwards. */
function scoreInputsHtml(g, i, prefill) {
  const a = prefill ? prefill.team : "";
  const b = prefill ? prefill.opponent : "";

  /* Force-sim / forfeit toggle, H2H games only — a CPU game can't
     be a coach-vs-coach sim and never enters the poll anyway. Off by
     default: the common case is a game both coaches actually played.
     Checking it keeps the result in the records but drops it from the
     power rankings. Pre-checked when re-opening a game already marked
     that way. */
  const simRow =
    g.kind === "h2h"
      ? `<label class="sim-toggle"><input type="checkbox" data-sim="${i}"${
          g.sim ? " checked" : ""
        }> Force sim / forfeit &mdash; counts in the record, excluded from power rankings</label>`
      : "";

  return (
    `<div class="score-row" data-inputs="${i}">` +
    `<span class="score-side">${esc(g.perspective)}</span>` +
    `<input class="score-box" type="number" inputmode="numeric" min="0" max="200" ` +
    `data-side="team" data-i="${i}" value="${esc(a)}" aria-label="${esc(g.perspective)} score">` +
    `<span class="score-dash">&ndash;</span>` +
    `<input class="score-box" type="number" inputmode="numeric" min="0" max="200" ` +
    `data-side="opp" data-i="${i}" value="${esc(b)}" aria-label="${esc(g.other)} score">` +
    `<span class="score-side" style="text-align:right;">${esc(g.other)}</span>` +
    `</div>` +
    simRow
  );
}

function wireInputs(scope) {
  scope.querySelectorAll(".score-box").forEach((el) => {
    el.addEventListener("input", updateCount);
  });
}

/* ------------------------------------------------------------
   COLLECT WHAT'S BEEN TYPED
   ------------------------------------------------------------
   Returns { entries, problems }. A row with one box filled and the
   other empty is a problem, not a silent skip — that's a half-typed
   score, and dropping it quietly is how a result goes missing.
   ------------------------------------------------------------ */
function collect() {
  const entries = [];
  const problems = [];

  games.forEach((g, i) => {
    const row = document.querySelector(`[data-inputs="${i}"]`);
    if (!row) return; // already final and not unlocked

    const a = row.querySelector('[data-side="team"]').value.trim();
    const b = row.querySelector('[data-side="opp"]').value.trim();

    if (a === "" && b === "") return; // not played yet — fine
    if (a === "" || b === "") {
      problems.push(`${g.label} — only one score filled in.`);
      return;
    }

    /* The same parser the CLI uses, so the tie rule and the
       out-of-range rule are identical on both paths. */
    const parsed = WeekCore.parseScore(`${a}-${b}`);
    if (!parsed) {
      problems.push(`${g.label} — "${a}-${b}" isn't a score.`);
      return;
    }
    if (parsed.error) {
      problems.push(`${g.label} — ${parsed.error}.`);
      return;
    }

    const entry = { team: g.perspective, score: `${parsed.team}-${parsed.opponent}` };

    /* Send the sim state explicitly for every H2H game — true when
       checked, false when not — so re-scoring a game that used to be
       a sim clears the flag, and marking one sets it. CPU rows have
       no toggle and send nothing. */
    if (g.kind === "h2h") {
      const simEl = document.querySelector(`[data-sim="${i}"]`);
      entry.sim = !!(simEl && simEl.checked);
    }

    entries.push(entry);
  });

  return { entries, problems };
}

function updateCount() {
  const { entries, problems } = collect();
  const bits = [];
  if (entries.length) bits.push(`${entries.length} game${entries.length === 1 ? "" : "s"} ready`);
  if (problems.length) bits.push(`${problems.length} needs attention`);
  $("scores-count").textContent = bits.join(" · ");
}

/* ------------------------------------------------------------
   CONFIRMING A SUBMISSION ACTUALLY PUBLISHED
   ------------------------------------------------------------
   The Worker replies as soon as GitHub accepts the dispatch, which
   means "queued", not "done". Saying "Saved" at that point is a
   claim we haven't earned — the workflow still has to run, commit,
   and wait for Pages to redeploy, and any of that can fail.

   Worse, nothing on the page changed when a save succeeded: the
   games still showed as empty boxes, so a successful save looked
   exactly like a save that did nothing. That's what the "no
   feedback" report was about.

   So instead of guessing, we watch the published file. It's the
   same static data the public site reads, so if the scores are
   visible there they're visible to everyone — no new endpoint, no
   new state to trust, and the answer is definitive either way.
   ------------------------------------------------------------ */
const POLL_EVERY_MS = 5000;
const POLL_LIMIT_MS = 180000; // 3 minutes; a normal round trip is ~60s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* verify(freshData) -> true once the change is visible. Returns the
   fresh data on success, or null if it never showed up in time. */
async function waitForPublish(slug, verify, onTick) {
  const started = Date.now();

  while (Date.now() - started < POLL_LIMIT_MS) {
    await sleep(POLL_EVERY_MS);
    onTick(Math.round((Date.now() - started) / 1000));

    try {
      const fresh = await loadLeagueData(slug, true);
      if (verify(fresh)) return fresh;
    } catch (e) {
      /* A failed poll is almost always Pages mid-deploy serving a
         partial or 404 response. Keep waiting rather than reporting
         a failure we'd have to walk back a few seconds later. */
    }
  }

  return null;
}

/* Did every score we submitted actually land, with the numbers we
   sent? Checking the values and not just "is it scored now" means a
   half-applied write can't read as success. */
function scoresLanded(fresh, week, entries) {
  const list = WeekCore.scoreableGames(WeekCore.buildWeek(fresh, week));

  return entries.every((sent) => {
    const game = list.find((g) => g.perspective === sent.team);
    if (!game || !game.scoredPair) return false;

    const [a, b] = sent.score.split("-").map(Number);
    if (game.scoredPair.team !== a || game.scoredPair.opponent !== b) return false;

    /* If the submission set a sim state, the published file has to
       agree — otherwise a flag that didn't land would read as a
       clean save. */
    if (sent.sim !== undefined && !!game.sim !== !!sent.sim) return false;
    return true;
  });
}

/* ------------------------------------------------------------
   SAVE SCORES
   ------------------------------------------------------------ */
$("save-scores").addEventListener("click", async () => {
  const btn = $("save-scores");
  const msg = $("scores-msg");
  const week = Number($("week-select").value);
  const { entries, problems } = collect();

  if (problems.length) {
    message(msg, "error", `Fix these first:\n${problems.join("\n")}`);
    return;
  }
  if (!entries.length) {
    message(msg, "warn", "Nothing typed in yet.");
    return;
  }

  btn.disabled = true;
  message(msg, "warn", "Saving…");

  try {
    await api("/submit", {
      code: accessCode,
      payload: {
        action: "scores",
        league: $("league-select").value,
        week,
        entries,
        /* Only true when the user explicitly unlocked a finished
           game. Sending it always would turn every save into an
           overwrite and lose the guardrail entirely. */
        force: unlocked.size > 0,
      },
    });

    const n = `${entries.length} game${entries.length === 1 ? "" : "s"}`;

    /* Submitted, not saved. Say exactly that until we know better. */
    message(msg, "warn", `Sent ${n}. Waiting for the site to publish…`);
    scrollToMessage(msg);

    const fresh = await waitForPublish(
      $("league-select").value,
      (d) => scoresLanded(d, week, entries),
      (secs) => message(msg, "warn", `Sent ${n}. Waiting for the site to publish… (${secs}s)`)
    );

    if (fresh) {
      /* Re-render from the published file, so the games the user just
         entered now show as FINAL and the missing-scores banner
         updates. The page agreeing with the site is the feedback
         that actually matters — the message is just the caption. */
      data = fresh;
      renderGames();
      message(msg, "ok", `Done — ${n} recorded and live on the site.`);
    } else {
      message(
        msg,
        "warn",
        `Sent ${n}, but the site still hasn't updated after 3 minutes.\n` +
          `This usually means it's just running slow — reload this page in a few minutes to check.\n` +
          `If it still isn't there, tell RekenCrew rather than entering them again.`
      );
    }
  } catch (err) {
    message(msg, "error", err.message);
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------------------------
   ADVANCE — two steps, on purpose
   ------------------------------------------------------------
   Step one swaps the form for a plain-language description of what
   is about to happen. Step two sends it. The confirmation replaces
   the form rather than appearing beneath it, so the second click
   can't land on the same spot as the first.
   ------------------------------------------------------------ */
$("advance-btn").addEventListener("click", () => {
  const week = Number($("advance-week").value);
  const next = $("advance-next").value.trim();
  const msg = $("advance-msg");

  if (!next) {
    message(msg, "error", "Give a deadline — it's what coaches see on the site.");
    return;
  }

  const current = Number(data.SEASON.currentWeek) || 0;
  const wk = WeekCore.buildWeek(data, week);

  let warn = "";
  if (week <= current) {
    warn = ` This moves the league BACKWARDS from ${weekOptionLabel(current)}.`;
  } else if (week > current + 1) {
    warn = ` This skips ${week - current - 1} week(s).`;
  }

  message(msg, "");
  $("advance-confirm-text").innerHTML =
    `${esc(leagueLabel($("league-select").value))} will move to ` +
    `<span class="what">${esc(weekOptionLabel(week))}</span>, with ` +
    `<span class="what">${wk.league.length} head-to-head</span> and ` +
    `<span class="what">${wk.cpu.length} CPU</span> game(s).<br>` +
    `Coaches will see the deadline <span class="what">${esc(next)}</span>.` +
    (warn ? `<br><strong>${esc(warn.trim())}</strong>` : "");

  $("advance-form").classList.add("hidden");
  $("advance-confirm").classList.remove("hidden");
});

$("advance-no").addEventListener("click", () => {
  $("advance-confirm").classList.add("hidden");
  $("advance-form").classList.remove("hidden");
});

$("advance-yes").addEventListener("click", async () => {
  const btn = $("advance-yes");
  const msg = $("advance-msg");
  const week = Number($("advance-week").value);
  const next = $("advance-next").value.trim();

  btn.disabled = true;
  message(msg, "warn", "Advancing…");

  try {
    await api("/submit", {
      code: accessCode,
      payload: {
        action: "advance",
        league: $("league-select").value,
        week,
        next,
        confirm: true,
      },
    });

    $("advance-confirm").classList.add("hidden");
    $("advance-form").classList.remove("hidden");

    message(msg, "warn", `Sent. Waiting for the site to publish…`);
    scrollToMessage(msg);

    const fresh = await waitForPublish(
      $("league-select").value,
      (d) => Number(d.SEASON.currentWeek) === week,
      (secs) => message(msg, "warn", `Sent. Waiting for the site to publish… (${secs}s)`)
    );

    if (fresh) {
      /* Re-read the whole league so the "Currently on WEEK n" line,
         the week dropdown and the missing-scores banner all reflect
         the advance that just happened. */
      data = fresh;
      refreshWeekControls();
      message(msg, "ok", `Done — the league is now on ${weekOptionLabel(week)}, live on the site.`);
    } else {
      message(
        msg,
        "warn",
        `Sent, but the site still hasn't updated after 3 minutes.\n` +
          `Reload this page in a few minutes to check before advancing again.`
      );
    }
  } catch (err) {
    message(msg, "error", err.message);
  } finally {
    btn.disabled = false;
  }
});
