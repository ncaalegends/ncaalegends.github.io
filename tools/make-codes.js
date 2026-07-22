#!/usr/bin/env node
/* ============================================================
   MAKE-CODES — generate the ACCESS_CODES secret
   ------------------------------------------------------------
   Builds the JSON that goes into the Worker's ACCESS_CODES
   variable, one entry per person. Asks for a name, asks which
   leagues they run, repeats until you're done, then prints the
   JSON on one line ready to paste.

     node tools/make-codes.js

   Can also add someone to an existing set: paste your current
   ACCESS_CODES when it asks, and the new people are merged in
   with everyone's existing codes left alone.

   NOTHING IS WRITTEN TO DISK. The output is a secret — anyone
   holding a code can post scores as that person. It goes to the
   screen, you paste it into Cloudflare, you close the window.
   Writing it to a file in this repo would be one `git add -A`
   away from being published.

   Setup context: worker/ADMIN-SETUP.md, step 2.
   ============================================================ */

const crypto = require("crypto");
const readline = require("readline");

/* ------------------------------------------------------------
   ALPHABET
   ------------------------------------------------------------
   Crockford-style base32: no 0/O, no 1/I/L, no U. The admin page
   deliberately doesn't remember the code between refreshes, so
   these get typed by hand more than once, sometimes on a phone.
   An alphabet where O and 0 are distinguishable is worth more
   here than a few extra bits of entropy.

   20 characters from a 30-symbol alphabet is about 98 bits, which
   is far past anything brute-forceable at any request rate.
   Grouped in fives with dashes purely so they're readable when
   someone is copying one out of a message.
   ------------------------------------------------------------ */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 20;
const GROUP = 5;

function makeCode() {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    /* randomInt is rejection-sampled, so every symbol is equally
       likely. randomBytes()%30 would quietly favour the first
       symbols in the alphabet. */
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out.match(new RegExp(`.{1,${GROUP}}`, "g")).join("-");
}

const LEAGUE_CHOICES = {
  1: { slugs: ["1star"], label: "1-Star only" },
  2: { slugs: ["3star"], label: "3-Star only" },
  3: { slugs: ["1star", "3star"], label: "both leagues" },
};

/* main is intentionally absent. tools/apply.js hardcodes the
   leagues it will act on, so a code listing main would be
   rejected anyway — better not to offer it than to hand out
   something that silently fails. */

/* ------------------------------------------------------------
   PROMPTS
   ------------------------------------------------------------
   Reading through the interface's async iterator rather than
   rl.question(). They behave the same at a real terminal, but
   with piped input question() drops every line that arrives while
   no callback happens to be pending — so `echo ... | make-codes`
   silently answered the first question and treated everything
   after it as end-of-input. The iterator buffers properly, which
   makes the script testable and makes a mistyped redirect fail
   visibly instead of producing one empty run.
   ------------------------------------------------------------ */
function makeAsk(rl) {
  const lines = rl[Symbol.asyncIterator]();
  return async function ask(q) {
    process.stdout.write(q);
    const { value, done } = await lines.next();
    if (done) return "";
    /* Echo the answer when input isn't a terminal, so a piped run
       produces a readable transcript instead of bare prompts. */
    if (!process.stdin.isTTY) process.stdout.write(`${value}\n`);
    return String(value).trim();
  };
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = makeAsk(rl);

  console.log(`
  ============================================
   ACCESS CODES
  ============================================

  One code per person. Not one per league — a person with two
  leagues gets a single code covering both, so the commit history
  can say who made each change.
`);

  let codes = {};

  const existing = await ask(
    `  Adding to an existing set? Paste the current ACCESS_CODES JSON,\n` +
      `  or press Enter to start fresh:\n\n  > `
  );

  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      codes = parsed;
      console.log(`\n  Loaded ${Object.keys(codes).length} existing code(s).`);
    } catch (e) {
      console.error(
        `\n  ERROR: that isn't valid JSON — ${e.message}\n` +
          `  Copy the whole value including the outer { }. Nothing was changed.\n`
      );
      rl.close();
      process.exit(1);
    }
  }

  const fresh = [];

  for (;;) {
    console.log("");
    const name = await ask(`  Name (blank when you're done): `);
    if (!name) break;

    /* The name lands in commit messages and the Actions log. The
       same allowlist apply.js enforces on the actor field, so a
       name that would be rejected later is caught now. */
    if (!/^[\p{L}\p{N} .,:;·—–\-()&/'+!?]+$/u.test(name)) {
      console.log(`  Letters, numbers and basic punctuation only. Try again.`);
      continue;
    }
    if (name.length > 120) {
      console.log(`  That's too long — keep it under 120 characters.`);
      continue;
    }

    let choice = "";
    while (!LEAGUE_CHOICES[choice]) {
      choice = await ask(`  Which leagues?  [1] 1-Star  [2] 3-Star  [3] Both : `);
      if (!LEAGUE_CHOICES[choice]) console.log(`  Enter 1, 2 or 3.`);
    }

    const code = makeCode();
    codes[code] = { name, leagues: LEAGUE_CHOICES[choice].slugs };
    fresh.push({ name, code, label: LEAGUE_CHOICES[choice].label });

    console.log(`  Added ${name} — ${LEAGUE_CHOICES[choice].label}.`);
  }

  rl.close();

  if (!fresh.length) {
    console.log(`\n  Nobody added. Nothing to do.\n`);
    return;
  }

  const total = Object.keys(codes).length;

  console.log(`
  ============================================================
   1. PASTE THIS INTO CLOUDFLARE
  ============================================================
   Worker -> Settings -> Variables and Secrets
   Name:  ACCESS_CODES        Type:  Secret
   Value: everything on the single line below

`);
  console.log(JSON.stringify(codes));

  console.log(`
  ============================================================
   2. SEND EACH PERSON THEIR OWN CODE
  ============================================================
`);
  fresh.forEach((p) => {
    console.log(`   ${p.name}  (${p.label})`);
    console.log(`   ${p.code}\n`);
  });

  console.log(`  ------------------------------------------------------------
  ${total} code(s) total${existing ? ` (${total - fresh.length} carried over)` : ""}.

  Send each person only their own code. They sign in at
  https://ncaalegends.github.io/admin/ — nothing to install.

  Redeploy the Worker after pasting, or the new codes won't
  work yet.

  This was NOT saved anywhere. Close this window when you're
  done, and don't paste the JSON into the repo or a chat.
  ------------------------------------------------------------
`);
}

main().catch((e) => {
  console.error(`\n  ERROR: ${e.message}\n`);
  process.exit(1);
});
