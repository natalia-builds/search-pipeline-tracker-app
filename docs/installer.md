# Building the macOS installer

`npm run dist` builds a `.dmg`, the disk image people drag an app out of, for macOS. It is a first, local step: the build is **not signed with a certificate**, it is for Apple Silicon Macs only, and Windows and Linux installers don't exist yet ([#12](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/12)). The tool choice (Electron with electron-builder) is recorded in [decisions/installer.md](decisions/installer.md).

## Build it

You need what the [README](../README.md#install-and-run) asks for (Node.js and Git), and a Mac.

```bash
npm install
npm run dist
```

This builds the screens, then packages them with the server and the desktop window. It produces `release/Job-Search-Tracker-<version>-arm64.dmg`, about 115 MB. The first build downloads Electron and a disk-image helper tool, so it needs an internet connection and takes longer. Later builds reuse them. The `release/` folder is ignored by Git, so installers are never committed.

The installer is built for the kind of Mac you build on. On an Apple Silicon Mac, `arm64`, you get an `arm64` installer. Building for Intel Macs, or for other systems, hasn't been set up.

## Install it

1. Open the `.dmg`.
2. Drag **Job Search Tracker** onto the **Applications** shortcut in the window.
3. Open it from Applications.

The app saves your data in the operating system's app-data folder, not inside the app, so replacing the app with a newer one doesn't touch it. See [Your data and backups](../README.md#your-data-and-backups) for where that folder is.

## The first time you open it

Because the build isn't signed with an Apple Developer certificate and hasn't been through Apple's notarization check, macOS treats a **downloaded** copy as coming from an unidentified developer.

- **A copy you built yourself, on your own Mac, shows no warning.** macOS only flags files that were downloaded. This was checked: the copy installed from the `.dmg` built here had no download flag.
- **A downloaded copy will be blocked the first time.** On macOS 15 (Sequoia) and later, Apple's guide gives these steps: try to open the app, then open **System Settings → Privacy & Security**, scroll to **Security**, choose **Open Anyway**, and enter your login password. The button stays available for about an hour after the attempt. After that, the app opens normally.
- **The older right-click method is for older macOS.** Control-click then **Open** appears only in Apple's guide for earlier versions, not the one for macOS 15.

Source: Apple, [Open a Mac app from an unknown developer](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/15.0/mac/15.0). The warning dialog itself wasn't shown during this work, so the exact wording on your Mac may differ. This will be tested with a real download once installers are published ([#12](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/12), [#13](https://github.com/natalia-builds/search-pipeline-tracker-app/issues/13)).

## What "unsigned" means here

The config uses an "ad-hoc" signature (`identity: "-"` in `electron-builder.yml`). That is free, needs no certificate, no Apple account and no secrets, and it does not make the app trusted. It only seals the app's files together. It matters because with signing skipped entirely, the packaged app's seal was broken: `codesign --verify` reported "code has no resources but signature indicates they must be present". With the ad-hoc signature it reports "valid on disk", and the app launched normally on macOS 26.7. macOS may treat an app with a broken seal as damaged, and I did not test that on a downloaded copy.

Real signing and notarization need a paid Apple Developer Program membership and certificates kept as secrets in CI. That isn't decided or planned. It would be its own decision first.

## What was tested

On macOS 26.7, Apple Silicon, with the `.dmg` built by `npm run dist`:

- The `.dmg` mounts, and the app copied out of it opens with one window showing the screens.
- **Try it with sample data** saves (the server reported the data was stored), and **Download PDF** produces a real PDF.
- Closing the window quits the app. Opening it again shows the saved data.
- Contents: the app archive holds only the screens (`dist/`), the server and the desktop shell, about 0.9 MB. Without the `!node_modules/**` rule in `electron-builder.yml`, it also packed about 13,000 files of build tools (94 MB) that the running app never uses.

To avoid touching real data, these checks started the app with Electron's `--user-data-dir` pointed at a scratch folder.

## Known gaps

- **Not tested:** a downloaded copy going through Gatekeeper (macOS's check), Intel Macs, Windows, Linux, and macOS versions other than 26.7.
- **No icon yet.** The app uses Electron's default icon.
- **No updates.** To update, build or download the new installer and replace the app. Your data is kept.
- **Ad-hoc signing and library validation.** electron-builder warns that an ad-hoc signature with the hardened runtime can stop an app launching unless an entitlement is added. It launched fine here. If a future macOS blocks it, that entitlement is the first thing to look at.
- **Audit warnings.** `npm audit` reports 6 moderate findings, all one issue in `minimatch` (a denial-of-service bug), pulled in by electron-builder's build tooling. `npm audit --omit=dev` reports none, nothing from it is inside the installer, and the build only runs on your computer or CI. npm's suggested fix is a downgrade to electron-builder 25.1.0, which is a breaking change, so it was not applied. Revisit when electron-builder updates it.
