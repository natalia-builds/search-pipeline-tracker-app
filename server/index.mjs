// Starts the local server: `npm start` (or `npm run dev` while developing).
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createApp } from "./app.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The port comes from `--port 4400`, or the PORT setting, or defaults to 4321.
const flag = process.argv.indexOf("--port");
const port = Number(flag > -1 ? process.argv[flag + 1] : process.env.PORT) || 4321;
const dataDir = resolve(process.env.SPT_DATA_DIR || join(root, "data"));

const server = createApp({ dataDir, distDir: join(root, "dist") });
server.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `Port ${port} is already in use. Is the tracker already running? Or start it on another port: PORT=4400 npm start` : e);
  process.exit(1);
});
// 127.0.0.1 means "this computer only".
server.listen(port, "127.0.0.1", () => {
  console.log(`Job Search Tracker is running at http://localhost:${port}`);
  console.log(`Your data is saved in ${join(dataDir, "tracker.sqlite")}`);
  console.log("Press Ctrl+C to stop.");
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
