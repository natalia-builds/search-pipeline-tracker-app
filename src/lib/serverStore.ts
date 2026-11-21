// Saves the library through the local server (into a SQLite file on your disk) instead of the browser.
//
// The rest of the app expects a simple "get / set" store, as localStorage provides. This gives it the
// same shape. Reads come from a copy loaded when the page opens. Writes update that copy at once and
// are sent to the server in the background, one at a time, so the screen never waits on the disk.
import { STORAGE_KEY, type KeyValueStore } from "./storage";

export interface ServerStore extends KeyValueStore {
  /** Asks the server whether the library changed (say, in another window). True means the copy was updated. */
  refresh(): Promise<boolean>;
  /** True while a change hasn't reached the disk yet. */
  hasUnsaved(): boolean;
}

export interface OpenResult {
  store: ServerStore | null;
  /** Set when the server couldn't be reached. */
  error: string | null;
}

export interface Callbacks {
  /** A save failed. `message` is ready to show the person. */
  onSaveError(message: string): void;
  /** A save worked after an earlier failure. */
  onSaved(): void;
}

const HEADERS = { "X-SPT": "1" };
const API = "/api/library";
const RETRY_MS = 5000;

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {}
  return `The server answered with an error (${res.status}).`;
}

export async function openServerStore(cb: Callbacks, fetchFn: typeof fetch = fetch): Promise<OpenResult> {
  let rev = 0;
  let raw: string | null = null;

  const load = async () => {
    const res = await fetchFn(API, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(await errorMessage(res));
    const body = await res.json();
    return { rev: Number(body.rev) || 0, raw: body.library ? JSON.stringify(body.library) : null };
  };

  try {
    const first = await load();
    rev = first.rev;
    raw = first.raw;
  } catch {
    return { store: null, error: "The tracker can't reach its local server, so nothing you enter will be saved. Make sure it's still running (npm start), then reload this page." };
  }

  let pending: string | null = null;
  let inflight = false;
  // After a conflict, saving stops until the page is reloaded, so an old window can't overwrite newer work.
  let stopped = false;
  let hadError = false;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const fail = (message: string) => {
    hadError = true;
    cb.onSaveError(message);
  };

  async function flush(): Promise<void> {
    if (inflight || pending === null || stopped) return;
    inflight = true;
    const text = pending;
    pending = null;
    try {
      const res = await fetchFn(API, {
        method: "PUT",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ baseRev: rev, library: JSON.parse(text) }),
      });
      if (res.status === 409) {
        stopped = true;
        inflight = false;
        fail(await errorMessage(res));
        return;
      }
      if (!res.ok) throw new Error(await errorMessage(res));
      rev = Number((await res.json()).rev) || rev + 1;
      inflight = false;
      if (hadError) {
        hadError = false;
        cb.onSaved();
      }
    } catch (e) {
      inflight = false;
      // Keep the change so it can be retried, unless a newer one already replaced it.
      if (pending === null) pending = text;
      // A TypeError from fetch means the server didn't answer at all.
      const why = e instanceof TypeError ? "the tracker's server isn't responding" : (e as Error).message;
      fail(`The last change couldn't be saved to disk (${why}). Trying again. Download a backup so you don't lose your work.`);
      clearTimeout(retry);
      retry = setTimeout(() => void flush(), RETRY_MS);
      return;
    }
    return flush();
  }

  const store: ServerStore = {
    getItem: (key) => (key === STORAGE_KEY ? raw : null),
    setItem(key, value) {
      if (key === STORAGE_KEY) {
        raw = value;
        pending = value;
        void flush();
      } else if (key === STORAGE_KEY + ".unreadable") {
        // Saved data that couldn't be read: have the server set a copy aside before anything overwrites it.
        void fetchFn("/api/aside", { method: "POST", headers: { ...HEADERS, "Content-Type": "application/json" }, body: JSON.stringify({ text: value }) }).catch(() => {});
      }
    },
    async refresh() {
      if (inflight || pending !== null || stopped) return false;
      try {
        const latest = await load();
        if (inflight || pending !== null || latest.rev === rev) return false;
        rev = latest.rev;
        raw = latest.raw;
        return true;
      } catch {
        return false;
      }
    },
    hasUnsaved: () => inflight || pending !== null,
  };
  return { store, error: null };
}
