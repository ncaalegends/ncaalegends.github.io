#!/usr/bin/env node
/* ============================================================
   SERVE — preview the site locally, the way GitHub Pages sees it
   ------------------------------------------------------------
   Opening index.html straight off the disk does NOT work, and fails
   in two ways that look like site bugs but aren't:

     1. file:// has no notion of a directory index, so a link to
        "main/" shows a folder listing instead of main/index.html
     2. fetch() is blocked on file:// origins, so the landing page
        can't read each league's data file and every card falls back
        to "Unavailable". logo-check.html breaks the same way.

   This serves the repo over http on localhost, which resolves both
   and matches how GitHub Pages actually behaves.

   USAGE
     node tools/serve.js            then open http://localhost:8080
     node tools/serve.js --port 3000

   Node's built-in http + fs only. No dependencies, no network
   access needed, nothing to install.
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const portArg = process.argv.indexOf("--port");
const PORT = portArg !== -1 ? Number(process.argv[portArg + 1]) : 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  /* Resolve inside ROOT and verify the result is still inside ROOT.
     Without this check a request for /../../etc/passwd would escape
     the repo — this server only ever binds to localhost, but a path
     traversal hole is not worth leaving open regardless. */
  let file = path.resolve(ROOT, "." + url);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  // Directory -> index.html, which is the bit file:// can't do.
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }

  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>404</h1><p>No file at <code>${url}</code></p>`);
    console.log(`  404  ${url}`);
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    // Always revalidate: you're editing these files as you look at them.
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(
      `\n  Port ${PORT} is already in use.` +
        `\n  Something else is running there — try: node tools/serve.js --port 8081\n`
    );
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  console.log(`
  NCAA Legends — local preview

    http://localhost:${PORT}/          league picker
    http://localhost:${PORT}/main/     Main Dynasty
    http://localhost:${PORT}/3star/    3-Star Dynasty
    http://localhost:${PORT}/1star/    1-Star Dynasty
    http://localhost:${PORT}/logo-check.html

  Serving ${ROOT}
  Ctrl+C to stop.
`);
});
