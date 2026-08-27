#!/usr/bin/env node
/* ============================================================
   TEST — the admin page's advance into the offseason
   ------------------------------------------------------------
     npm install jsdom          (once; local-only, see .gitignore)
     node tools/test-admin-offseason.js

   The offseason is the one value on the advance picker that isn't a
   number, and that is the whole reason this test exists. Every other
   week survives `Number(value)`; "OFFSEASON" turns into NaN, sails
   through as a week, and dies on the runner — after the confirmation
   has already told the commissioner it worked.

   The other half is the one that would rot silently: at Bowl Week 4
   the picker used to default to `Math.min(current + 1, 19)` — week
   19, the week the league is already on — so the button read as a
   no-op on the last night of the season. That default has no visible
   symptom other than being wrong, so it is asserted here.

   jsdom is local-only and not in CI, same as test-admin-paint.js.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.error("\n  This test needs jsdom, which is a local-only dependency:\n    npm install jsdom\n");
  process.exit(1);
}

const LEAGUE = "3star";

/* The page reads SEASON out of the published league-data.js, so a
   season state is set by rewriting those two lines in the real file
   rather than by hand-building a fake — the shape stays whatever the
   league actually ships. */
function leagueSourceAt(currentWeek, statusLine) {
  return read(`${LEAGUE}/league-data.js`)
    .replace(/^(\s*currentWeek:\s*)(?:"[A-Z]+"|\d+)(,)/m, `$1${JSON.stringify(currentWeek)}$2`)
    .replace(/^(\s*statusLine:\s*)"[^"]*"(,)/m, `$1${JSON.stringify(statusLine)}$2`);
}

async function open(currentWeek, statusLine) {
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
    if (u.includes("league-data.js")) return { ok: true, text: async () => leagueSrc };
    if (u.includes("schedule-data.js")) return { ok: true, text: async () => scheduleSrc };
    throw new Error(`unexpected fetch: ${u}`);
  };

  for (const f of ["people.js", "week-core.js", "score-core.js", "deadline.js", "admin/admin.js"]) {
    let src = read(f);
    if (f === "admin/admin.js") {
      /* The publish wait never resolves here — nothing republishes the
         file — so it is shortened to keep the test quick. Behaviour is
         not patched. */
      src = src.replace("POLL_EVERY_MS = 5000", "POLL_EVERY_MS = 250")
               .replace("POLL_LIMIT_MS = 180000", "POLL_LIMIT_MS = 800");
    }
    w.eval(src);
  }

  const $ = (id) => w.document.getElementById(id);
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  $("code-input").value = "x".repeat(20);
  $("signin-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await settle(300);
  if ($("workspace").classList.contains("hidden")) throw new Error("sign-in didn't complete");

  return { w, $, settle, pageErrors, payload: () => submitted };
}

let failed = 0;
const ok = (name, cond, detail) => {
  console.log(`    ${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : ` — ${detail}`}`);
  if (!cond) failed++;
};
const values = (sel) => Array.from(sel.options).map((o) => o.value);

async function main() {
  console.log("\n  At Bowl Week 4 (the national championship)\n");
  {
    const { w, $, settle, pageErrors, payload } = await open(19, "BOWL WEEK 4 (NATIONAL CHAMPIONSHIP)");

    ok("advance picker offers the offseason", values($("advance-week")).includes("OFFSEASON"));
    ok(
      "and defaults to it, not to the week already showing",
      $("advance-week").value === "OFFSEASON",
      `defaulted to ${$("advance-week").value}`
    );
    ok("score picker does NOT offer it", !values($("week-select")).includes("OFFSEASON"));

    /* No deadline entered — the offseason is the one advance that
       may leave the badge blank. */
    $("advance-date").value = "";
    $("advance-btn").dispatchEvent(new w.Event("click"));
    await settle(50);

    const confirmVisible = !$("advance-confirm").classList.contains("hidden");
    ok("a blank deadline still reaches the confirmation", confirmVisible);
    const text = $("advance-confirm-text").textContent;
    ok("the confirmation describes the hold, not a week of games", /Offseason/i.test(text) && !/head-to-head/.test(text), text.slice(0, 80));
    ok("and says the badge will be hidden", /deadline badge is hidden|No deadline/i.test(text));

    $("advance-yes").dispatchEvent(new w.Event("click"));
    await settle(200);

    const p = payload() || {};
    ok("the sentinel is sent as a string, not NaN", p.week === "OFFSEASON", JSON.stringify(p.week));
    ok('an empty deadline is sent as "" (a deliberate clear)', p.nextAt === "", JSON.stringify(p.nextAt));
    ok("no page errors", pageErrors.length === 0, pageErrors[0]);
    await settle(900);
  }

  console.log("\n  During the offseason hold\n");
  {
    const { $, pageErrors } = await open("OFFSEASON", "OFFSEASON");
    ok(
      'the header reads "OFFSEASON", not the week it coerces to',
      /OFFSEASON/.test($("current-week").textContent) && !/BOWL WEEK/.test($("current-week").textContent),
      $("current-week").textContent
    );
    ok("the score picker still lands on a real week", $("week-select").value === "19");
    ok("no page errors", pageErrors.length === 0, pageErrors[0]);
  }

  console.log(failed ? `\n  ${failed} failed.\n` : "\n  All good.\n");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
