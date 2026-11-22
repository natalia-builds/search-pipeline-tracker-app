# Search Pipeline & Tracker (local app)

A free, open-source job search tracker that people download and run on their own computer. It grew out of a personal Claude artifact, then a browser-only static site (<https://github.com/natalia-builds/search-pipeline-and-tracker>), and is now a small local app: Astro screens plus a Node server that saves to a SQLite file.

## Principles

- **Private by default:** all data stays on the person's computer, in `data/tracker.sqlite` (or `SPT_DATA_DIR`). No accounts, no cloud, no analytics, no outside requests (fonts and libraries are bundled, not loaded from CDNs). Don't add any of these without a decision recorded in an Issue.
- **The server only talks to this computer:** it listens on `127.0.0.1`, and `guard()` in `server/app.mjs` rejects a wrong Host (DNS rebinding), a wrong Origin, and requests missing the `X-SPT` header. It sends no CORS headers. Keep all three checks and keep their tests passing.
- **Nothing personal built in:** every check and threshold comes from the person's Settings. Never hard-code a name, employer, number, or city.
- **Backups matter:** keep backup download and restore working, and keep old backups (including ones from the browser version) loading. If the saved data's shape changes, raise `SCHEMA_VERSION` in `src/lib/types.ts` and handle older data in `normalize` in `src/lib/storage.ts`.
- **Never lose data silently:** saves carry a revision number (`baseRev`), and the server refuses a save from an out-of-date window (HTTP 409). Failed saves are kept and retried, and the person is told. Unreadable saved data is set aside (`/api/aside`) before anything overwrites it. The server keeps one snapshot per day for 30 days.

## Where things live

- `server/app.mjs`: the server (static files, `/api/library`, `/api/aside`, SQLite). `server/start.mjs`: `startServer({ port, dataDir, distDir })` starts it from code (port 0 picks a free port) and returns `{ server, port, close }`. `server/index.mjs`: the command-line start (port, data folder, messages, Ctrl+C) built on `startServer`. `server/app.test.mjs` and `server/start.test.mjs`: their tests.
- `src/lib/`: logic with tests (Markdown, diff, checks, storage and backups, PDF, sample data). `src/lib/serverStore.ts`: a get/set store that saves through the server in the background, so `storage.ts` and the screens didn't have to change.
- `src/scripts/app.ts`: the interactive page (rendering and event handling). Per-device conveniences (open section, unsaved drafts) stay in the browser's `localStorage`; the library does not.
- `src/pages/index.astro`: the page shell. `src/styles/app.css`: styles and color tokens.
- `scripts/start.mjs` (`npm start`) and `scripts/dev.mjs` (`npm run dev`).
- `desktop/main.mjs`: the Electron shell (`npm run desktop`). It starts the server with `startServer` on a free port and shows it in one window. Keep its security settings: `contextIsolation`, no `nodeIntegration`, `sandbox`, no preload script, navigation limited to the app's own address, external links opened in the default browser, remote requests cancelled, permissions denied. `desktop/urls.mjs` holds the address rules, with tests in `desktop/urls.test.mjs`. The decision to use Electron is in `docs/decisions/installer.md`.
- `docs/`: the README screenshot and the resume formatting guide. The README follows the same structure as the maintainer's other repos (Status, who it's for, what it does, design decisions and tradeoffs, roadmap, limitations, then install and developer sections) and is written so a recruiter or hiring manager can skim it. State only facts that can be verified, and keep "Status" and "Limitations" honest when things change.

## Running it

- `npm start` builds once, then serves `dist/` and the API on `http://localhost:4321`.
- `npm run dev` runs the server on 4322 and Astro's live-reload page on 4321, which proxies `/api` to the server.
- `npm run desktop` builds, then opens the app in an Electron window on a free port. The first run downloads Electron's binary (about 100 MB or more). It still saves to `data/` (or `SPT_DATA_DIR`). It has only been tried on macOS.
- Needs Node 22.23.4 or newer (Astro's minimum; `node:sqlite` itself needs 22.13). Scripts pass `--disable-warning=ExperimentalWarning` to hide its notice.

## Accessibility

Everything must meet **WCAG 2.2 Level AA**: real HTML controls, full keyboard use with visible focus, labels on every field, errors linked to their field with `aria-invalid`, changes announced through the `#status` live region, 4.5:1 text contrast in light and dark mode, never color alone, and no sideways scrolling at 375px. The page redraws its sections, so keep focus on the control the person was using (`render(focusTarget)`). Say what was and wasn't tested.

## Workflow

- Never commit directly to `main`. Use a short-lived branch and a pull request with one purpose.
- Run `npm test` and `npm run build` before every commit.
- Check changes in a browser: awkward inputs, a 375px phone width, and dark mode.
- This repository is public. Never commit personal resume data, the `data/` folder, backups, or secrets.

## Explaining the work

The maintainer is learning to code. Explain each step and command in plain language before running it, including why teams work this way.
