# Search Pipeline & Tracker (local app)

A free, private tool for running a job search that **runs on your own computer**. Keep every version of your resume, see exactly which version went to each company and each person, track where every application stands, and keep a history of your LinkedIn headline.

Your data is saved in a single file on your computer. There's no account, no cloud, no tracking, and nothing leaves your machine.

> There's also a [browser-only version](https://natalia-builds.github.io/search-pipeline-and-tracker/) that needs no install and keeps data in your browser. This app is the same tracker, but your data lives in a file you control instead of browser storage, so clearing your browser can't erase it.

## Contents

- [What it does](#what-it-does)
- [Install and run](#install-and-run)
- [Your data and backups](#your-data-and-backups)
- [Moving over from the browser version](#moving-over-from-the-browser-version)
- [Formatting your resume](#formatting-your-resume)
- [Limits](#limits)
- [Accessibility](#accessibility)
- [Questions, bugs and ideas](#questions-bugs-and-ideas)
- [For developers](#for-developers)
- [License](#license)

## What it does

**Resume**
- Save a new version every time you tailor your resume, with a note about what changed.
- Compare any two versions line by line.
- Download a PDF that fits the page limit you choose (any length, or 1 to 4 pages). The PDF is real text, so applicant tracking systems can read it.
- Copy your resume as plain text for application forms.
- Run checks you set up: words every version must include, the years of experience you claim, team sizes, words to avoid, and em dashes.

**Applications**
- Track each role from Interested through Applied, Screening, Interviewing, and Offer. When a role ends, mark it Rejected (the company passed), Withdrawn (you pulled out), or Closed (filled, paused, or went quiet). Ended roles leave the Active count.
- Record the resume version you sent, the pay range, the work setup, the next step and its date, a referral, and notes.
- Get flags for overdue next steps, no posted pay range, pay below your target, and work setups you want to avoid.

**Contacts**
- Record who you shared your resume with outside an application, such as a former colleague passing it along.
- See which version each person has, and get a warning when they have an older one.
- Set follow-up dates.

**LinkedIn headline**
- Keep every headline you've used, with when and why it changed.
- Count characters against LinkedIn's 220-character limit.
- Check that any numbers in your headline match your current resume.

A version you've sent somewhere can't be deleted, so you always have a record of what each company or person received.

## Install and run

You need [Node.js](https://nodejs.org) **22.23.4 or newer** (24 is recommended) and [Git](https://git-scm.com).

```bash
git clone https://github.com/natalia-builds/search-pipeline-tracker-app.git
cd search-pipeline-tracker-app
npm install
npm start
```

Then open **http://localhost:4321** in your browser. The first `npm start` takes a few extra seconds to build the app.

To stop the app, press **Ctrl+C** in the terminal. Your data is kept. Start it again with `npm start` any time.

To use a different port (if 4321 is taken): `npm start -- --port 4400`.

To update later, run `git pull`, then `npm install`, then `npm start -- --rebuild`.

### First steps

1. Choose **Try it with sample data** to look around with a made-up job seeker. When you're ready for your own, go to **Settings and backup → Delete everything**.
2. **Paste your resume** and select **Save version**. See [Formatting your resume](#formatting-your-resume).
3. **Set up your checks** in **Settings and backup**: your name, words every version must include, your years of experience, and any words you want to avoid. All optional.
4. **Add applications** as you pursue roles, and pick the resume version you sent.
5. **Tailor and save.** When you change your resume for a role, save it as a new version and choose the role under **Tailored for**.
6. **Download a backup** from **Settings and backup** every week or two.

## Your data and backups

Everything is saved in one SQLite file:

```
search-pipeline-tracker-app/data/tracker.sqlite
```

To keep it somewhere else, set `SPT_DATA_DIR` before starting: `SPT_DATA_DIR=~/Documents/job-search npm start`.

- **The app only listens on your own computer** (`127.0.0.1`). Other devices on your network can't reach it, and it refuses requests from other websites.
- **A daily safety copy.** The first time you change something each day, the app keeps a copy of the previous version of your data inside the same file, for the last 30 days.
- **Two windows won't overwrite each other.** If you have the app open twice and both change something, the older save is refused with a message instead of silently losing work.
- **Backups are still your safety net.** Choose **Settings and backup → Download backup** to save a `.json` file. Keep it somewhere safe, such as a cloud drive. The app reminds you when your last backup is more than two weeks old. To move to another computer, download a backup there and choose **Restore from a backup file**.
- **Don't delete the project folder** without saving a backup first. The `data` folder is inside it.

Backups and the data file contain your resume and your contacts' details, so keep them as private as you would the resume itself. The `data` folder is excluded from Git, so it won't be committed by accident.

## Moving over from the browser version

1. Open the [browser version](https://natalia-builds.github.io/search-pipeline-and-tracker/) in the browser you've been using. Choose **Settings and backup → Download backup**.
2. Start this app, open **Settings and backup**, and choose **Restore from a backup file**. Pick the file you just downloaded.

## Formatting your resume

The resume editor uses a few simple marks to know what's a heading, a bullet, or a date. This keeps your resume as plain text, which is what makes the PDF readable by applicant tracking systems.

| To get | Type |
| --- | --- |
| Your name at the top | `# ` then your name, on the first line |
| A section heading, such as Experience | `## ` then the heading |
| A company or school name | `### ` then the name |
| A bullet point | `* ` then the text |
| **Bold** text, such as a key number | `**` on both sides: `**31%**` |
| Dates lined up on the right | Press **Tab** between the job title and the dates |
| Your contact details, in smaller gray text | Put them on the line right after your name |

In the editor, the Tab key types a tab. To move on to the next field, press Esc and then Tab, or press Shift+Tab to go back. The same help, with this example, is under **How to format your resume** above the editor.

Here's a short example. The space before each date is a Tab.

```
# Jordan Rivera
jordan.rivera@example.com | 555.010.0199 | Springfield

## Experience
### Brightline Payments
Senior Product Manager	2021 - Present
* Led an invoicing redesign that cut time to first payment by **31%**
* Managed 4 direct reports across product and design

## Education
State University	B.A. Economics
```

**The quickest way in, if your resume is in Google Docs:** choose **File → Download → Markdown (.md)**, open the downloaded file in a text editor, and paste everything into the tracker. Headings come across if your resume uses Google Docs heading styles. The tracker removes the extra backslashes that Google Docs adds. If your dates don't line up on the right, put a Tab between each job title and its dates.

**If your resume is in Word or a PDF,** paste it in, then add the marks above. It usually takes a few minutes, and you only do it once.

## Limits

- **US Letter only:** PDFs are US Letter size (8.5 × 11 inches), not A4.
- **No syncing:** nothing syncs between computers. Use a backup file to move your data.
- **One person per install:** there are no accounts or sign-in. Anyone who can open your computer's browser to this app can see your data, so run it only on a computer you trust.
- **English only:** the tool's text is in English.
- **Simple formatting:** resumes use the marks above. There are no tables, columns, images, or custom fonts.

## Accessibility

The app aims to meet WCAG 2.2 Level AA. The screens come from the browser version, which has been checked for color contrast in light and dark mode, use at a 375-pixel phone width, labels and error messages on form fields, keeping keyboard focus in place, and announcing results to screen readers. It hasn't yet been tested with a screen reader by a person, or in Safari or Firefox, so it hasn't had a full accessibility review. If something doesn't work for you, please [open an issue](https://github.com/natalia-builds/search-pipeline-tracker-app/issues).

## Questions, bugs and ideas

Please [open an issue](https://github.com/natalia-builds/search-pipeline-tracker-app/issues) on GitHub. Never paste your real resume, contacts, or a backup file into an issue, because issues are public.

## For developers

Built with [Astro](https://astro.build) and TypeScript for the screens, a small Node server with the SQLite that ships inside Node (`node:sqlite`, so no native packages to compile), [Vitest](https://vitest.dev) for tests, and [jsPDF](https://github.com/parallax/jsPDF) for PDFs.

```bash
npm install      # download the packages the project needs
npm run dev      # app with live reload at http://localhost:4321 (server on 4322)
npm start        # build once, then run the app as people will use it
npm test         # run the automated tests
npm run build    # build the screens into dist/
```

**Where things live**
- `server/app.mjs`: the local server. It serves `dist/` and saves your library through `GET` and `PUT /api/library`, with checks that keep other websites out. `server/index.mjs` starts it.
- `src/lib/`: the logic, with tests. Formatting, comparing versions, checks, backups, PDFs, sample data. `serverStore.ts` is how the screens save through the server.
- `src/scripts/app.ts`: the interactive page. `src/pages/index.astro`: the page shell. `src/styles/app.css`: styles.
- `scripts/`: the `npm start` and `npm run dev` launchers.
- `CLAUDE.md`: the project's principles and workflow.

**Contributing:** open an issue first to talk through the change. Then make a branch, keep the pull request to one purpose, and run `npm test` and `npm run build` before you push. Please keep the app private by default: no accounts, analytics, or requests to other sites.

## License

[MIT](LICENSE). The Carlito font used in PDFs is under the [SIL Open Font License](public/fonts/OFL.txt).
