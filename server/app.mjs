// The local server. It does two jobs:
//   1. Serves the built app (the files in dist/) to your browser.
//   2. Saves and loads your library in a SQLite file on your own disk.
//
// It only listens on 127.0.0.1, so nothing outside this computer can reach it, and it rejects
// requests that didn't come from the app itself (see `guard`).
import { createServer } from "node:http";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { extname, join, normalize, resolve, sep } from "node:path";

const MAX_BODY = 10 * 1024 * 1024; // 10 MB is far more than any job search needs
const KEEP_SNAPSHOTS = 30;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** Opens (or creates) the database file and returns the few operations the app needs. */
export function openDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, "tracker.sqlite"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    -- The whole library is one JSON document. "rev" counts saves, so two open windows can't
    -- silently overwrite each other.
    CREATE TABLE IF NOT EXISTS library (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      rev INTEGER NOT NULL,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    -- A safety net: one copy per day of the previous library, kept for a month.
    CREATE TABLE IF NOT EXISTS snapshots (
      day TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    -- Saved data the app couldn't read. Kept so it's never lost, even though it can't be loaded.
    CREATE TABLE IF NOT EXISTS aside (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  const setAside = db.prepare("INSERT INTO aside (text, created_at) VALUES (?, ?)");
  const get = db.prepare("SELECT rev, json, updated_at FROM library WHERE id = 1");
  const insert = db.prepare("INSERT INTO library (id, rev, json, updated_at) VALUES (1, 1, ?, ?)");
  const update = db.prepare("UPDATE library SET rev = rev + 1, json = ?, updated_at = ? WHERE id = 1 AND rev = ?");
  const snap = db.prepare("INSERT OR IGNORE INTO snapshots (day, json, created_at) VALUES (?, ?, ?)");
  const prune = db.prepare("DELETE FROM snapshots WHERE day NOT IN (SELECT day FROM snapshots ORDER BY day DESC LIMIT ?)");

  return {
    read() {
      const row = get.get();
      return row ? { rev: row.rev, json: row.json, updatedAt: row.updated_at } : null;
    },
    /** Saves `json` if `baseRev` is still the latest revision. Returns the new revision, or null on a conflict. */
    write(json, baseRev) {
      const now = new Date().toISOString();
      const current = get.get();
      if (!current) {
        if (baseRev !== 0) return null;
        insert.run(json, now);
        return 1;
      }
      if (current.rev !== baseRev) return null;
      snap.run(now.slice(0, 10), current.json, now);
      prune.run(KEEP_SNAPSHOTS);
      update.run(json, now, baseRev);
      return baseRev + 1;
    },
    aside: (text) => setAside.run(text, new Date().toISOString()),
    close: () => db.close(),
  };
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== "string" && !Buffer.isBuffer(body);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(isJson ? { "Content-Type": "application/json; charset=utf-8" } : {}),
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

const hostName = (host) => String(host || "").replace(/:\d+$/, "").toLowerCase();
const isLocalHost = (h) => h === "localhost" || h === "127.0.0.1" || h === "[::1]";

/**
 * Keeps other websites out. A page you happen to have open could try to talk to this server.
 *  - The Host check blocks "DNS rebinding" (a web address that secretly points at your computer).
 *  - The Origin check blocks requests made by a page on a different address.
 *  - The custom header can't be sent cross-site without the browser asking permission first,
 *    and this server never grants it.
 */
function guard(req) {
  if (!isLocalHost(hostName(req.headers.host))) return "Unexpected Host.";
  const origin = req.headers.origin;
  if (origin) {
    let o;
    try {
      o = new URL(origin);
    } catch {
      return "Bad Origin.";
    }
    if (o.host !== req.headers.host) return "Unexpected Origin.";
  }
  return null;
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Too large."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleApi(req, res, store, pathname) {
  if (req.headers["x-spt"] !== "1") return send(res, 403, { error: "Missing app header." });

  if (pathname === "/api/aside") {
    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." }, { Allow: "POST" });
    try {
      const text = JSON.parse(await readBody(req))?.text;
      if (typeof text !== "string") throw new Error("no text");
      store.aside(text);
      return send(res, 200, { ok: true });
    } catch (e) {
      return send(res, e.status === 413 ? 413 : 400, { error: "Couldn't set that aside." });
    }
  }

  if (req.method === "GET") {
    const row = store.read();
    return send(res, 200, row ? { rev: row.rev, updatedAt: row.updatedAt, library: JSON.parse(row.json) } : { rev: 0, updatedAt: null, library: null });
  }

  if (req.method === "PUT") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      if (e.status === 413) return send(res, 413, { error: "That's too big to save." });
      return send(res, 400, { error: "That isn't valid JSON." });
    }
    const lib = body?.library;
    if (typeof lib !== "object" || lib === null || Array.isArray(lib) || typeof lib.schema !== "number" || !Number.isInteger(body.baseRev) || body.baseRev < 0) {
      return send(res, 400, { error: "That isn't a tracker library." });
    }
    const rev = store.write(JSON.stringify(lib), body.baseRev);
    if (rev === null) return send(res, 409, { error: "This was changed in another window. Reload the page to get the latest, then redo your change." });
    return send(res, 200, { rev });
  }

  return send(res, 405, { error: "Method not allowed." }, { Allow: "GET, PUT" });
}

function serveStatic(req, res, distDir) {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    return send(res, 400, "Bad request");
  }
  if (path.includes("\0")) return send(res, 400, "Bad request");
  const root = resolve(distDir);
  let file = resolve(root, "." + normalize("/" + path));
  // Never serve anything outside dist/.
  if (file !== root && !file.startsWith(root + sep)) return send(res, 403, "Forbidden");
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return send(res, 404, "Not found");
  const type = TYPES[extname(file)] || "application/octet-stream";
  // Built files have fingerprinted names, so they can be cached; the page itself must stay fresh.
  const cache = path.startsWith("/_astro/") ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
  if (req.method === "HEAD") return res.end();
  res.end(readFileSync(file));
}

/** Builds the server. Call `.listen(port, "127.0.0.1")` on the result. */
export function createApp({ dataDir, distDir }) {
  const store = openDatabase(dataDir);
  const server = createServer(async (req, res) => {
    try {
      const blocked = guard(req);
      if (blocked) return send(res, 403, { error: blocked });
      const pathname = new URL(req.url, "http://x").pathname;
      if (pathname === "/api/library" || pathname === "/api/aside") return await handleApi(req, res, store, pathname);
      return serveStatic(req, res, distDir);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) send(res, 500, { error: "Something went wrong on the server." });
      else res.end();
    }
  });
  server.on("close", () => store.close());
  return server;
}
