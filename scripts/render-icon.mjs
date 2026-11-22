// Draws an SVG into a PNG with a transparent background, using Electron's own browser engine.
// `npm run icon` turns docs/app-icon.svg into build/icon.png, the master image that electron-builder
// makes the macOS, Windows and Linux icons from. Run it again after editing the SVG.
// (macOS's QuickLook, `qlmanage -t`, can also draw SVGs, but it fills the background with white.)
import { app, BrowserWindow } from "electron";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [svgPath, pngPath] = process.argv.slice(-2);
if (!svgPath?.endsWith(".svg") || !pngPath?.endsWith(".png")) {
  console.error("Usage: electron scripts/render-icon.mjs <input.svg> <output.png>");
  process.exit(1);
}
const size = 1024;
// Keep Electron's own browser files out of the app's real data folder.
const scratch = mkdtempSync(join(tmpdir(), "spt-icon-"));
app.setPath("userData", scratch);

app.whenReady().then(async () => {
  const svg = readFileSync(svgPath, "utf8").replace("<svg ", `<svg width="${size}" height="${size}" `);
  const win = new BrowserWindow({ show: false, width: size, height: size, useContentSize: true, transparent: true, frame: false, webPreferences: { offscreen: true, sandbox: true } });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)}`);
  await new Promise((done) => setTimeout(done, 600)); // let it finish painting
  writeFileSync(pngPath, (await win.webContents.capturePage()).toPNG());
  console.log(`Wrote ${pngPath}`);
  rmSync(scratch, { recursive: true, force: true });
  app.quit();
});
