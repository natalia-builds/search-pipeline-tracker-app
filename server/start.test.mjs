import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "./start.mjs";

let dir, running;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "spt-start-test-"));
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<h1>app</h1>");
  running = [];
});

afterEach(async () => {
  for (const app of running) await app.close();
  rmSync(dir, { recursive: true, force: true });
});

/** Starts a server on any free port, with its own data folder, and remembers it for cleanup. */
async function start(extra = {}) {
  const app = await startServer({ port: 0, dataDir: join(dir, "data"), distDir: join(dir, "dist"), ...extra });
  running.push(app);
  return app;
}

describe("startServer", () => {
  it("picks a free port when asked for port 0 and reports it", async () => {
    const app = await start();
    expect(app.port).toBeGreaterThan(0);
    expect(app.server.address().port).toBe(app.port);
  });

  it("listens on this computer only", async () => {
    const app = await start();
    expect(app.server.address().address).toBe("127.0.0.1");
  });

  it("serves the page and the library", async () => {
    const app = await start();
    const page = await fetch(`http://127.0.0.1:${app.port}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toBe("<h1>app</h1>");
    const api = await fetch(`http://127.0.0.1:${app.port}/api/library`, { headers: { "X-SPT": "1" } });
    expect(api.status).toBe(200);
    expect(await api.json()).toMatchObject({ rev: 0, library: null });
  });

  it("still refuses requests without the app header", async () => {
    const app = await start();
    const r = await fetch(`http://127.0.0.1:${app.port}/api/library`);
    expect(r.status).toBe(403);
  });

  it("keeps its data in the folder it was given", async () => {
    const dataDir = join(dir, "somewhere", "else");
    await start({ dataDir });
    expect(existsSync(join(dataDir, "tracker.sqlite"))).toBe(true);
  });

  it("close() stops the server, and can be called twice", async () => {
    const app = await start();
    await app.close();
    await app.close();
    expect(app.server.listening).toBe(false);
    await expect(fetch(`http://127.0.0.1:${app.port}/`)).rejects.toThrow();
  });

  it("uses the port it was given", async () => {
    const first = await start();
    await first.close();
    const second = await start({ port: first.port }); // the port was just freed
    expect(second.port).toBe(first.port);
  });

  it("rejects with EADDRINUSE when the port is taken", async () => {
    const first = await start();
    await expect(start({ port: first.port, dataDir: join(dir, "other-data") })).rejects.toMatchObject({ code: "EADDRINUSE" });
  });
});
