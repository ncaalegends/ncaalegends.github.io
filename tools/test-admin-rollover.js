#!/usr/bin/env node
/* ============================================================
   TEST — Advance to Preseason, end to end but for the runner
   ------------------------------------------------------------
     npm install jsdom          (once; local-only, see .gitignore)
     node tools/test-admin-rollover.js

   The rollover is the one action on the admin page that happens
   once a year, which means every bug in it has eleven months to
   sit there unnoticed and then fires on the night it matters. So
   the three things that can't be caught by using the page are
   asserted here:

     1. THE PANEL IS INVISIBLE UNTIL THE OFFSEASON. It is hidden on
        every numeric week, and it appears on the sentinel. A panel
        that showed up mid-season would let somebody archive a
        season with eight weeks left in it.

     2. AN UNFINISHED SEASON GATES THE BUTTON. rollover.js refuses
        without --force; the web's equivalent is a tick-box that
        only exists when there is something to warn about, and the
        button is disabled until it's ticked. If that ever comes
        unwired the warning becomes decoration.

     3. THE YEAR IS SENT, AND apply.js CHECKS IT. That field is the
        only thing standing between a tab left open across a
        rollover and a second archive of a season that already has
        one.

   Plus the file surgery itself — resetLeagueData / clearSchedules /
   emptyArray run against real league files in a temp copy, because
   they are regexes over hand-formatted source and a header comment
   that happens to contain "const TOP25 = [" is exactly the kind of
   thing that breaks them silently.

   jsdom is local-only and not in CI, same as the other two admin
   tests.
   ============================================================ */

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let failed = 0;
const ok = (name, cond, detail) => {
  console.log(`    ${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : ` — ${detail}`}`);
  if (!cond) failed++;
};

/* ------------------------------------------------------------
   PART 1 — the file surgery, against real league files
   ------------------------------------------------------------ */
function testFileSurgery() {
  console.log("\n  Rewriting the live files (temp copies of the real 1-star data)\n");

  const roll = require("./rollover");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rollover-test-"));

  const copy = (name) => {
    const to = path.join(tmp, name);
    fs.copyFileSync(path.join(ROOT, "1star", name), to);
    return to;
  };

  const leagueFile = copy("league-data.js");
  const scheduleFile = copy("schedule-data.js");
  const top25File = copy("top25-data.js");
  const cfpFile = copy("cfp-data.js");
  const postFile = copy("postseason-data.js");

  const reset = roll.resetLeagueData(leagueFile, 2027);
  ok("SEASON.year is bumped", /^\s*year:\s*2027,/m.test(reset.text));
  ok('currentWeek becomes "PRESEASON"', /^\s*currentWeek:\s*"PRESEASON",/m.test(reset.text));
  ok('statusLine becomes "PRESEASON"', /^\s*statusLine:\s*"PRESEASON",/m.test(reset.text));
  ok("both deadline fields are cleared", /nextAdvanceAt:\s*""/.test(reset.text) && /nextAdvance:\s*""/.test(reset.text));
  ok("no departedAfterWeek survives", !/departedAfterWeek/.test(reset.text));
  ok(
    "the roster itself is untouched",
    (reset.text.match(/name:\s*"/g) || []).length ===
      (read("1star/league-data.js").match(/name:\s*"/g) || []).length
  );

  const sched = roll.clearSchedules(scheduleFile);
  /* Counted, not searched for absence: these files carry worked
     examples in their header comments that look exactly like a week
     row, so "no `week:` anywhere" would be a test that can only pass
     by accident. Every weeks: [ ... ] span must be an empty pair. */
  const emptied = (sched.text.match(/weeks:\s*\[\s*\],/g) || []).length;
  ok(
    "every team's weeks are emptied",
    sched.cleared > 0 && emptied === sched.cleared,
    `${emptied} empty spans for ${sched.cleared} cleared`
  );
  ok(
    "teams and conferences are kept",
    (sched.text.match(/team:\s*"/g) || []).length === sched.cleared,
    `${(sched.text.match(/team:\s*"/g) || []).length} team keys for ${sched.cleared} cleared`
  );

  const t25 = roll.emptyArray(top25File, "TOP25");
  ok("TOP25 is emptied", /^const TOP25 = \[\];/m.test(t25));
  ok(
    "and the header comment above it survives, worked example and all",
    t25.indexOf("const TOP25 = [];") > 400,
    `emptied at index ${t25.indexOf("const TOP25 = [];")}`
  );

  const poll = roll.emptyArray(cfpFile, "CFP_POLL");
  ok("CFP_POLL is emptied", /^const CFP_POLL = \[\];/m.test(poll));
  fs.writeFileSync(cfpFile, poll, "utf8");
  const bracket = roll.emptyArray(cfpFile, "CFP_BRACKET");
  ok("CFP_BRACKET is emptied too, in a second pass", /^const CFP_BRACKET = \[\];/m.test(bracket));

  const post = roll.emptyPostseason(postFile);
  ok("POSTSEASON becomes an empty rounds list", /const POSTSEASON = \{\s*rounds: \[\],\s*\};/.test(post));

  /* The generated loader is what the site actually reads, so it has
     to be valid JavaScript and it has to scope its declarations. */
  const loader = roll.renderArchiveLoader(2026, [
    { name: "league-data.js", text: 'const SEASON = { year: 2026 };\nconst COACHES = [{ name: "A" }];' },
    { name: "schedule-data.js", text: "const TEAM_SCHEDULES = [];" },
  ]);
  const sandbox = { window: {} };
  let loaded = null;
  try {
    new Function("window", loader)(sandbox.window);
    loaded = sandbox.window.ARCHIVED_SEASONS;
  } catch (e) {
    ok("archive.js runs in a browser-like scope", false, e.message);
  }
  if (loaded) {
    ok("archive.js pushes one season onto ARCHIVED_SEASONS", loaded.length === 1);
    ok("and the folder year wins", loaded[0].SEASON.year === 2026);
    ok(
      "its declarations don't leak to the page",
      typeof globalThis.SEASON === "undefined" && typeof globalThis.COACHES === "undefined"
    );
  }

  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ------------------------------------------------------------
   PART 2 — what tools/apply.js will accept
   ------------------------------------------------------------ */
function testValidate() {
  console.log("\n  What the runner accepts (tools/apply.js validate())\n");

  const { validate } = require("./apply");
  const base = { action: "rollover", league: "1star", year: 2026, confirm: true, actor: "Tester" };

  /* validate() calls die() on a rejection, which exits the process.
     Swapped for a throw so a rejection can be asserted rather than
     ending the test run at the first one. */
  const realExit = process.exit;
  const realErr = console.error;
  const tryValidate = (payload) => {
    process.exit = () => {
      throw new Error("REJECTED");
    };
    console.error = () => {};
    try {
      return { ok: true, value: validate(payload) };
    } catch (e) {
      return { ok: false, why: e.message };
    } finally {
      process.exit = realExit;
      console.error = realErr;
    }
  };

  const good = tryValidate({ ...base });
  ok("a well-formed rollover is accepted", good.ok, good.why);
  if (good.ok) {
    ok("the year survives validation", good.value.year === 2026);
    ok("force defaults to false", good.value.force === false);
    ok("no week is invented", good.value.week === undefined);
  }

  ok("force: true is carried through", tryValidate({ ...base, force: true }).value?.force === true);
  ok("an unconfirmed rollover is refused", !tryValidate({ ...base, confirm: false }).ok);
  ok("a missing year is refused", !tryValidate({ ...base, year: undefined }).ok);
  ok('a year sent as a string is refused', !tryValidate({ ...base, year: "2026" }).ok);
  ok("an unknown league is refused", !tryValidate({ ...base, league: "2star" }).ok);
  ok("a non-boolean force is refused", !tryValidate({ ...base, force: "yes" }).ok);
}

/* ------------------------------------------------------------
   PART 3 — the panel, in a real DOM
   ------------------------------------------------------------ */
const LEAGUE = "1star";

function leagueSourceAt(currentWeek, statusLine) {
  return read(`${LEAGUE}/league-data.js`)
    .replace(/^(\s*currentWeek:\s*)(?:"[A-Z]+"|\d+)(,)/m, `$1${JSON.stringify(currentWeek)}$2`)
    .replace(/^(\s*statusLine:\s*)"[^"]*"(,)/m, `$1${JSON.stringify(statusLine)}$2`);
}

async function open(JSDOM, VirtualConsole, currentWeek, statusLine, postseasonSrc) {
  const leagueSrc = leagueSourceAt(currentWeek, statusLine);
  const scheduleSrc = read(`${LEAGUE}/schedule-data.js`);

  let submitted = null;
  const virtualConsole = new VirtualConsole();
  const pageErrors = [];
  virtualConsole.on("jsdomError", (e) => pageErrors.push(e.message));

  const dom = new JSDOM(read("admin/index.html"), {
    runScripts: "outside-only",
    url: "https://ncaalegends.github.io/admin/",
    virtualConsole,
  });
  const w = dom.window;

  w.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("/whoami")) {
      return { ok: true, status: 200, json: async () => ({ name: "Tester", leagues: [LEAGUE] }) };
    }
    if (u.includes("/submit")) {
      submitted = JSON.parse(opts.body).payload;
      return { ok: true, status: 200, json: async () => ({ ok: true, queued: true }) };
    }
    if (u.includes("postseason-data.js")) {
      return { ok: true, text: async () => postseasonSrc ?? read(`${LEAGUE}/postseason-data.js`) };
    }
    if (u.includes("league-data.js")) return { ok: true, text: async () => leagueSrc };
    if (u.includes("schedule-data.js")) return { ok: true, text: async () => scheduleSrc };
    throw new Error(`unexpected fetch: ${u}`);
  };

  for (const f of ["people.js", "week-core.js", "score-core.js", "deadline.js", "admin/admin.js"]) {
    let src = read(f);
    if (f === "admin/admin.js") {
      src = src
        .replace("POLL_EVERY_MS = 5000", "POLL_EVERY_MS = 250")
        .replace("POLL_LIMIT_MS = 180000", "POLL_LIMIT_MS = 800");
    }
    w.eval(src);
  }

  const $ = (id) => w.document.getElementById(id);
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  $("code-input").value = "x".repeat(20);
  $("signin-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await settle(400);
  if ($("workspace").classList.contains("hidden")) throw new Error("sign-in didn't complete");

  return { w, $, settle, pageErrors, payload: () => submitted };
}

/* A postseason file with a played national championship in it, so
   the "season may not be over" note has a reason not to fire. */
const FINISHED_POSTSEASON = `const POSTSEASON = {
  rounds: [
    { id: "cfp-nc", label: "National Championship", games: [
      { home: "Ohio State", away: "Texas", neutral: true, homeScore: 31, awayScore: 24 },
    ]},
  ],
};`;

async function testPanel(JSDOM, VirtualConsole) {
  console.log("\n  Mid-season, with games still to play\n");
  {
    const { $, pageErrors } = await open(JSDOM, VirtualConsole, 8, "WEEK 8");
    ok("the rollover panel is not on the page", $("rollover-panel").classList.contains("hidden"));
    ok("no page errors", pageErrors.length === 0, pageErrors[0]);
  }

  console.log("\n  At Bowl Week 4, before the offseason advance\n");
  {
    const { $ } = await open(JSDOM, VirtualConsole, 19, "BOWL WEEK 4 (NATIONAL CHAMPIONSHIP)");
    ok(
      "still hidden — the offseason advance comes first",
      $("rollover-panel").classList.contains("hidden")
    );
  }

  console.log("\n  In the offseason hold, season finished cleanly\n");
  {
    const { w, $, settle, pageErrors, payload } = await open(
      JSDOM,
      VirtualConsole,
      "OFFSEASON",
      "OFFSEASON",
      FINISHED_POSTSEASON
    );
    await settle(150);

    ok("the panel appears", !$("rollover-panel").classList.contains("hidden"));
    ok("it names the archive folder", /1star\/seasons\/2026\//.test($("rollover-hint").textContent));
    ok("and the year it starts", /2027/.test($("rollover-hint").textContent));
    ok("there is nothing to warn about", $("rollover-notes").innerHTML === "");
    ok("so the button is live with no tick-box", $("rollover-btn").disabled === false);

    $("rollover-btn").dispatchEvent(new w.Event("click"));
    await settle(50);
    ok("the confirmation replaces the form", !$("rollover-confirm").classList.contains("hidden"));

    const text = $("rollover-confirm-text").textContent;
    ok("it says nothing is deleted", /Nothing is deleted/i.test(text));
    ok("it names both years", /2026/.test(text) && /2027/.test(text));
    ok("it says departed coaches are marked inactive", /inactive/i.test(text));

    $("rollover-yes").dispatchEvent(new w.Event("click"));
    await settle(250);

    const p = payload() || {};
    ok('the action is "rollover"', p.action === "rollover", JSON.stringify(p.action));
    ok("the league is sent", p.league === LEAGUE);
    ok("the year the page was looking at is sent", p.year === 2026, JSON.stringify(p.year));
    ok("confirm is true", p.confirm === true);
    ok("force is false when there was nothing to acknowledge", p.force === false);
    ok("no week is sent", p.week === undefined);
    ok("no page errors", pageErrors.length === 0, pageErrors[0]);
    await settle(900);
  }

  console.log("\n  In the offseason hold, with no championship recorded\n");
  {
    const { w, $, settle, payload } = await open(
      JSDOM,
      VirtualConsole,
      "OFFSEASON",
      "OFFSEASON",
      "const POSTSEASON = { rounds: [] };"
    );
    await settle(150);

    ok("the panel appears anyway", !$("rollover-panel").classList.contains("hidden"));
    ok("with a warning", /national championship/i.test($("rollover-notes").textContent));
    ok("and the button starts disabled", $("rollover-btn").disabled === true);

    $("rollover-btn").dispatchEvent(new w.Event("click"));
    await settle(50);
    ok(
      "clicking it while disabled does nothing",
      $("rollover-confirm").classList.contains("hidden")
    );

    $("rollover-ack").checked = true;
    $("rollover-ack").dispatchEvent(new w.Event("change"));
    ok("ticking the box enables it", $("rollover-btn").disabled === false);

    $("rollover-btn").dispatchEvent(new w.Event("click"));
    await settle(50);
    ok(
      "and the confirmation says it is going ahead despite the warning",
      /despite 1 warning/i.test($("rollover-confirm-text").textContent),
      $("rollover-confirm-text").textContent.slice(-120)
    );

    $("rollover-yes").dispatchEvent(new w.Event("click"));
    await settle(250);
    ok("force: true is what gets sent", (payload() || {}).force === true);
    await settle(900);
  }
}

async function main() {
  testFileSurgery();
  testValidate();

  let JSDOM, VirtualConsole;
  try {
    ({ JSDOM, VirtualConsole } = require("jsdom"));
  } catch (e) {
    console.error("\n  Skipping the DOM half — this test needs jsdom:\n    npm install jsdom\n");
    process.exit(failed ? 1 : 0);
  }
  await testPanel(JSDOM, VirtualConsole);

  console.log(failed ? `\n  ${failed} failed.\n` : "\n  All good.\n");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
