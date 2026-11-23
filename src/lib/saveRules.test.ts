import { describe, expect, it } from "vitest";
import { headlineSaveBlocker, normalizeHeadline, resumeSaveBlocker } from "./saveRules";

describe("resumeSaveBlocker", () => {
  it("allows a save when the text differs from the current version", () => {
    expect(resumeSaveBlocker("# Pat\n* New line", "# Pat")).toBeNull();
  });
  it("allows the first save when there is no current version", () => {
    expect(resumeSaveBlocker("# Pat", null)).toBeNull();
  });
  it("blocks empty text, and text that is only spaces or blank lines", () => {
    expect(resumeSaveBlocker("", "# Pat")).toBe("empty");
    expect(resumeSaveBlocker("  \n\n ", null)).toBe("empty");
  });
  it("blocks text that is the same as the current version", () => {
    expect(resumeSaveBlocker("# Pat", "# Pat")).toBe("unchanged");
  });
  it("counts a change of only spaces as a change, since resume text keeps its spacing", () => {
    expect(resumeSaveBlocker("# Pat ", "# Pat")).toBeNull();
  });
  it("blocks again when the text is changed back", () => {
    expect(resumeSaveBlocker("# Pat\n* x", "# Pat")).toBeNull();
    expect(resumeSaveBlocker("# Pat", "# Pat")).toBe("unchanged");
  });
});

describe("headlineSaveBlocker", () => {
  it("allows a save when the headline differs from the current one", () => {
    expect(headlineSaveBlocker("Payments PM", "Product manager")).toBeNull();
    expect(headlineSaveBlocker("Anything", null)).toBeNull();
  });
  it("blocks empty text", () => {
    expect(headlineSaveBlocker("", "Product manager")).toBe("empty");
    expect(headlineSaveBlocker("   ", null)).toBe("empty");
  });
  it("blocks the same headline, even with extra spaces or line breaks", () => {
    expect(headlineSaveBlocker("Product manager", "Product manager")).toBe("unchanged");
    expect(headlineSaveBlocker("  Product   manager \n", "Product manager")).toBe("unchanged");
  });
  it("tidies spaces the way a saved headline is tidied", () => {
    expect(normalizeHeadline("  Product \n  manager  ")).toBe("Product manager");
  });
});
