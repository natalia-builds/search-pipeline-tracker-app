// `npm start`: builds the app the first time (or if you ask with --rebuild), then runs the server.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(root, "dist", "index.html")) || process.argv.includes("--rebuild")) {
  console.log("Building the app (this only happens the first time)...");
  const astro = join(root, "node_modules", "astro", "bin", "astro.mjs");
  const r = spawnSync(process.execPath, [astro, "build"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
await import("../server/index.mjs");
