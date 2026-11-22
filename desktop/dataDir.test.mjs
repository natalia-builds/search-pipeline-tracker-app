import { describe, expect, it } from "vitest";
import { isAbsolute, join, resolve } from "node:path";
import { desktopDataDir } from "./dataDir.mjs";

const userDataDir = join(resolve("/"), "Users", "someone", "AppData", "Job Search Tracker");

describe("desktopDataDir", () => {
  it("uses a data folder inside the app-data folder by default", () => {
    expect(desktopDataDir({ userDataDir })).toBe(join(userDataDir, "data"));
  });

  it("lets SPT_DATA_DIR win, as it does for npm start", () => {
    const elsewhere = join(resolve("/"), "Documents", "job-search");
    expect(desktopDataDir({ envDir: elsewhere, userDataDir })).toBe(elsewhere);
  });

  it("treats an empty SPT_DATA_DIR as not set", () => {
    expect(desktopDataDir({ envDir: "", userDataDir })).toBe(join(userDataDir, "data"));
    expect(desktopDataDir({ envDir: undefined, userDataDir })).toBe(join(userDataDir, "data"));
  });

  it("always returns an absolute path, even for a relative SPT_DATA_DIR", () => {
    const p = desktopDataDir({ envDir: "my-data", userDataDir });
    expect(isAbsolute(p)).toBe(true);
    expect(p).toBe(resolve("my-data"));
  });

  it("never falls back to the project folder", () => {
    expect(desktopDataDir({ userDataDir })).not.toContain(process.cwd());
  });
});
