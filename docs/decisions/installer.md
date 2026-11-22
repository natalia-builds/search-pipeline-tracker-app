# Decision: how to package the app as an installer

- **Status:** Decided. The maintainer read this and agreed on 2026-11-21 (issue [#7](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/7)).
- **Date:** 2026-11-21
- **Decision:** Electron.

## The question

Today you need Node.js and a terminal to run the app. The goal is a double-click installer for macOS, Windows and Linux. The two candidates are **Electron** and **Tauri**. This page compares them for *this* app and records the choice, so the installer issues that follow ([#8](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/8) to [#13](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/13)) build on something written down.

## What the app needs

- A Node server (`server/app.mjs`) that serves the page and `/api`, and saves to SQLite through `node:sqlite`.
- The server must keep listening only on `127.0.0.1`, and the page must keep talking to it over `/api`. Nothing may leave the computer (see `CLAUDE.md`, "Private by default").
- Node 22.13 or newer for `node:sqlite` (22.23.4 or newer to build).

## What was checked

| Fact | How it was checked | Result |
| --- | --- | --- |
| Node version inside current Electron | [Electron's release page](https://releases.electronjs.org/releases/stable) | Electron 45.4.1 bundles Node 24.22.3. The 44 and 43 lines are also listed as stable, on Node 24.22.x. |
| `node:sqlite` works inside Electron | **Ran it.** On 2026-11-21 a throwaway script, outside this repository, ran in Electron 45.4.1's main process: it opened an in-memory database, inserted a row, ran `INSERT OR IGNORE`, and ran an `UPDATE ... SET rev = rev + 1 ... WHERE rev = ?`, the same kinds of statement the server uses. | It worked on Electron 45.4.1 and Node 24.22.3. The other searches found no official page on this, and third-party pages disagreed, which is why it was run. This was on macOS only, and it did not run the real server inside Electron. |
| Unpacked size of Electron itself | Measured on macOS | The downloaded Electron 45.4.1 folder was 258 MB unpacked. That is not an installer size. |
| Installer sizes | Third-party articles only, not measured here | See "Installer size" below. Treat as rough. |
| Tauri running Node code | [Tauri's sidecar docs](https://v2.tauri.app/develop/sidecar) and its [Node.js sidecar guide](https://v2.tauri.app/learn/sidecar-nodejs/) | Tauri doesn't include Node. Node code has to be compiled into one binary (for example with `pkg`) and shipped next to the app as a "sidecar". |
| Auto-update targets | [electron-builder's auto-update page](https://www.electron.build/docs/features/auto-update/) | Windows: NSIS only. macOS: needs both the dmg and zip targets. Linux: AppImage, deb and rpm (its pages differ on Pacman). |

## Comparison

**How the server runs.** *Electron:* the server runs inside the app's own Node, so `server/app.mjs` can be started from the app's main process with little or no change. *Tauri:* the web view is the system's, and the server would have to be compiled into a sidecar binary for each operating system, or rewritten in Rust. Either way is new work and a new thing to test.

**Installer size.** *Electron:* large, because it ships its own browser and Node. One third-party Windows test measured about 106 MB for Electron against about 1 MB for Tauri on the same app, and other write-ups quote roughly 120 to 200 MB against 3 to 10 MB. *Tauri:* much smaller on its own, but a Node sidecar adds back a lot. No measured figure turned up for that, only a report of a 71 MB Python sidecar. So Tauri's size advantage for this app is real but smaller than the headline numbers.

**Building for macOS, Windows and Linux.** Both document builds for all three systems. Not checked here: whether one machine can build for all three. Issue [#12](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/12) should use one CI runner per system unless it finds otherwise. *Tauri* also needs a Rust toolchain, and its Node sidecar has to be built for each platform (the sidecar docs name the binary after its target platform).

**Code signing and "unidentified developer" warnings.** The same for both. macOS needs a Developer ID certificate and notarization to avoid the Gatekeeper warning, and Windows needs a code-signing certificate to avoid SmartScreen. Neither tool avoids this. Both need certificates stored as secrets in CI. Whether and how much the certificates cost was not researched here; budget for it. Unsigned installers will work but show a warning, which is acceptable for the first releases if the README says so.

**Auto-update.** *Electron* (with electron-builder's updater): supported, but it needs signed macOS builds, the zip target on macOS, and NSIS on Windows. *Tauri:* has its own updater plugin with its own signing key, and a sidecar might need a separate update path, according to one developer write-up. Auto-update is not planned for the first release with either tool.

**How much new code.** *Electron:* a small main file that starts the server and opens a window, plus packaging config. *Tauri:* a Rust shell, a sidecar build step, and the packaging config, in a language the project doesn't use today.

**Fit with the project.** *Electron:* everything stays JavaScript and Node, so the maintainer can follow all of it. *Tauri:* the shell is Rust, and the project would have two toolchains.

## What an end user would notice

Most of the experience is the same either way: double-click an installer, get a normal app window with the same screens, data kept on the computer, and the same "unidentified developer" warnings on macOS and Windows until the installers are signed. The differences:

- **Download size.** Electron's installer is large (roughly 100 MB or more). Tauri's is smaller, though a Node sidecar would add back much of that. This is a one-time cost, felt most on a slow connection or a small disk.
- **Which web engine draws the screens.** Electron ships its own copy of Chromium, so the app looks and behaves the same on every computer. Tauri uses the web view the operating system provides. That is believed to be WebKit (Safari's engine) on macOS, Microsoft Edge's WebView2 on Windows and WebKitGTK on Linux. **That has not been verified**, so confirm it before relying on it. If it holds, the same screens could render slightly differently on each system, and a layout or accessibility fix on one system might not carry over to another.
- **Accessibility testing.** Stage 2 of the roadmap plans VoiceOver and Safari/Firefox testing ([#18](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/18), [#19](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/19)). With Electron, one Chromium build is what gets tested everywhere. With Tauri, each system's engine would need its own accessibility check.
- **Speed and memory.** Tauri apps are often described as lighter. Only general claims turned up, with no measurements for an app like this, so it is not counted as a real difference here.
- **Updates.** Both have an update mechanism. For the first releases, people would most likely download the new installer by hand either way.

## Tradeoffs considered

Only Electron and Tauri were compared, as issue #7 asked.

**What choosing Electron gives up**
- A much smaller installer. This is the main thing given up.
- Possibly lower memory use and faster start-up. This is unmeasured, so it may not be a real loss.

**What choosing Electron gains**
- The existing, tested server runs almost unchanged inside the app, and `node:sqlite` was shown to work in Electron 45.4.1.
- One web engine everywhere, so the screens render the same on every system and accessibility testing happens once.
- One language (JavaScript) and one toolchain, which the maintainer can follow end to end.
- Less new code: a small main file and packaging config.

**Why not Tauri with a Node sidecar.** It keeps the server, but adds a Rust shell, a per-platform sidecar build and a separate update path for the sidecar. The size saving shrinks once Node is shipped, and the engine differs by system.

**Why not Tauri with the server rewritten in Rust.** It would replace server code that already has tests and carries the data-safety rules (stale-write refusal, the daily snapshots, the Host, Origin and `X-SPT` checks). That is the riskiest of the options for a project whose rule is to never lose data silently.

**What would change this decision.** If the installer size turns out to matter much more to users than expected, measure a real Electron build in [#11](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/11) and reconsider while little has been built on top of it.

## Decision

**Use Electron.** The server is Node and relies on `node:sqlite`, and Electron's bundled Node supports it (checked above). That makes the app a thin shell around code that already works. Tauri's main advantage is size, and a Node sidecar and a second language cost much of that back while adding more to build and test.

This matches the expected recommendation in issue #7, and the checks above did not change it.

## Consequences

- Issues #8 to #13 assume Electron. Packaging will probably use `electron-builder`, which #11 and #12 should confirm.
- Installers will be large (on the order of 100 MB or more). The README should say so.
- Electron has to be kept up to date. Its release page listed three major versions as stable (43, 44 and 45), which suggests older ones are not maintained. The support policy was not checked, so read it before picking a version in #9.
- The app will run on Electron's Node (24.x), not on whatever Node the developer or CI has. The server tests run on the CI Node, so they do not prove the packaged app works. The start-up smoke test ([#15](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/15)) should launch the packaged app.
- Accessibility and browser testing ([#18](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/18), [#19](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/19)) should include the packaged app, not only a regular browser, because the app will run in Electron's Chromium.
- `node:sqlite` was only tried on macOS. Issue #9 should repeat it on Windows and Linux, with the real server.
- When the server picks its own port ([#8](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/8)), `guard()` must still accept that port and keep all three checks (Host, Origin, `X-SPT`) and their tests.
- Unsigned installers will show warnings on macOS and Windows until certificates are bought. Signing and auto-update are not part of the first installer and need their own issues and a decision on cost.
- If Electron later proves too heavy, the server stays plain Node, so moving to a different shell would mean replacing only the shell.

## Sources

- [Electron releases](https://releases.electronjs.org/releases/stable)
- [electron-builder auto update](https://www.electron.build/docs/features/auto-update/) and [code signing](https://www.electron.build/docs/features/code-signing/)
- [Tauri sidecars](https://v2.tauri.app/develop/sidecar), [Node.js as a sidecar](https://v2.tauri.app/learn/sidecar-nodejs/), [updater plugin](https://v2.tauri.app/plugin/updater/) and [Windows signing](https://v2.tauri.app/distribute/sign/windows/)
- Installer-size figures come from third-party comparisons and were not measured here; the Python sidecar report is [tauri-apps/tauri#15134](https://github.com/tauri-apps/tauri/issues/15134).
