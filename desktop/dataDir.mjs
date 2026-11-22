// Where the desktop app keeps its data. A plain function, so it can be tested without Electron.
import { join, resolve } from "node:path";

/**
 * - `envDir`: the SPT_DATA_DIR setting, if the person set one. It wins, as it does for `npm start`.
 * - `userDataDir`: the operating system's per-user app-data folder for this app (Electron's
 *   `app.getPath("userData")`), for example ~/Library/Application Support/Job Search Tracker on macOS.
 * Returns an absolute path to the folder that holds `tracker.sqlite`.
 */
export function desktopDataDir({ envDir, userDataDir }) {
  return resolve(envDir || join(userDataDir, "data"));
}
