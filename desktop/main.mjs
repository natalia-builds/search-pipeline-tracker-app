// The desktop shell: starts the local server on a free port and shows the app in a window.
// `npm run desktop` builds the screens and runs this. The page gets no access to Node: all it
// can do is talk to the local server, exactly as it does in a browser.
import { app, BrowserWindow, dialog, session, shell } from "electron";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { startServer } from "../server/start.mjs";
import { desktopDataDir } from "./dataDir.mjs";
import { appOrigin, isAppUrl, isWebLink } from "./urls.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

let running; // { server, port, close } once the server is up
let quitting = false;

const openInBrowser = (url) => {
  if (isWebLink(url)) shell.openExternal(url);
};

// Applies to every page the app ever creates, before it loads anything.
app.on("web-contents-created", (_event, contents) => {
  // Links that want a new window (like "Job posting") open in the person's own browser instead.
  contents.setWindowOpenHandler(({ url }) => {
    openInBrowser(url);
    return { action: "deny" };
  });
  // The window never leaves the app's own address. Other addresses open in the default browser.
  const stayInApp = (event, url) => {
    if (!isAppUrl(url, running.port)) {
      event.preventDefault();
      openInBrowser(url);
    }
  };
  contents.on("will-navigate", stayInApp);
  contents.on("will-redirect", stayInApp);
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

function lockDownSession(port) {
  const ses = session.defaultSession;
  // No remote content: any web request to somewhere other than the local server is cancelled.
  ses.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (details, callback) => callback({ cancel: !isAppUrl(details.url, port) }));
  // The app needs no camera, microphone, location or notifications.
  ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
}

function openWindow(port) {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 360,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL(appOrigin(port));
}

function fail(message) {
  dialog.showErrorBox("Job Search Tracker could not start", message);
  app.quit();
}

// Running from the project (`npm run desktop`), show the app's icon in the macOS Dock. An installed app
// gets its icon from its own bundle instead, and build/ isn't packed into it, so skip if the file isn't there.
function showDockIcon() {
  const iconFile = join(root, "build", "icon.png");
  if (process.platform === "darwin" && existsSync(iconFile)) app.dock?.setIcon(iconFile);
}

app.whenReady().then(async () => {
  showDockIcon();
  if (!existsSync(join(distDir, "index.html"))) return fail("The app has not been built yet. Run `npm run desktop`, which builds it first.");
  // The OS's per-user app-data folder (not the project folder), unless SPT_DATA_DIR says otherwise.
  const dataDir = desktopDataDir({ envDir: process.env.SPT_DATA_DIR, userDataDir: app.getPath("userData") });
  try {
    running = await startServer({ port: 0, dataDir, distDir });
  } catch (e) {
    return fail(String(e?.message || e));
  }
  console.log(`Job Search Tracker is running at ${appOrigin(running.port)}`);
  console.log(`Your data is saved in ${join(dataDir, "tracker.sqlite")}`);
  lockDownSession(running.port);
  openWindow(running.port);
});

// Closing the last window quits the app, on macOS too, to keep it simple.
app.on("window-all-closed", () => app.quit());

// Stop the server (and close the database) before quitting.
app.on("before-quit", (event) => {
  if (!running || quitting) return;
  event.preventDefault();
  quitting = true;
  setTimeout(() => app.exit(0), 5000).unref(); // never hang if something won't let go
  running.close().catch(console.error).finally(() => app.quit());
});

// Ctrl+C in the terminal that ran `npm run desktop`.
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => app.quit());
