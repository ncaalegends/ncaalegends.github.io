#!/usr/bin/env node
/* ============================================================
   TEST — the admin page's optimistic paint
   ------------------------------------------------------------
     npm install jsdom          (once; local-only, see .gitignore)
     node tools/test-admin-paint.js

   When a commissioner hits Send, the page now shows the scores as
   saved straight away, marked SAVING, and waits for the published
   file to confirm them. That paint is a claim the page hasn't
   earned yet, so the interesting behaviour isn't the happy path —
   it's what happens when the claim turns out to be wrong.

   THE FAILURE PATH IS THE POINT
   An optimistic paint that survives a failed save is worse than no
   paint at all: it turns "did that work?" into "it said it worked",
   which is how a week's scores go missing and nobody notices until
   the standings look wrong. So the case worth a test is the one
   where the site never publishes — the paint has to come off, the
   row has to become enterable again, and the numbers the user typed
   have to still be in the boxes.

   None of that is visible in normal use, because it only happens
   when something else has already gone wrong. That's exactly the
   kind of code that rots quietly, hence a test.

   HOW IT WORKS
   The real admin/index.html and admin/admin.js are loaded into
   jsdom with fetch stubbed: the Worker always accepts, and the
   "published" schedule-data.js either updates or doesn't, depending
   on the scenario. Nothing is mocked inside the page itself.

   jsdom is a local-only dependency and deliberately not in the
   repo (see the node_modules note in .gitignore), so this test does
   not run in CI and isn't meant to.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (e) {
  console.error(
    "\n  This test needs jsdom, which is a local-only dependency:\n" +
      "    npm install jsdom\n"
  );
  process.exit(1);
}

const { applyScoresToSource, resolveEntries } = require("../score-core");

const LEAGUE = "1star";

/* ------------------------------------------------------------
   ONE RUN OF THE PAGE
   ------------------------------------------------------------
     publishes  true  — the site catches up, as it does normally
                false — it never does, and the paint must come off
     h2h        prefer a coach-vs-coach game (two schedule rows get
                written, not one) over a CPU game
   ------------------------------------------------------------ */
async function run({ publishes, h2h }) {
  const scheduleSrc = read(`${LEAGUE}/schedule-data.js`);
  const leagueSrc = read(`${LEAGUE}/league-data.js`);

  let submitted = null;
  let publishedText = scheduleSrc;

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
    if (u.includes("schedule-data.js")) return { ok: true, text: async () => publishedText };
    throw new Error(`unexpected fetch: ${u}`);
  };

  /* The page waits up to three minutes for the site in real use.
     Only those two constants are rewritten, and only so the test
     finishes — no behaviour is patched. */
  for (const f of ["people.js", "week-core.js", "score-core.js", "deadline.js", "admin/admin.js"]) {
    let src = read(f);
    if (f === "admin/admin.js") {
      src = src
        .replace("POLL_EVERY_MS = 5000", "POLL_EVERY_MS = 250")
        .replace("POLL_LIMIT_MS = 180000", "POLL_LIMIT_MS = 2500");
    }
    w.eval(src);
  }

  const $ = (id) => w.document.getElementById(id);
  const listText = () => $("games").textContent.replace(/\s+/g, " ");
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  $("code-input").value = "x".repeat(20);
  $("signin-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await settle(300);

  if ($("workspace").classList.contains("hidden")) throw new Error("sign-in didn't complete");

  /* Find a week that still has something to enter. */
  const sel = $("week-select");
  const pickRow = () =>
    (h2h && w.document.querySelector(".game.is-league [data-inputs]")) ||
    w.document.querySelector("[data-inputs]");

  let week = null;
  for (const o of sel.options) {
    sel.value = o.value;
    sel.dispatchEvent(new w.Event("change"));
    if (pickRow()) {
      week = Number(o.value);
      break;
    }
  }
  if (week === null) throw new Error("no week with an unscored game");

  const idx = pickRow().getAttribute("data-inputs");
  const row = w.document.querySelector(`[data-inputs="${idx}"]`);
  row.querySelector('[data-side="team"]').value = "27";
  row.querySelector('[data-side="opp"]').value = "24";

  $("save-scores").dispatchEvent(new w.Event("click"));
  await settle(200);

  const duringSave = {
    saving: listText().includes("SAVING"),
    inSavingGroup: /Saving 1/.test(listText()),
    editOffered: !!w.document.querySelector(".is-pending .lock"),
  };

  /* Let the "published" file catch up, or don't. */
  if (publishes) {
    const D = new w.Function(`
      ${leagueSrc}
      ${scheduleSrc}
      return {
        SEASON: typeof SEASON !== "undefined" ? SEASON : {},
        COACHES: typeof COACHES !== "undefined" ? COACHES : [],
        LEAGUE_INFO: typeof LEAGUE_INFO !== "undefined" ? LEAGUE_INFO : {},
        TEAM_SCHEDULES: typeof TEAM_SCHEDULES !== "undefined" ? TEAM_SCHEDULES : [],
        ALIASES: typeof SCHEDULE_TEAM_ALIASES !== "undefined" ? SCHEDULE_TEAM_ALIASES : {}
      };`)();
    const games = w.WeekCore.scoreableGames(w.WeekCore.buildWeek(D, week));
    const { edits } = resolveEntries(submitted.entries, games, week, D, false);
    publishedText = applyScoresToSource(scheduleSrc, edits).text;
  }

  await settle(3000);

  const after = w.document.querySelector(`[data-inputs="${idx}"]`);
  const result = {
    duringSave,
    submitted: submitted && submitted.entries,
    stillSaving: listText().includes("SAVING"),
    enterableAgain: !!after,
    keptTyping: after
      ? `${after.querySelector('[data-side="team"]').value}-${after.querySelector('[data-side="opp"]').value}`
      : null,
    message: $("scores-msg").textContent.trim(),
    pageErrors,
  };

  dom.window.close();
  return result;
}

/* ------------------------------------------------------------
   EXPECTATIONS
   ------------------------------------------------------------ */
let failed = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`    ${ok ? "ok  " : "FAIL"}  ${label}${ok ? "" : `  (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`}`);
}

(async () => {
  for (const h2h of [true, false]) {
    const kind = h2h ? "coach-vs-coach" : "CPU";

    console.log(`\n  ${kind} · the site publishes`);
    let r = await run({ publishes: true, h2h });
    check("painted as SAVING on send", r.duringSave.saving, true);
    check("kept out of the collapsed Entered section", r.duringSave.inSavingGroup, true);
    check("no Edit button while in flight", r.duringSave.editOffered, false);
    check("SAVING cleared once confirmed", r.stillSaving, false);
    check("row is no longer enterable", r.enterableAgain, false);
    check("said it's live", /recorded and live/.test(r.message), true);
    check("no page errors", r.pageErrors.length, 0);

    console.log(`\n  ${kind} · the site never publishes`);
    r = await run({ publishes: false, h2h });
    check("painted as SAVING on send", r.duringSave.saving, true);
    check("paint comes back off", r.stillSaving, false);
    check("row is enterable again", r.enterableAgain, true);
    check("the typed scores survived", r.keptTyping, "27-24");
    check("did not claim success", /recorded and live/.test(r.message), false);
    check("said it couldn't confirm", /hasn't updated/.test(r.message), true);
    check("no page errors", r.pageErrors.length, 0);
  }

  console.log(failed ? `\n  ${failed} failed\n` : "\n  All good.\n");
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("\n  Test harness broke:", e.message, "\n");
  process.exit(1);
});
