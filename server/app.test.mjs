import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, openDatabase } from "./app.mjs";

let dir, server, port;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "spt-test-"));
  mkdirSync(join(dir, "dist", "_astro"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<h1>app</h1>");
  writeFileSync(join(dir, "secret.txt"), "do not serve");
  server = createApp({ dataDir: join(dir, "data"), distDir: join(dir, "dist") });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});

afterEach(async () => {
  await new Promise((r) => server.close(r));
  rmSync(dir, { recursive: true, force: true });
});

/** Raw HTTP, so tests can send odd Host headers and paths that fetch() would tidy up. */
function call(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers: { Host: `localhost:${port}`, ...headers } }, (res) => {
      let text = "";
      res.on("data", (c) => (text += c));
      res.on("end", () => resolve({ status: res.statusCode, text, json: () => JSON.parse(text), headers: res.headers }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}
const api = { "X-SPT": "1", "Content-Type": "application/json" };
const lib = (extra = {}) => ({ schema: 1, versions: [], ...extra });

describe("saving and loading", () => {
  it("starts empty", async () => {
    const r = await call("GET", "/api/library", { headers: api });
    expect(r.status).toBe(200);
    expect(r.json()).toMatchObject({ rev: 0, library: null });
  });

  it("saves a library and reads it back", async () => {
    const put = await call("PUT", "/api/library", { headers: api, body: { baseRev: 0, library: lib({ note: "hi" }) } });
    expect(put.status).toBe(200);
    expect(put.json().rev).toBe(1);
    const got = (await call("GET", "/api/library", { headers: api })).json();
    expect(got.rev).toBe(1);
    expect(got.library.note).toBe("hi");
  });

  it("refuses a save made from an out-of-date copy, and keeps the newer data", async () => {
    await call("PUT", "/api/library", { headers: api, body: { baseRev: 0, library: lib({ note: "first" }) } });
    await call("PUT", "/api/library", { headers: api, body: { baseRev: 1, library: lib({ note: "second" }) } });
    const stale = await call("PUT", "/api/library", { headers: api, body: { baseRev: 1, library: lib({ note: "stale" }) } });
    expect(stale.status).toBe(409);
    expect((await call("GET", "/api/library", { headers: api })).json().library.note).toBe("second");
  });

  it("rejects things that aren't a library", async () => {
    for (const body of ["not json", { baseRev: 0, library: [] }, { baseRev: 0, library: { versions: [] } }, { library: lib() }, { baseRev: "0", library: lib() }]) {
      const r = await call("PUT", "/api/library", { headers: api, body });
      expect(r.status).toBe(400);
    }
    expect((await call("GET", "/api/library", { headers: api })).json().library).toBeNull();
  });

  it("rejects an oversized body", async () => {
    const big = JSON.stringify({ baseRev: 0, library: lib({ pad: "x".repeat(11 * 1024 * 1024) }) });
    const r = await call("PUT", "/api/library", { headers: api, body: big }).catch((e) => ({ status: e.code }));
    expect([413, "ECONNRESET", "EPIPE"]).toContain(r.status);
  });

  it("keeps one snapshot of the previous library per day", () => {
    const db = openDatabase(join(dir, "snap"));
    expect(db.write(JSON.stringify(lib({ v: 1 })), 0)).toBe(1);
    expect(db.write(JSON.stringify(lib({ v: 2 })), 1)).toBe(2);
    expect(db.write(JSON.stringify(lib({ v: 3 })), 2)).toBe(3);
    db.close();
    // Open the file directly: the first overwrite of the day is the one that is kept.
    // Close it afterwards: Windows can't delete the temporary folder while a database file is still open.
    const check = new (require_sqlite())(join(dir, "snap", "tracker.sqlite"));
    let snaps;
    try {
      snaps = check.prepare("SELECT json FROM snapshots").all();
    } finally {
      check.close();
    }
    expect(snaps).toHaveLength(1);
    expect(JSON.parse(snaps[0].json).v).toBe(1);
  });

  it("sets aside data the app couldn't read", async () => {
    const r = await call("POST", "/api/aside", { headers: api, body: { text: "{broken" } });
    expect(r.status).toBe(200);
    expect((await call("POST", "/api/aside", { headers: api, body: { nope: 1 } })).status).toBe(400);
  });
});

describe("keeping other websites out", () => {
  it("requires the app's header", async () => {
    expect((await call("GET", "/api/library")).status).toBe(403);
    expect((await call("PUT", "/api/library", { headers: { "Content-Type": "text/plain" }, body: { baseRev: 0, library: lib() } })).status).toBe(403);
  });

  it("rejects a Host that isn't this computer (DNS rebinding)", async () => {
    expect((await call("GET", "/api/library", { headers: { ...api, Host: "evil.example.com" } })).status).toBe(403);
    expect((await call("GET", "/", { headers: { Host: "evil.example.com" } })).status).toBe(403);
  });

  it("rejects a request from a page on another address", async () => {
    expect((await call("GET", "/api/library", { headers: { ...api, Origin: "https://evil.example.com" } })).status).toBe(403);
    expect((await call("GET", "/api/library", { headers: { ...api, Origin: `http://localhost:${port}` } })).status).toBe(200);
  });

  it("never sends cross-site permission headers", async () => {
    const r = await call("GET", "/api/library", { headers: api });
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("serving the app", () => {
  it("serves the page", async () => {
    const r = await call("GET", "/");
    expect(r.status).toBe(200);
    expect(r.text).toBe("<h1>app</h1>");
    expect(r.headers["content-type"]).toMatch(/text\/html/);
  });

  it("returns 404 for missing files", async () => {
    expect((await call("GET", "/nope.js")).status).toBe(404);
  });

  it("won't serve files outside the app folder", async () => {
    for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt", "/_astro/../../secret.txt", "/%00"]) {
      const r = await call("GET", path);
      expect(r.text).not.toContain("do not serve");
      expect([400, 403, 404]).toContain(r.status);
    }
  });
});

import { createRequire } from "node:module";
function require_sqlite() {
  return createRequire(import.meta.url)("node:sqlite").DatabaseSync;
}
