// Rules for which addresses the desktop window may show or reach. They are plain functions, so
// they can be tested without starting Electron. The window only ever shows the local server.

/** The address the window shows: the local server, on this computer only. */
export const appOrigin = (port) => `http://127.0.0.1:${port}`;

/** True if `url` is on the app's own address. Anything else is "away from the app". */
export function isAppUrl(url, port) {
  try {
    return new URL(url).origin === appOrigin(port);
  } catch {
    return false;
  }
}

/** True for ordinary web links, the only kind we hand to the person's default browser.
 *  Never file: links or app-specific schemes (those can start other programs). */
export function isWebLink(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
