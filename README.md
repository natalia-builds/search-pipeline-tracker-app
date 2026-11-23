# Search Pipeline & Tracker

A free, open-source job search tracker that runs on your own computer. It keeps every version of your resume, shows which version went to each company and each person, tracks where every application stands, and saves a history of your LinkedIn headline. Your data lives in one file on your machine: no account, no cloud, no tracking.

**Try it in your browser, no install:** [the browser version](https://natalia-builds.github.io/search-pipeline-and-tracker/) (the same tracker, with data kept in your browser instead of a file)

**Download it for your computer:** installers for macOS, Windows and Linux are on the [latest release](https://github.com/natalia-builds/search-pipeline-tracker-app/releases/latest). The [install steps](#how-to-use-it) explain the warning you will see the first time, because the installers aren't signed.

## Contents

- [Status](#status)
- [Who it's for and the problem it solves](#who-its-for-and-the-problem-it-solves)
- [What it does today](#what-it-does-today)
- [Design decisions and tradeoffs](#design-decisions-and-tradeoffs)
- [Roadmap](#roadmap)
- [Limitations and known gaps](#limitations-and-known-gaps)
- [How to use it](#how-to-use-it)
  - [Install the app](#install-the-app)
  - [Or run it from the source code](#or-run-it-from-the-source-code)
  - [First steps](#first-steps)
  - [Your data and backups](#your-data-and-backups)
  - [Moving over from the browser version](#moving-over-from-the-browser-version)
- [For developers](#for-developers)
  - [Run it for development](#run-it-for-development)
  - [Where things live](#where-things-live)
  - [Contributing](#contributing)
  - [License](#license)

## Status

**Version 1.1.0, small improvements on 1.0.0, the first release with installers.** Version 0.1.0 was the first release of the local app, which had to be run from the source code. It works end to end and has automated tests for the server (including its security checks), the browser-side saving, and the resume logic. The screens come from the [browser version](https://github.com/natalia-builds/search-pipeline-and-tracker), which was released first. This version changes where the data lives.

The [latest release](https://github.com/natalia-builds/search-pipeline-tracker-app/releases/latest) has an installer for macOS (Apple silicon), Windows (64-bit) and Linux (64-bit). **What has been tested:**

- The automated tests passed on macOS, Windows and Linux when the 1.1.0 release candidate (1.1.0-rc.2) was built, and each installer was built on its own system. Version 1.1.0 has the same code as that candidate; only the version number differs.
- A person has opened only the macOS installer. The maintainer downloaded the 1.1.0-rc.2 file from its release (its checksum matched the published list) and tried the changes listed below. Nobody has yet run the Windows or Linux installer on Windows or Linux, and the 1.1.0 files themselves were not opened separately.
- The installers aren't signed, so macOS and Windows are expected to warn about an unidentified developer the first time. [How to use it](#how-to-use-it) has the steps.

**Changes in 1.1.0.** Small improvements, found while testing the downloaded app: dropdown arrows have more room from the edge of the box; the suggested version name follows the numbers shown in History; saving a version with a name that is already used is refused, with the error shown under the name box; the Save version button is turned off, with the reason beside it, when there is nothing to save; and problems now appear in red at the top of the window, with the word "Problem:", wherever the page is scrolled. Their automated tests passed on Linux, Windows and macOS in CI, and each was checked in a browser. Screen readers (VoiceOver), Safari and Firefox have not been tested for these changes.

## Who it's for and the problem it solves

Anyone running a job search who tailors their resume for each role. A search produces many versions of a resume, many applications, and people who passed the resume along. It gets hard to say which version a company, or a former colleague, actually has. A spreadsheet can list where you applied, but it can't hold each version or compare them. Hosted trackers keep your resume and your contacts' details on someone else's servers.

The tracker is built around four things:

1. **Resume versions:** save a new version each time you tailor it, with a note about what changed, and compare any two.
2. **Applications:** track each role from Interested to Offer, and record the version you sent.
3. **Contacts:** record who you shared a version with outside an application, and get a warning when they have an older one.
4. **LinkedIn headline:** keep every headline you've used, with when and why it changed.

A version you've sent somewhere can't be deleted, so you always have a record of what each company or person received.

## What it does today

- **Resume:** compare any two versions line by line, download a PDF that fits the page limit you choose (any length, or 1 to 4 pages, as real text that applicant tracking systems can read), and copy the resume as plain text for application forms.
- **Checks you set up yourself:** words every version must include, the years of experience you claim, team sizes, words to avoid, em dashes, and a pay floor. Nothing is built in, so every check comes from your own settings.
- **Applications:** flags for overdue next steps, no posted pay range, pay below your floor, and work setups you want to avoid. Ended roles (rejected, withdrawn, or closed) leave the Active count.
- **Contacts:** which version each person has, and follow-up dates.
- **LinkedIn headline:** a count against LinkedIn's 220-character limit, and a check that the numbers in your headline match your current resume.
- **Backup and restore:** a download of everything as one file, and a restore from it.

<img src="docs/screenshot.png" width="600" alt="The tracker showing a sample resume for a made-up job seeker, Jordan Rivera. Tabs across the top read Resume, Applications (3), Contacts (1), LinkedIn headline, and Settings and backup. The resume preview sits beside a Checks panel with five passing checks (no em dashes, includes a required word, none of your words to avoid, experience years match, team sizes match) and a size panel showing 88 words, 585 characters, and 4 bullets.">

## Design decisions and tradeoffs

- **The data is a file you own, not browser storage.** The browser version keeps everything in the browser, so clearing the browser's data erases it. This version saves to one SQLite file (`data/tracker.sqlite`) on the person's computer, and the backup download still works. The tradeoff is that it's tied to one computer and nothing syncs between computers. Running it from the source code also needs Node.js and a terminal, which the installers don't.
- **Private by default.** There are no accounts, no cloud, no analytics, and no requests to other websites. Fonts and libraries are bundled. The server listens only on `127.0.0.1`, rejects requests with the wrong Host or Origin or without the app's own header, and sends no cross-site permission headers, so a website open in another tab can't read or change the data. The tradeoff is that the project has no usage numbers and can only learn how people use it if they say so.
- **Never lose data silently.** Every save carries a revision number, and the server refuses a save from an out-of-date window instead of overwriting newer work. A failed save is kept and retried, with a visible warning. Data the app can't read is set aside before anything overwrites it. The server keeps one copy of the previous data per day for 30 days. The tradeoff is that if two windows are open and both change something, the older one has to reload and redo its change.
- **Reuse the working screens and change only how they save.** Saving moved behind a small get-and-set store (`serverStore.ts`) that talks to the server, so the existing logic and its tests didn't change. The whole library is stored as one JSON document, not as separate database tables. That keeps backups from the browser version loading unchanged and is plenty for a job search. The tradeoff is that the database can't be searched by application or contact, which would matter if a future feature needed it.
- **A packaged app built with Electron.** The server is Node and uses `node:sqlite`, and Electron brings its own Node, so the existing server runs inside the app unchanged. The other option, Tauri, would have needed Node shipped alongside it or the server rewritten in Rust. The tradeoff is size: each installer is between 120 and 126 MB. The installers are also unsigned, because signing needs paid developer certificates, so macOS and Windows warn on first open. See the [decision record](docs/decisions/installer.md).
- **Nothing to compile.** SQLite comes from Node itself (`node:sqlite`), so installing from the source code means `npm install` with nothing to build for your operating system. The tradeoff is that it needs a recent Node (22.23.4 or newer, set by Astro), and Node still labels this module experimental in some versions, so the start scripts hide its warning.
- **Nothing personal is built in.** No name, employer, number, or city is written into the code. Every check and threshold comes from the person's Settings.
- **Accessibility is a requirement, not an extra.** The screens aim to meet WCAG 2.2 Level AA: real HTML controls, full keyboard use, labels on every field, errors linked to their field, results announced to screen readers, and enough contrast in light and dark mode. [Limitations](#limitations-and-known-gaps) says what hasn't been verified.
- **Small, reviewed changes.** Every change goes through a pull request that is tested and built on Linux, Windows and macOS, each with two Node versions, before it merges. That caught a wrong minimum Node version in the very first pull request.

**Deliberately not built:** accounts or sign-in, hosting or syncing between computers, analytics or tracking, and requests to other websites.

## Roadmap

Live progress for each stage is on the [milestones page](https://github.com/natalia-builds/search-pipeline-tracker-app/milestones).

The first stage, a double-click installer for macOS, Windows and Linux, shipped as version 1.0.0 (see [Status](#status)). The fourth stage, small improvements found while testing the downloaded app, shipped as version 1.1.0: more room between the dropdown arrow and the edge of the box ([#39](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/39)), a default version name that follows the numbers shown in History ([#40](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/40)), a check that stops two versions from sharing a name ([#41](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/41)) with its error shown under the name box ([#48](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/48)), a Save version button that is turned off when there is nothing to save ([#49](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/49)), and problems shown in red where they can be seen ([#50](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/50)). The stages that remain:

2. **Broader testing and accessibility.** A start-up smoke test ([#15](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/15)). Running the tests on Windows and macOS in CI ([#14](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/14)) is done. An automated accessibility check ([#16](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/16)) and a written checklist ([#17](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/17)). Then testing by a person with VoiceOver ([#18](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/18)) and in Safari and Firefox ([#19](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/19)), and an update to this README with what was verified ([#20](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/20)).
3. **Signed installers.** A written decision on whether and how to sign the installers, so macOS and Windows stop warning about an unidentified developer ([#34](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/34)). Signing itself is only planned if that decision is to go ahead. It may be "not now".

Beyond these, nothing is committed.

## Limitations and known gaps

- **The installers aren't signed.** macOS and Windows are expected to warn that the app is from an unidentified developer the first time you open a downloaded copy, and macOS blocks it until you choose Open Anyway. Signing needs paid developer certificates, or a free one with conditions for open-source projects. Whether to sign is an open decision ([#34](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/34)). [Install the app](#install-the-app) has the steps.
- **Only the macOS installer has been opened by a person,** and that was the downloaded 1.1.0-rc.2 file, not the final 1.1.0 file. The Windows and Linux installers are built and their automated tests pass, but nobody has run them on Windows or Linux, so they may have problems nobody has seen. The automated tests on pull requests now also run on Windows and macOS, and they pass there. That shows the code and its tests work on those systems, not that a person has used the app on them.
- **The installers cover three kinds of computer:** Macs with Apple silicon (not Intel Macs), 64-bit Windows and 64-bit Linux. Each file is between 120 and 126 MB.
- **No automatic updates.** To update, download the new installer and replace the app. Your data is stored outside the app, so it should be kept. Download a backup first to be safe.
- **Accessibility isn't fully verified.** The screens have been checked for color contrast in light and dark mode, use at a 375-pixel phone width, labels and error messages on form fields, keeping keyboard focus in place, and announcing results to screen readers. A person hasn't tested them with a screen reader, in Safari or Firefox, or in a full review.
- **One person per install.** There's no sign-in, so anyone who can open this computer's browser to the app can see the data. Run it only on a computer you trust.
- **Nothing syncs between computers.** Use a backup file to move your data.
- **With `npm start`, the data folder is inside the project folder.** Deleting the folder deletes the data and the daily copies, because the copies live in the same file. The app window (`npm run desktop`) keeps its data in the operating system's app-data folder instead. Download a backup now and then either way.
- **PDFs are US Letter only,** and the tool's text is English only.
- **Resumes use simple marks** for headings, bullets, and dates. There are no tables, columns, images, or custom fonts. See [Formatting your resume](docs/formatting-your-resume.md).

---

## How to use it

### Install the app

Open the [latest release](https://github.com/natalia-builds/search-pipeline-tracker-app/releases/latest) and download the file for your computer from its list of files:

| Your computer | File to download |
| --- | --- |
| Mac with Apple silicon (M1 or later) | `Job-Search-Tracker-<version>-arm64.dmg` |
| Windows, 64-bit | `Job-Search-Tracker-<version>-x64.exe` |
| Linux, 64-bit | `Job-Search-Tracker-<version>-x86_64.AppImage` |

There is no installer for Intel Macs. If that's your computer, [run it from the source code](#or-run-it-from-the-source-code) instead. Each file is between 120 and 126 MB.

1. **Install it.**
   - **macOS:** open the `.dmg`, drag **Job Search Tracker** onto **Applications**, then open it from there.
   - **Windows:** run the `.exe`. It is built as a one-click installer for your own user account.
   - **Linux:** make the file runnable with `chmod +x Job-Search-Tracker-*.AppImage`, then run it.
2. **Expect a warning the first time.** The installers aren't signed with a developer certificate, so a downloaded copy is blocked until you allow it.
   - **macOS:** try to open the app, then open **System Settings → Privacy & Security**, scroll to **Security**, choose **Open Anyway**, and enter your login password. These steps come from Apple's guide for macOS 15 and later. The button stays available for about an hour after you try to open the app.
   - **Windows:** Windows is likely to show "Windows protected your PC". Choose **More info**, then **Run anyway**. This is expected and hasn't been seen on a real Windows computer.
   - **Linux:** no warning is expected. Some newer Linux versions restrict a sandbox that the app's browser engine uses, and the app may not start until it is run with `--no-sandbox`. This is expected from how other Electron apps behave and hasn't been seen with this one.
3. **Optional: check the download.** `SHA256SUMS.txt` on the release lists a checksum for each file. Compare it with the result of `shasum -a 256 <file>` on macOS or `sha256sum <file>` on Linux. It shows the file wasn't damaged or swapped. It is not a signature.

[Building the installers](docs/installer.md) has more detail on all of this and on what was and wasn't tested. Your data is saved on your computer, not inside the app: see [Your data and backups](#your-data-and-backups).

### Or run it from the source code

If there's no installer for your computer, or you'd like to see the code, you can run it with Node.js. You need [Node.js](https://nodejs.org) 22.23.4 or newer (24 is recommended) and [Git](https://git-scm.com).

```bash
git clone https://github.com/natalia-builds/search-pipeline-tracker-app.git
cd search-pipeline-tracker-app
npm install
npm start
```

Then open **http://localhost:4321** in your browser. The first `npm start` takes a few extra seconds to build the app.

To stop it, press **Ctrl+C** in the terminal. Your data is kept. To use a different port: `npm start -- --port 4400`. To update later, run `git pull`, then `npm install`, then `npm start -- --rebuild`.

### First steps

1. Choose **Try it with sample data** to look around with a made-up job seeker. When you're ready for your own, go to **Settings and backup → Delete everything**.
2. **Paste your resume** and select **Save version**. See [Formatting your resume](docs/formatting-your-resume.md).
3. **Set up your checks** in **Settings and backup**. All of them are optional.
4. **Add applications** as you pursue roles, and pick the resume version you sent.
5. **Download a backup** from **Settings and backup** every week or two.

### Your data and backups

Everything is saved in one SQLite file, `tracker.sqlite`. Where it lives depends on how you run the app:

- **`npm start`** saves to `data/tracker.sqlite` inside the project folder. To keep it somewhere else, set `SPT_DATA_DIR` before starting: `SPT_DATA_DIR=~/Documents/job-search npm start`. The `data` folder is excluded from Git, so it won't be committed by accident.
- **The installed app, and `npm run desktop`** (the same app opened from the source code), save to a `data` folder inside the operating system's app-data folder for "Job Search Tracker". `SPT_DATA_DIR` still wins if you set it.
  - macOS: `~/Library/Application Support/Job Search Tracker/data/tracker.sqlite`. This is the path that has been checked.
  - Windows: `%APPDATA%\Job Search Tracker\data\tracker.sqlite`. Expected from Electron's documented locations, not yet checked.
  - Linux: `~/.config/Job Search Tracker/data/tracker.sqlite`. Expected from Electron's documented locations, not yet checked.

The two ways don't share data: the window starts empty the first time, even if you have used `npm start` before. To bring your data over, the safest way is in the app: in the `npm start` version choose **Settings and backup → Download backup**, then in the window choose **Settings and backup → Restore from a backup file**. You can also copy the file. Quit both apps first, then copy `data/tracker.sqlite` from the project folder into the window's `data` folder (create it if it isn't there). This replaces anything already saved in the window.

Choose **Settings and backup → Download backup** to save a `.json` file, and keep it somewhere safe, such as a cloud drive. The app reminds you when your last backup is more than two weeks old. Backups and the data file contain your resume and your contacts' details, so keep them as private as the resume itself.

### Moving over from the browser version

Open the [browser version](https://natalia-builds.github.io/search-pipeline-and-tracker/) in the browser you've been using and choose **Settings and backup → Download backup**. Then, in this app, choose **Settings and backup → Restore from a backup file** and pick that file.

---

## For developers

Built with [Astro](https://astro.build) and TypeScript for the screens, a small Node server that uses the SQLite built into Node, [Vitest](https://vitest.dev) for tests, and [jsPDF](https://github.com/parallax/jsPDF) for PDFs. GitHub Actions tests and builds every pull request, and builds the installers for macOS, Windows and Linux and publishes them as a release when a version tag is pushed.

### Run it for development

```bash
npm install      # download the packages the project needs
npm run dev      # app with live reload at http://localhost:4321 (server on 4322)
npm start        # build once, then run the app as people will use it
npm run desktop  # build, then open the app in its own window (Electron)
npm run dist     # build an installer for the system you're on into release/ (unsigned)
npm test         # run the automated tests
npm run build    # build the screens into dist/
```

### Where things live

- [Resume formatting guide](docs/formatting-your-resume.md): the marks the editor understands
- [Building the installers](docs/installer.md): how `npm run dist` works, how pushing a version tag builds and publishes installers for macOS, Windows and Linux (`.github/workflows/release.yml`), what the first launch of an unsigned app looks like, and what was and wasn't tested. `electron-builder.yml` is its configuration.
- `server/app.mjs`: the local server. It serves the built app and saves the library through `GET` and `PUT /api/library`, with the checks that keep other websites out. `server/start.mjs` starts it from code, and `server/index.mjs` is the command-line start.
- `src/lib/`: the logic and its tests (formatting, comparing versions, checks, backups, PDFs, sample data). `serverStore.ts` is how the screens save through the server.
- `src/scripts/app.ts`: the interactive page. `src/pages/index.astro`: the page shell. `src/styles/app.css`: styles.
- `scripts/`: the `npm start` and `npm run dev` launchers.
- `build/icon.png`: the app icon (drawn from `docs/app-icon.svg`; `npm run icon` redraws it). See [Building the installers](docs/installer.md#the-app-icon).
- `desktop/`: the Electron window for `npm run desktop`. It runs the same local server and shows it in a window, saving to the operating system's app-data folder (see [Your data and backups](#your-data-and-backups)). The first run downloads Electron (about 100 MB or more), and it has only been tried on macOS.
- [CLAUDE.md](CLAUDE.md): the project's principles and working rules

### Contributing

Issues are welcome. [Open one](https://github.com/natalia-builds/search-pipeline-tracker-app/issues) to report a problem or suggest an idea, and open one before a larger change so it can be talked through. Then make a branch, keep the pull request to one purpose, and run `npm test` and `npm run build` before you push. Please keep the app private by default. Never paste your real resume, contacts, or a backup file into an issue, because issues are public.

### License

[MIT](LICENSE). The Carlito font used in PDFs is under the [SIL Open Font License](public/fonts/OFL.txt).
