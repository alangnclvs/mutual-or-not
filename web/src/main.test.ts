// @vitest-environment happy-dom
/** Smoke test of the wiring: the real page and main.ts, driven through its file input. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { exportFiles, exportZip, follower, followingEntry, like } from "./test_exports";

// Vitest runs from web/, where index.html lives.
const html = readFileSync(join(process.cwd(), "index.html"), "utf-8");
const css = readFileSync(join(process.cwd(), "src", "style.css"), "utf-8");

const $ = (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
};
const visible = (selector: string) => !$(selector).hidden;
const click = (selector: string) => $(selector).click();

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("timed out");
}

function choose(...files: File[]): void {
  const input = $("#file") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change"));
}

const zipFile = (name: string, bytes: Uint8Array) => new File([new Uint8Array(bytes)], name);

const first = {
  followers: [follower("ana", 1), follower("bia", 2), follower("dani", 3)],
  following: [
    followingEntry("ana", 4),
    followingEntry("bia", 5),
    followingEntry("caio", 6),
    followingEntry("zeca", 7),
  ],
  likedPosts: [like("ana", Date.UTC(2026, 9, 1) / 1000)],
};

/** Whether the page sees `prefers-reduced-motion: reduce`; most tests skip the sequence. */
let reducedMotion = true;

beforeAll(async () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") && reducedMotion,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  localStorage.clear();
  document.documentElement.innerHTML = html.replace(/<script[^>]*><\/script>/, "");
  await import("./main");
});

describe("the page", () => {
  it("shows home with the hero title and the version", () => {
    expect(visible("#home")).toBe(true);
    expect($("#hero").textContent).toBe("Mutualornot");
    expect($("#version").textContent).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(visible("#saved")).toBe(false);
  });

  it("loads nothing from another origin", () => {
    // Only the SVG namespace may name a URL in the page and its styles (ADR 0001).
    const urls = `${html}\n${css}`.match(/https?:\/\/[^\s"')]+/g) ?? [];
    expect(urls.filter((url) => !url.startsWith("http://www.w3.org/"))).toEqual([]);
  });

  it("refuses an HTML export with a notice", async () => {
    choose(new File(["<html></html>"], "followers_1.html"));
    await until(() => visible("#notice"));
    expect($("#notice").textContent).toContain("HTML");
    expect(visible("#home")).toBe(true);
  });

  it("reads a ZIP into the summary", async () => {
    choose(zipFile("instagram-conta.exemplo-2026-10-28-abc.zip", exportZip(first)));
    await until(() => visible("#summary"));
    // Under reduced motion the summary opens at once, with no sequence.
    expect(document.querySelector(".seq")).toBeNull();
    expect(visible("#notice")).toBe(false);
    expect($("#poster-count").textContent).toBe("2");
    const figures = [...document.querySelectorAll("#summary-body .figure .fn")].map(
      (n) => n.textContent,
    );
    // mutuals, barely interact (bia: none; ana: one like), you don't follow back, followers
    expect(figures).toEqual(["2", "2", "1", "3"]);
    expect($("#summary-body").textContent).toContain("@conta.exemplo");
  });

  it("opens a list, searches it and links each account to Instagram", async () => {
    click('[data-list="notFollowingBack"]');
    expect(visible("#list")).toBe(true);
    const links = () => [...document.querySelectorAll<HTMLAnchorElement>("#people a")];
    expect(links().map((a) => a.href)).toEqual([
      "https://www.instagram.com/caio/",
      "https://www.instagram.com/zeca/",
    ]);
    const search = $("#search") as HTMLInputElement;
    search.value = "@ZE";
    search.dispatchEvent(new Event("input"));
    expect(links()).toHaveLength(1);
    click('#list [data-go="summary"]');
    expect(visible("#summary")).toBe(true);
  });

  it("lists the saved analysis on home", () => {
    click('#summary [data-go="home"]');
    expect(visible("#saved")).toBe(true);
    expect($("#saved-list").textContent).toContain("@conta.exemplo");
  });

  it("shows who unfollowed and who started following on the next export", async () => {
    const next = { ...first, followers: [follower("ana", 1), follower("eva", 8)] };
    reducedMotion = false;
    choose(zipFile("instagram-conta.exemplo-2026-11-28-abc.zip", exportZip(next)));
    // The sequence plays over home; a tap skips it to the summary.
    await until(() => document.querySelector(".seq") !== null);
    expect(document.querySelector(".seq-cap")?.textContent).toBe("Analysing @conta.exemplo");
    (document.querySelector(".seq") as HTMLElement).click();
    reducedMotion = true;
    await until(() => visible("#summary"));
    await until(() => document.querySelector(".seq") === null);
    const body = $("#summary-body").textContent ?? "";
    expect(body).toContain("−2");
    expect(body).toContain("+1");
  });

  it("asks whose export it is when loose JSON files do not say", async () => {
    click('#summary [data-go="home"]');
    const files = exportFiles(first);
    const pick = (path: string) =>
      new File([new Uint8Array(files[path] ?? new Uint8Array())], path.split("/").pop() ?? path);
    choose(
      pick("connections/followers_and_following/followers_1.json"),
      pick("connections/followers_and_following/following.json"),
    );
    await until(() => visible("#owner-sheet"));
    ($("#owner") as HTMLInputElement).value = "not a username";
    ($("#owner-form") as HTMLFormElement).requestSubmit();
    expect(visible("#owner-error")).toBe(true);
    ($("#owner") as HTMLInputElement).value = "@Outra.Conta";
    ($("#owner-form") as HTMLFormElement).requestSubmit();
    await until(() => visible("#summary"));
    expect($("#summary-body").textContent).toContain("@outra.conta");
  });

  it("switches the language and deletes the device's data on a second tap", async () => {
    click("[data-open-settings]");
    click('[data-language="en"]');
    expect($("#summary-body").textContent).toContain("Don’t follow you back");
    click("#delete-data");
    expect($("#delete-data").textContent).toBe("Tap again to delete");
    click("#delete-data");
    expect(localStorage.length).toBe(0);
    click("#settings-close");
    expect(visible("#home")).toBe(true);
    expect(visible("#saved")).toBe(false);
  });

  it("names the missing file of an incomplete export", async () => {
    const onlyFollowers = zipSync({
      "connections/followers_and_following/followers_1.json": strToU8(
        JSON.stringify([follower("ana", 1)]),
      ),
    });
    choose(zipFile("a.zip", onlyFollowers));
    await until(() => visible("#notice"));
    expect($("#notice").textContent).toContain("following.json");
  });
});
