import { describe, expect, it } from "vitest";
import { isStalePageError } from "./stale";

describe("spotting an out-of-date page", () => {
  it("recognises the message each browser gives", () => {
    expect(isStalePageError(new TypeError("Failed to fetch dynamically imported module: http://localhost:4321/_astro/pdf.CZLGVMxS.js"))).toBe(true);
    expect(isStalePageError(new TypeError("error loading dynamically imported module: http://localhost:4321/_astro/pdf.CZLGVMxS.js"))).toBe(true);
    expect(isStalePageError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("ignores the case of the words", () => {
    expect(isStalePageError(new Error("FAILED TO FETCH DYNAMICALLY IMPORTED MODULE"))).toBe(true);
  });

  it("accepts a plain text error", () => {
    expect(isStalePageError("Failed to fetch dynamically imported module: x")).toBe(true);
  });

  it("leaves real PDF problems alone", () => {
    expect(isStalePageError(new Error("Invalid argument passed to jsPDF.text"))).toBe(false);
    expect(isStalePageError(new Error("Failed to fetch"))).toBe(false);
    expect(isStalePageError(new TypeError("Cannot read properties of undefined"))).toBe(false);
  });

  it("copes with things that aren't errors", () => {
    for (const x of [null, undefined, 42, {}, { message: "dynamically imported module" }]) expect(isStalePageError(x)).toBe(false);
  });
});
