// @vitest-environment happy-dom
/** Smoke test of the wiring: the real page and main.ts. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from web/, where index.html lives.
const html = readFileSync(join(process.cwd(), "index.html"), "utf-8");
const css = readFileSync(join(process.cwd(), "src", "style.css"), "utf-8");

describe("the page", () => {
  it("shows home with the hero title and the version", async () => {
    document.documentElement.innerHTML = html.replace(/<script[^>]*><\/script>/, "");
    await import("./main");
    expect(document.getElementById("home")?.hidden).toBe(false);
    expect(document.getElementById("hero")?.textContent).toBe("Mutualornot");
    expect(document.getElementById("version")?.textContent).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it("loads nothing from another origin", () => {
    // Only the SVG namespace may name a URL in the page and its styles (ADR 0001).
    const urls = `${html}\n${css}`.match(/https?:\/\/[^\s"')]+/g) ?? [];
    expect(urls.filter((url) => !url.startsWith("http://www.w3.org/"))).toEqual([]);
  });
});
