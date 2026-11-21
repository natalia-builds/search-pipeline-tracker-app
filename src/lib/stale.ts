// Spotting "this page is out of date".
//
// Some parts of the app (such as the PDF maker) are only loaded when they're first needed. Each time the
// app is rebuilt, those files get new names and the old ones are deleted. A page that was opened before
// the update still asks for the old names, so loading fails even though nothing is wrong with the app.
// Reloading the page fixes it.
//
// Browsers word that failure differently:
//   Chrome:  "Failed to fetch dynamically imported module: http://..."
//   Firefox: "error loading dynamically imported module: http://..."
//   Safari:  "Importing a module script failed."
const STALE_PAGE = /dynamically imported module|importing a module script failed/i;

export function isStalePageError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return STALE_PAGE.test(message);
}

export const STALE_PAGE_MESSAGE = "This page is out of date because the app was updated after you opened it. Reload the page, then try again. Your saved data isn't affected.";
