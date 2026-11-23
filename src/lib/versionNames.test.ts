import { describe, expect, it } from "vitest";
import { nextVersionName } from "./versionNames";

describe("nextVersionName", () => {
  it("starts at v1 when nothing is saved", () => {
    expect(nextVersionName([])).toBe("v1");
  });
  it("goes one above the highest vN", () => {
    expect(nextVersionName(["v1", "v2", "v3"])).toBe("v4");
  });
  it("counts numbers, not text: v10 comes after v9", () => {
    expect(nextVersionName(["v1", "v9", "v10"])).toBe("v11");
    expect(nextVersionName(["v2", "v10", "v9"])).toBe("v11");
  });
  it("ignores custom names, so they never change the count", () => {
    expect(nextVersionName(["v1", "Google tailored", "v2 final", "Final v7"])).toBe("v2");
    expect(nextVersionName(["Google tailored"])).toBe("v1");
  });
  it("reuses the number after the newest version is deleted", () => {
    // v3 was deleted, so History shows v1 and v2 and the next default is v3 again.
    expect(nextVersionName(["v1", "v2"])).toBe("v3");
  });
  it("follows the highest number when there are gaps", () => {
    expect(nextVersionName(["v1", "v5"])).toBe("v6");
  });
  it("accepts a capital V and stray spaces", () => {
    expect(nextVersionName(["V3", " v4 "])).toBe("v5");
  });
  it("ignores numbers too long to be a real version number", () => {
    expect(nextVersionName(["v99999999999999999999", "v2"])).toBe("v3");
  });
});
