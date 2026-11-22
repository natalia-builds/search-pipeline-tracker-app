import { describe, expect, it } from "vitest";
import { appOrigin, isAppUrl, isWebLink } from "./urls.mjs";

describe("isAppUrl", () => {
  it("accepts pages on the app's own address and port", () => {
    expect(isAppUrl("http://127.0.0.1:4399/", 4399)).toBe(true);
    expect(isAppUrl("http://127.0.0.1:4399/#applications", 4399)).toBe(true);
    expect(isAppUrl("http://127.0.0.1:4399/api/library", 4399)).toBe(true);
  });

  it("rejects another port, host or scheme", () => {
    expect(isAppUrl("http://127.0.0.1:4400/", 4399)).toBe(false);
    expect(isAppUrl("http://localhost:4399/", 4399)).toBe(false);
    expect(isAppUrl("https://127.0.0.1:4399/", 4399)).toBe(false);
    expect(isAppUrl("https://example.com/", 4399)).toBe(false);
    expect(isAppUrl("file:///etc/passwd", 4399)).toBe(false);
  });

  it("is not fooled by look-alike addresses", () => {
    expect(isAppUrl("http://127.0.0.1:4399@example.com/", 4399)).toBe(false);
    expect(isAppUrl("http://127.0.0.1:4399.example.com/", 4399)).toBe(false);
    expect(isAppUrl("http://example.com/http://127.0.0.1:4399/", 4399)).toBe(false);
  });

  it("rejects things that are not addresses", () => {
    expect(isAppUrl("", 4399)).toBe(false);
    expect(isAppUrl("not a url", 4399)).toBe(false);
    expect(isAppUrl(undefined, 4399)).toBe(false);
  });
});

describe("isWebLink", () => {
  it("accepts http and https links", () => {
    expect(isWebLink("https://example.com/jobs/123")).toBe(true);
    expect(isWebLink("http://example.com")).toBe(true);
  });

  it("rejects links that could start other programs or read files", () => {
    for (const url of ["file:///etc/passwd", "javascript:alert(1)", "mailto:a@b.co", "ssh://example.com", "smb://example.com/share", "data:text/html,hi", "vscode://open", "about:blank"]) {
      expect(isWebLink(url)).toBe(false);
    }
  });

  it("rejects things that are not addresses", () => {
    expect(isWebLink("")).toBe(false);
    expect(isWebLink("example.com")).toBe(false);
    expect(isWebLink(null)).toBe(false);
  });
});

describe("appOrigin", () => {
  it("is this computer only", () => {
    expect(appOrigin(4399)).toBe("http://127.0.0.1:4399");
  });
});
