/* ============================================================
   PICK'EM — commissioner tools
   ------------------------------------------------------------
   The pick'em half of /admin/. Loaded after admin.js, which
   calls PickEm.onSignIn(code) once a code has been accepted and
   PickEm.onSignOut() when it's given up.

   WHY THIS IS A SEPARATE FILE
   admin.js is 1100 lines of working commissioner tooling that
   gets used late at night by people who need it to not break.
   Pick'em touches a different Worker, a different database and a
   different permission, so it lives beside that code rather than
   inside it. Removing the feature is deleting two tags and a
   block of markup.

   WHY IT VALIDATES THE CODE AGAIN
   admin.js has already checked this code against the admin
   Worker. That tells us nothing about pick'em: the grant lives on
   the pick'em Worker's own copy of ACCESS_CODES, as `pickem:
   true`. So this asks that Worker directly, and the tab appears
   only if it says yes. A commissioner who scores 3-star but
   wasn't given pick'em signs in exactly as before and sees no tab.

   Everything is inside an IIFE. This file and admin.js share one
   global scope, and admin.js already owns $, esc, message and api.
   ============================================================ */

(function () {
  "use strict";

  /* Paste the pick'em Worker's URL here. Blank disables the whole
     feature cleanly: no tab, no panels, nothing to explain. */
  const PICKEM_API = "https://ncaa-legends-pickem.westfall-105.workers.dev";

  /* Discord refuses a button label over 80 characters, and the
     Worker enforces the same ceiling. Checking here too means the
     Post button goes grey instead of the request failing. */
  const MAX_LABEL = 80;

  /* Pick'em is always 3-star. NOT whatever the league dropdown on
     the Scores tab happens to show — that control belongs to the
     other half of this page, and reading it here would offer Main's
     matchups to a 3-star poll the moment someone left the selector
     on Main. */
  const PICKEM_LEAGUE = "3star";

  /* 19, not 15. Schedules used to stop at the conference
     championships; they now carry the postseason games coached teams
     played, so a bowl or a playoff round has rows to fill a poll
     from — and a championship game is the one people most want to
     pick. Matches the single 0-19 picker in admin.js. */
  const LAST_SCHEDULED_WEEK = 19;

  let code = "";
  let kind = "dynasty";
  let polls = { open: [], awaiting: [], settled: [] };
  let busy = false;
  let league = null;   // 3-star league + schedule data, loaded once

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );

  const nowSec = () => Math.floor(Date.now() / 1000);

  const fmtDate = (ts) =>
    new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const fmtFull = (ts) =>
    new Date(ts * 1000).toLocaleString(undefined, {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  /* ----------------------------------------------------------
     TRANSPORT
     Every call carries the code. The reply from /whoami is not a
     credential and is never trusted — the Worker re-checks on
     each request, exactly as admin-api.js does.
     ---------------------------------------------------------- */
  async function api(route, body) {
    let res;
    try {
      res = await fetch(PICKEM_API.replace(/\/+$/, "") + route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ code }, body || {})),
      });
    } catch {
      throw new Error("Couldn't reach the pick'em server. Check your connection.");
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      /* leave empty; the status still tells us something */
    }

    if (!res.ok) {
      throw new Error(data.error || `Server said ${res.status}.`);
    }
    return data;
  }

  function say(el, kind, text) {
    if (!el) return;
    if (!text) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="msg${kind === "error" ? " bad" : ""}">${esc(text)}</div>`;
  }

  /* ----------------------------------------------------------
     SIGN IN / OUT
     ---------------------------------------------------------- */
  async function onSignIn(theCode) {
    if (!PICKEM_API) return;
    code = theCode;

    let who;
    try {
      who = await api("/whoami");
    } catch {
      /* Almost always "this code has no pick'em access", which is
         the normal case for most commissioners and not an error
         worth showing. A genuinely broken server shows up the
         moment someone who does have access signs in. */
      hide();
      return;
    }

    /* who.name is deliberately not displayed again — admin.js
       already put it in the "Signed in as" line, and it's the same
       person from the same code. */
    $("mode-tabs").classList.remove("hidden");
    setMode("league");
    await Promise.all([refresh(), loadSchedule()]);
  }

  /* ----------------------------------------------------------
     TAP TO FILL
     ------------------------------------------------------------
     Borrows loadLeagueData() and WeekCore from admin.js and
     week-core.js, which are already on the page. Both are probed
     rather than assumed: if either is missing the chips simply
     never appear and every other part of this panel still works.
     ---------------------------------------------------------- */
  async function loadSchedule() {
    if (league) return;
    if (typeof loadLeagueData !== "function" || typeof WeekCore === "undefined") return;

    try {
      league = await loadLeagueData(PICKEM_LEAGUE);
    } catch {
      return;   // no chips; the text boxes still work
    }

    /* Sentinel-aware: "OFFSEASON" must land on the last bowl week,
       not week 0. A bare Number() coercion would open the picker on
       the season opener the week after the national championship. */
    const raw = league.SEASON && league.SEASON.currentWeek;
    const current =
      raw === "OFFSEASON" ? LAST_SCHEDULED_WEEK : raw === "PRESEASON" ? 0 : Number(raw) || 0;
    const label = (w) =>
      typeof weekOptionLabel === "function" ? weekOptionLabel(w) : `Week ${w}`;

    const opts = [];
    for (let w = 0; w <= LAST_SCHEDULED_WEEK; w++) {
      opts.push(`<option value="${w}">${esc(label(w))}</option>`);
    }
    $("pk-week").innerHTML = opts.join("");

    /* Default to the current week, but the list runs to 15 so a poll
       for next week's game can be posted during this one — which is
       the normal way a pick'em gets used. */
    $("pk-week").value = String(Math.min(current, LAST_SCHEDULED_WEEK));

    $("pk-fill-wrap").classList.remove("hidden");
    renderChips();
  }

  function renderChips() {
    const week = Number($("pk-week").value);
    const host = $("pk-chips");

    let meetings = [];
    try {
      meetings = WeekCore.buildWeek(league, week).league || [];
    } catch {
      meetings = [];
    }

    if (!meetings.length) {
      host.innerHTML =
        '<p class="pk-chips-none">No coach-vs-coach games scheduled that week.</p>';
      return;
    }

    /* Coach names, not team names. A dynasty poll is an argument
       about the two people playing, and that's how it reads in the
       channel. Falls back to the team if a meeting has no coach —
       a CPU-held school mid-season, say. */
    host.innerHTML = meetings.map((m) => {
      const a = m.awayCoach || m.away;
      const b = m.homeCoach || m.home;
      const played = Boolean(m.scored);
      return `<button class="pk-chip${played ? " played" : ""}" type="button"
                data-a="${esc(a)}" data-b="${esc(b)}" data-week="${week}"
                >${esc(a)} v ${esc(b)}</button>`;
    }).join("");
  }

  function onSignOut() {
    code = "";
    polls = { open: [], awaiting: [], settled: [] };
    hide();
  }

  function hide() {
    $("mode-tabs").classList.add("hidden");
    $("mode-pickem").classList.add("hidden");
    $("mode-league").classList.remove("hidden");
  }

  function setMode(mode) {
    const pick = mode === "pickem";
    $("mode-league").classList.toggle("hidden", pick);
    $("mode-pickem").classList.toggle("hidden", !pick);
    document.querySelectorAll("#mode-tabs .tab-btn").forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
  }

  /* ----------------------------------------------------------
     LOAD AND RENDER
     ---------------------------------------------------------- */
  async function refresh() {
    try {
      polls = await api("/polls/list");
      render();
    } catch (err) {
      say($("pk-list-msg"), "error", err.message);
    }
  }

  const tagFor = (p) =>
    p.kind === "dynasty"
      ? '<span class="pk-tag dyn">DYNASTY</span>'
      : '<span class="pk-tag">OUTSIDE</span>';

  function render() {
    const now = nowSec();

    /* --- needs a result --- */
    $("pk-await-panel").classList.toggle("hidden", !polls.awaiting.length);
    $("pk-await").innerHTML = polls.awaiting.map((p) => `
      <div class="pk-poll">
        <div class="pk-poll-top"><div>
          <span class="pk-poll-match">${esc(p.a)} vs ${esc(p.b)}</span>${tagFor(p)}
          <div class="pk-poll-meta">Closed ${fmtDate(p.closes_at)} &middot;
            ${p.a_votes}&ndash;${p.b_votes} &middot; ${p.votes} votes${p.note ? " &middot; " + esc(p.note) : ""}</div>
        </div></div>
        <div class="pk-outcome-row">
          <button class="pk-out-btn" type="button" data-outcome="${p.id}:a">${esc(p.a)} won</button>
          <button class="pk-out-btn" type="button" data-outcome="${p.id}:b">${esc(p.b)} won</button>
          <button class="pk-out-btn void" type="button" data-outcome="${p.id}:void">Void</button>
        </div>
      </div>`).join("");

    /* --- open ---
       Vote count only, never the split. Blood is in the drawing
       too, and a running tally visible anywhere before the
       deadline lets whoever can see it match the crowd. The
       Worker enforces this as well; this is only the rendering
       half of the same rule. */
    $("pk-open").innerHTML = polls.open.length
      ? polls.open.map((p) => `
        <div class="pk-poll">
          <div class="pk-poll-top">
            <div>
              <span class="pk-poll-match">${esc(p.a)} vs ${esc(p.b)}</span>${tagFor(p)}<span class="pk-tag live">LIVE</span>
              <div class="pk-poll-meta">${p.votes} voted &middot; closes ${fmtFull(p.closes_at)}
                &middot; ${Math.max(0, Math.round((p.closes_at - now) / 3600))}h left</div>
            </div>
            <button class="btn btn-quiet" type="button" style="padding:6px 12px;font-size:12px;"
                    data-close="${p.id}">Close early</button>
          </div>
        </div>`).join("")
      : '<p class="pk-empty">Nothing open right now.</p>';

    /* --- settled --- */
    $("pk-settled-count").textContent = polls.settled.length;
    $("pk-settled").innerHTML = polls.settled.length
      ? polls.settled.map((p) => {
          const label = p.outcome === "void"
            ? '<span class="void">Voided &mdash; scored for nobody</span>'
            : `<span class="won">${esc(p.outcome === "a" ? p.a : p.b)}</span> won`;
          return `
          <div class="pk-poll">
            <div class="pk-poll-top">
              <div>
                <span class="pk-poll-match">${esc(p.a)} vs ${esc(p.b)}</span>${tagFor(p)}
                <div class="pk-poll-meta">${fmtDate(p.closes_at)} &middot;
                  ${p.a_votes}&ndash;${p.b_votes} &middot; ${p.votes} votes</div>
              </div>
              <button class="btn btn-quiet" type="button" style="padding:6px 12px;font-size:12px;"
                      data-redo="${p.id}">Change</button>
            </div>
            <div class="pk-settled-line">${label}</div>
          </div>`;
        }).join("")
      : '<p class="pk-loading">Nothing settled yet.</p>';
  }

  /* ----------------------------------------------------------
     NEW POLL
     ---------------------------------------------------------- */

  /* The close time is picked, never typed — the same reasoning as
     the advance deadline on the scores side. The sentence under
     the pickers is the only chance to catch a wrong date, and it
     matters more here: a posted poll message cannot be edited, so
     a typo means delete and repost. */
  function closesAt() {
    const d = $("pk-date").value;
    const t = $("pk-time").value || "20:00";
    if (!d) return null;
    const ms = new Date(`${d}T${t}:00`).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }

  function preview() {
    const aRaw = $("pk-a").value.trim();
    const bRaw = $("pk-b").value.trim();
    const a = aRaw || $("pk-a").placeholder;
    const b = bRaw || $("pk-b").placeholder;
    const ts = closesAt();
    const now = nowSec();

    $("pk-pv-title").textContent = kind === "dynasty" ? "Dynasty pick'em" : "Pick'em";
    $("pk-pv-match").textContent = `${a} vs ${b}`;
    $("pk-pv-foot").textContent = ts ? "Closes " + fmtFull(ts) : "Closes —";
    $("pk-pv-a").textContent = a;
    $("pk-pv-b").textContent = b;

    const el = $("pk-preview-line");
    let problem = "";

    if (!aRaw || !bRaw) problem = "Fill in both sides.";
    else if (aRaw.length > MAX_LABEL || bRaw.length > MAX_LABEL)
      problem = `Names are limited to ${MAX_LABEL} characters.`;
    else if (aRaw.toLowerCase() === bRaw.toLowerCase())
      problem = "Both sides are the same.";
    else if (!ts) problem = "Pick a closing date.";
    else if (ts <= now + 60) problem = "That closing time has already passed.";
    else if (ts > now + 32 * 86400) problem = "That's more than 32 days out.";

    if (problem) {
      el.className = "deadline-preview bad";
      el.textContent = problem;
    } else {
      el.className = "deadline-preview";
      el.innerHTML =
        `Closes <strong>${esc(fmtFull(ts))}</strong> &mdash; about ` +
        `${Math.round((ts - now) / 3600)} hours of voting.`;
    }

    $("pk-post").disabled = Boolean(problem) || busy;
  }

  async function post() {
    if (busy) return;
    busy = true;
    $("pk-post").disabled = true;
    say($("pk-post-msg"), "warn", "Posting…");

    try {
      await api("/polls/create", {
        kind,
        a: $("pk-a").value.trim(),
        b: $("pk-b").value.trim(),
        note: $("pk-note").value.trim(),
        closes_at: closesAt(),
      });
      $("pk-a").value = "";
      $("pk-b").value = "";
      $("pk-note").value = "";
      say($("pk-post-msg"), "ok", "Posted. Coaches can vote now.");
      await refresh();
    } catch (err) {
      /* The Worker rolls its own row back when Discord refuses, so
         a failure here really is a no-op and "try again" is honest
         advice rather than a hope. */
      say($("pk-post-msg"), "error", err.message);
    } finally {
      busy = false;
      preview();
    }
  }

  /* ----------------------------------------------------------
     WIRING
     ---------------------------------------------------------- */
  function wire() {
    if (!$("mode-tabs")) return;   // markup absent — feature removed

    $("mode-tabs").addEventListener("click", (e) => {
      const b = e.target.closest(".tab-btn");
      if (b) setMode(b.dataset.mode);
    });

    document.querySelectorAll(".pk-kind-btn").forEach((b) => {
      b.addEventListener("click", () => {
        kind = b.dataset.kind;
        document.querySelectorAll(".pk-kind-btn").forEach((x) =>
          x.setAttribute("aria-pressed", String(x.dataset.kind === kind))
        );
        $("pk-a").placeholder = kind === "dynasty" ? "Bl00dVayN3" : "Ohio State";
        $("pk-b").placeholder = kind === "dynasty" ? "Temptiger" : "Michigan";
        preview();
      });
    });

    ["pk-a", "pk-b", "pk-date", "pk-time", "pk-note"].forEach((id) => {
      $(id).addEventListener("input", preview);
      $(id).addEventListener("change", preview);
    });

    $("pk-week").addEventListener("change", renderChips);

    /* A chip types into the boxes and nothing more — they stay
       editable, so a fill is a starting point rather than a
       commitment. The note is only filled if it's empty, so a chip
       tapped after typing "rivalry week" doesn't overwrite it. */
    $("pk-chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".pk-chip");
      if (!chip) return;
      $("pk-a").value = chip.dataset.a;
      $("pk-b").value = chip.dataset.b;
      if (!$("pk-note").value.trim()) {
        const w = Number(chip.dataset.week);
        $("pk-note").value =
          typeof weekOptionLabel === "function" ? weekOptionLabel(w) : `Week ${w}`;
      }
      if (kind !== "dynasty") {
        document.querySelector('.pk-kind-btn[data-kind="dynasty"]').click();
      } else {
        preview();
      }
    });

    $("pk-post").addEventListener("click", post);
    $("pk-refresh").addEventListener("click", refresh);

    /* Delegated, so rows rendered later stay live without
       rebinding after every refresh. */
    $("mode-pickem").addEventListener("click", async (e) => {
      const out = e.target.closest("[data-outcome]");
      if (out) {
        const [id, outcome] = out.dataset.outcome.split(":");
        const p = polls.awaiting.find((x) => String(x.id) === id);
        const what = outcome === "void"
          ? "Void this poll? It scores for nobody."
          : `Record ${outcome === "a" ? p.a : p.b} as the winner?`;
        if (!window.confirm(what)) return;
        try {
          await api("/polls/outcome", { poll_id: Number(id), outcome });
          await refresh();
        } catch (err) {
          say($("pk-list-msg"), "error", err.message);
        }
        return;
      }

      const close = e.target.closest("[data-close]");
      if (close) {
        if (!window.confirm("Close this poll now? Nobody can vote or change a pick after this.")) return;
        try {
          await api("/polls/close", { poll_id: Number(close.dataset.close) });
          await refresh();
        } catch (err) {
          say($("pk-list-msg"), "error", err.message);
        }
        return;
      }

      /* Changing a settled result recalculates the drawing for
         everyone who picked that game, so it asks first and then
         drops the poll back into "needs a result" rather than
         silently flipping it. */
      const redo = e.target.closest("[data-redo]");
      if (redo) {
        if (!window.confirm(
          "Clear this result? It goes back to needing a result, and every " +
          "entry from it is recalculated."
        )) return;
        try {
          await api("/polls/outcome", { poll_id: Number(redo.dataset.redo), outcome: "clear" });
          await refresh();
        } catch (err) {
          say($("pk-list-msg"), "error", err.message);
        }
      }
    });

    /* Default the date to tomorrow so the commonest case is two
       clicks rather than a date-picker expedition. */
    const t = new Date(Date.now() + 86400000);
    $("pk-date").value =
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    preview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  window.PickEm = { onSignIn, onSignOut };
})();
