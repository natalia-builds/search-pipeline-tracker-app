// `npm run dev`: runs the local server (port 4322) and the app's live-reloading dev page (port 4321)
// together. Open http://localhost:4321. The dev page forwards /api requests to the server.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const astro = join(root, "node_modules", "astro", "bin", "astro.mjs");
const run = (args, env = {}) => spawn(process.execPath, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

const api = run(["--disable-warning=ExperimentalWarning", join(root, "server", "index.mjs")], { PORT: "4322" });
const web = run([astro, "dev", "--port", "4321"]);

const stop = () => {
  api.kill();
  web.kill();
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, stop);
api.on("exit", (c) => c && (stop(), process.exit(c)));
web.on("exit", (c) => (stop(), process.exit(c ?? 0)));
