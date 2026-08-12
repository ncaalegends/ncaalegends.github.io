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

/* Games shown as saved before the published file has confirmed them.
   Keyed "team|week". See "SHOWING THE SCORE BEFORE THE SITE HAS IT"
   further down for what puts things in here and what takes them out. */
const pending = new Set();
const pendingKey = (team, week) => `${team}|${week}`;

/* Scores typed in, submitted, and then un-painted because the site
   never confirmed them. Keyed the same way, and used to refill the
   boxes on the way back so an unconfirmed save doesn't also cost the
   user their typing — they may well need to send it again, and
   asking them to re-read a week's worth of scores off a screenshot
   because this page couldn't confirm them is the kind of small
   insult that makes people go back to messaging them to RekenCrew. */
const restored = new Map();

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

/* Week 14 and 15 carry names on the site, and 16-19 are the game's
   own Bowl Weeks 1-4, one per playoff round; matching them here means
   the dropdown reads the way the schedule does. */
const BOWL_WEEK_NAME = {
  16: "Bowl Week 1 — CFP First Round",
  17: "Bowl Week 2 — CFP Quarterfinals",
  18: "Bowl Week 3 — CFP Semifinals",
  19: "Bowl Week 4 — National Championship",
};
function weekOptionLabel(w) {
  if (w === 14) return "Week 14 — Army-Navy";
  if (w === 15) return "Week 15 — Championships";
  return BOWL_WEEK_NAME[w] || `Week ${w}`;
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
/* Leagues that can be advanced from the web. All three now qualify —
   the web advance posts the Discord announcement itself, so main is no
   longer held back. Mirrors ADVANCE_LEAGUES in the Worker and
   tools/apply.js; kept as its own list so a league can be made
   scores-only again by dropping it here (and there). */
const ADVANCE_LEAGUES = ["1star", "3star", "main"];

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

  /* TWO DIFFERENT RANGES, on purpose. Scores are entered against
     schedule rows, and schedules stop at the conference
     championships — a bowl week has no rows to score, and its
     results go in postseason-data.js instead. The season itself
     keeps going for four more weeks, so the ADVANCE picker runs to
     19 while the SCORE picker stops at 15. Sharing one list is what
     would let someone pick "Bowl Week 2" on a page that can only
     write regular-season scores. */
  const opt = (w) => `<option value="${w}">${esc(weekOptionLabel(w))}</option>`;
  const scoreOpts = [];
  for (let w = 0; w <= 15; w++) scoreOpts.push(opt(w));
  const advanceOpts = [];
  for (let w = 0; w <= 19; w++) advanceOpts.push(opt(w));

  $("week-select").innerHTML = scoreOpts.join("");
  $("week-select").value = String(Math.min(current, 15));

  $("advance-week").innerHTML = advanceOpts.join("");
  $("advance-week").value = String(Math.min(current + 1, 19));

  /* Prefill from the stored timestamp, not from the sentence — the
     sentence is generated and can't be parsed back reliably. A league
     whose deadline predates this change simply starts blank, which is
     honest: it has no machine-readable deadline yet. */
  const picker = Deadline.toPickerFields(data.SEASON.nextAdvanceAt);
  $("advance-date").value = picker.date;
  $("advance-time").value = picker.time;
  renderDeadlinePreview();

  $("current-week").textContent =
    `Currently on ${weekOptionLabel(current).toUpperCase()}` +
    (data.SEASON.nextAdvance ? ` · next deadline ${data.SEASON.nextAdvance}` : "");

  renderGames();
}

/* Both of these drop any optimistic paint. The pending set is keyed
   by team and week, and a team can play in several weeks — leaving a
   stale key behind would mark an unrelated game as SAVING and hide
   its Edit button. Changing the view also means the user has stopped
   watching the save they started, so there's nothing left for the
   marker to communicate. */
$("league-select").addEventListener("change", (e) => {
  pending.clear();
  restored.clear();
  switchLeague(e.target.value);
});
$("week-select").addEventListener("change", () => {
  pending.clear();
  restored.clear();
  renderGames();
});

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

  /* Split into what's left and what's done, and put what's left on
     top. On a 10+ game week most of the list is finished, and the
     old schedule-order interleaving meant hunting through finished
     games to find the blanks. The original index travels with each
     game in the data attributes, so collect() and the edit handlers
     still address games by their real index no matter how the DOM is
     ordered here. */
  const todo = [];
  const done = [];
  const saving = [];

  games.forEach((g, i) => {
    /* A game painted optimistically is scored as far as the data is
       concerned, but it must not drop into the collapsed Entered
       section — the user just pressed Save and watching their games
       disappear into a closed accordion is the opposite of the
       feedback this is for. It gets its own group at the top until
       the published file confirms it. */
    if (g.scored && pending.has(pendingKey(g.perspective, week))) saving.push({ g, i });
    else if (g.scored) done.push({ g, i });
    else todo.push({ g, i });
  });

  let html = "";

  if (saving.length) {
    html +=
      `<div class="group-head">Saving <span class="group-count">${saving.length}</span></div>` +
      saving.map(({ g, i }) => gameHtml(g, i, week)).join("");
  }

  if (todo.length) {
    html +=
      `<div class="group-head">To enter <span class="group-count">${todo.length}</span></div>` +
      todo.map(({ g, i }) => gameHtml(g, i, week)).join("");
  } else if (!saving.length) {
    html += `<p class="all-done">All games this week are entered.</p>`;
  }

  /* Finished games go into a collapsed section, so a week that's
     mostly done shows just the few blanks up top and a tidy count
     below. Auto-opened only when there's nothing left to enter, so
     the page isn't a dead end once you're caught up. */
  if (done.length) {
    html +=
      `<details class="entered"${todo.length ? "" : " open"}>` +
      `<summary>Entered <span class="group-count muted">${done.length}</span>` +
      `<span class="ent-hint"></span></summary>` +
      `<div class="entered-body">` +
      done.map(({ g, i }) => gameHtml(g, i, week)).join("") +
      `</div></details>`;
  }

  host.innerHTML = html;

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
      wireKeyboard(host);
      row.querySelector(".score-box").focus();
    });
  });

  wireInputs(host);
  wireKeyboard(host);
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

function gameHtml(g, i, week) {
  /* A league (coach-vs-coach) game is the one that actually matters
     for standings — a CPU game is a formality. So H2H gets the
     accent LEAGUE tag and the row a left accent bar + tint; CPU
     gets a plain muted tag. This is the visual weighting the flat
     old list was missing. */
  const league = g.kind === "h2h";
  const tag = league
    ? `<span class="game-tag league">LEAGUE</span>`
    : `<span class="game-tag">CPU</span>`;
  const cls = league ? "game is-league" : "game";

  const head =
    `<div class="game-label">${esc(g.label)}${tag}</div>` +
    (g.subtitle ? `<div class="game-sub">${esc(g.subtitle)}</div>` : "");

  if (g.scored) {
    const simTag = g.sim ? ` <span class="sim-tag">SIM</span>` : "";

    /* Painted a moment ago and not yet confirmed by the published
       file. Reads SAVING instead of FINAL, and offers no Edit button
       — editing a score that hasn't landed yet would race the
       submission already in flight. */
    const isPending = pending.has(pendingKey(g.perspective, week));

    if (isPending) {
      return (
        `<div class="${cls} is-final is-pending" data-game="${i}">${head}` +
        `<div class="final-line"><span class="pending-tag">SAVING…</span> &nbsp;${esc(g.scored)}${simTag}` +
        `</div></div>`
      );
    }

    return (
      `<div class="${cls} is-final" data-game="${i}">${head}` +
      `<div class="final-line">FINAL &nbsp;${esc(g.scored)}${simTag}` +
      `<button type="button" class="lock btn-quiet" data-edit="${i}" ` +
      `style="background:none;border:0;color:var(--steel);text-decoration:underline;cursor:pointer;">Edit</button>` +
      `</div></div>`
    );
  }

  /* Anything a failed save handed back. Normally empty. */
  const prefill = restored.get(pendingKey(g.perspective, week)) || null;

  return `<div class="${cls}" data-game="${i}">${head}${scoreInputsHtml(g, i, prefill)}</div>`;
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

  /* type="text" + inputmode="numeric", NOT type="number". A number
     input adds spinner arrows and hijacks the mouse wheel to nudge
     the value — easy to bump a recorded score by scrolling past it.
     Text with a numeric inputmode still pops the phone number pad,
     and wireInputs() strips anything non-digit on the way in, so the
     field only ever holds 0-3 digits. maxlength backs that up. */
  return (
    `<div class="score-row" data-inputs="${i}">` +
    `<span class="score-side">${esc(g.perspective)}</span>` +
    `<input class="score-box" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" ` +
    `data-side="team" data-i="${i}" value="${esc(a)}" aria-label="${esc(g.perspective)} score">` +
    `<span class="score-dash">&ndash;</span>` +
    `<input class="score-box" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" ` +
    `data-side="opp" data-i="${i}" value="${esc(b)}" aria-label="${esc(g.other)} score">` +
    `<span class="score-side right">${esc(g.other)}</span>` +
    `</div>` +
    simRow
  );
}

function wireInputs(scope) {
  scope.querySelectorAll(".score-box").forEach((el) => {
    el.addEventListener("input", () => {
      /* Strip to digits on every input, which also covers paste and
         autofill — the field can never end up holding a letter, a
         minus, or a decimal point that parseScore would then have to
         reject. Only rewrite when it actually changed, so the caret
         doesn't jump on a normal keystroke. */
      const clean = el.value.replace(/[^0-9]/g, "").slice(0, 3);
      if (clean !== el.value) el.value = clean;
      updateCount();
    });
  });
}

/* Enter advances to the next box, and to Save after the last one.
   For a 10+ game week this turns entry into type-Enter-type-Enter
   without ever reaching for the mouse — the single biggest thing
   that made a full slate tedious. Rebound on every render because
   the box set changes; listeners on replaced nodes go away with
   them, so there's nothing to detach. */
function wireKeyboard(host) {
  const boxes = [...host.querySelectorAll(".score-box")];
  boxes.forEach((el, idx) => {
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault(); // no form here, but stops any implicit submit
      const next = boxes[idx + 1];
      if (next) {
        next.focus();
        next.select();
      } else {
        $("save-scores").focus();
      }
    });
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
   SHOWING THE SCORE BEFORE THE SITE HAS IT
   ------------------------------------------------------------
   The wait above is 60-90 seconds and there is nothing useful to
   do about that from here — the Actions run and the Pages deploy
   are what they are. What IS fixable is that the page used to sit
   completely unchanged for the whole minute: the boxes you just
   typed into still showed your typing, nothing moved, and a save
   that was working looked exactly like a save that had failed.
   That, not the duration, is what the "no feedback" report was
   really about.

   So the moment the Worker accepts the submission, the scores are
   painted into the page's own copy of the data as though they had
   published. The games move to the Entered section and read FINAL,
   marked "saving" until the real file confirms them.

   THIS IS A CLAIM, AND IT CAN BE WRONG
   The Worker accepting a submission means it dispatched, not that
   apply.js liked it. So the paint is explicitly provisional and
   every path that doesn't end in confirmation takes it back:
   waitForPublish timing out, or the submission failing outright.
   An optimistic paint that survives a failure is worse than no
   paint at all — it turns "did that work?" into "it said it
   worked", which is how a score goes missing for a week.

   The edits come from score-core, the same function apply.js uses
   on the runner. Deriving them here from the entries by hand would
   be a second implementation of the H2H mirroring rule, and the
   whole point of that module is that there isn't one.
   ------------------------------------------------------------ */
/* Write the edits into the in-memory TEAM_SCHEDULES, exactly where
   applyScoresToSource would write them in the file. Returns a
   function that puts everything back. */
function paintPending(week, entries) {
  let edits;
  try {
    edits = ScoreCore.resolveEntries(entries, games, week, data, unlocked.size > 0).edits;
  } catch (e) {
    /* resolveEntries rejecting here means the page and the data
       disagree — a stale page, most likely. The submission is
       already away and apply.js will have the final say, so this
       isn't the place to report it; just don't paint anything. */
    return () => {};
  }

  const undo = [];

  for (const e of edits) {
    const team = (data.TEAM_SCHEDULES || []).find((t) => t.team === e.team);
    if (!team) continue;
    const row = (team.weeks || []).find((w) => w.week === e.week);
    if (!row || row.opponent === undefined) continue;

    undo.push({
      row,
      teamScore: row.teamScore,
      opponentScore: row.opponentScore,
      sim: row.sim,
    });

    row.teamScore = e.teamScore;
    row.opponentScore = e.opponentScore;
    if (e.sim !== undefined) {
      if (e.sim) row.sim = true;
      else delete row.sim;
    }

    pending.add(pendingKey(e.team, e.week));
  }

  renderGames();

  return () => {
    /* Put the typed scores back in the boxes, not just the boxes
       back. entries are already validated "27-24" strings by the
       time they get here. */
    for (const e of entries) {
      const [a, b] = String(e.score).split("-");
      restored.set(pendingKey(e.team, week), { team: a, opponent: b });
    }

    for (const u of undo) {
      /* Restore by deleting rather than assigning undefined — an
         explicit `teamScore: undefined` would make the game read as
         scored-but-blank everywhere downstream. */
      if (u.teamScore === undefined) delete u.row.teamScore;
      else u.row.teamScore = u.teamScore;

      if (u.opponentScore === undefined) delete u.row.opponentScore;
      else u.row.opponentScore = u.opponentScore;

      if (u.sim === undefined) delete u.row.sim;
      else u.row.sim = u.sim;
    }
    pending.clear();
    renderGames();
  };
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

    /* Show them as final straight away, marked as still saving. See
       the block above for why this is provisional and what takes it
       back. */
    restored.clear();
    const unpaint = paintPending(week, entries);

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
         that actually matters — the message is just the caption.

         This replaces the painted copy wholesale rather than clearing
         the flags on it, so what's on screen at the end came from the
         published file and not from anything this page assumed. */
      pending.clear();
      restored.clear();
      data = fresh;
      renderGames();
      message(msg, "ok", `Done — ${n} recorded and live on the site.`);
    } else {
      unpaint();
      message(
        msg,
        "warn",
        `Sent ${n}, but the site still hasn't updated after 3 minutes.\n` +
          `The scores have been put back the way they were on this page — that's not a sign\n` +
          `they were lost, only that this page can't confirm them. Reload in a few minutes to check.\n` +
          `If they still aren't there, tell RekenCrew rather than entering them again.`
      );
    }
  } catch (err) {
    message(msg, "error", err.message);
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------------------------
   THE DEADLINE PICKERS
   ------------------------------------------------------------
   readDeadline() is the single place the two inputs become the one
   value that gets sent. Returns:

     { at, text }   a usable deadline
     null           no date picked yet
     false          a date that /deadline.js won't accept

   The three are kept distinct because "you haven't picked one" and
   "that isn't a real date" are different mistakes and deserve
   different messages.

   Time blank is not an error. It means a deadline stated as a day
   with no clock time, which is how two of the three leagues have
   always read — the bare date is stored, and 6 PM Eastern is
   assumed internally so the heads-up still knows whether the
   advance is ahead or behind.
   ------------------------------------------------------------ */
function readDeadline() {
  const date = $("advance-date").value.trim();
  const time = $("advance-time").value.trim();
  if (!date) return null;

  const at = time ? Deadline.fromPickerFields(date, time) : Deadline.canonical(date);
  if (!at) return false;

  return { at, text: Deadline.formatDeadline(at) };
}

/* Echo the generated sentence under the pickers. Nobody types this
   string any more, so this is the one chance to notice that the date
   says Thursday when you meant Tuesday — before 24 people see it. */
function renderDeadlinePreview() {
  const el = $("advance-preview");
  if (!el) return;

  const d = readDeadline();
  el.classList.remove("bad");

  if (d === null) {
    el.textContent = "Pick a date and the site will read: …";
    return;
  }
  if (d === false) {
    el.classList.add("bad");
    el.textContent = "That date isn't valid.";
    return;
  }
  el.innerHTML = `The site will read: <strong>${esc(d.text)}</strong>`;
}

$("advance-date").addEventListener("input", renderDeadlinePreview);
$("advance-time").addEventListener("input", renderDeadlinePreview);

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
  const msg = $("advance-msg");

  const deadline = readDeadline();
  if (deadline === null) {
    message(msg, "error", "Pick a deadline date — it's what coaches see on the site.");
    return;
  }
  if (deadline === false) {
    message(msg, "error", "That deadline isn't a valid date.");
    return;
  }
  const next = deadline.text;

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

  /* Re-read rather than trusting what step one showed. The pickers
     are still on the page behind the confirmation, and this is the
     click that actually sends. */
  const deadline = readDeadline();
  if (!deadline) {
    message(msg, "error", "The deadline stopped being valid — pick it again.");
    return;
  }

  btn.disabled = true;
  message(msg, "warn", "Advancing…");

  try {
    await api("/submit", {
      code: accessCode,
      payload: {
        action: "advance",
        league: $("league-select").value,
        week,
        /* The timestamp, not the sentence. apply.js regenerates the
           sentence from it with the same code the command-line tool
           uses, so the site and Discord can't end up describing the
           same deadline differently. */
        nextAt: deadline.at,
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
