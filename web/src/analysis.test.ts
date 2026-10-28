import { describe, expect, it } from "vitest";
import { type Analysis, analyse, LOW_MAX, lists, WINDOW_DAYS } from "./analysis";
import type { ExportData } from "./export_reader";

const DAY = 86_400;
/** Seconds at noon UTC of a date, for interactions. */
const at = (date: string) => Date.parse(`${date}T12:00:00Z`) / 1000;
const accounts = (...names: string[]) =>
  names.map((username, i) => ({ username, at: 1_700_000_000 + i }));

function data(over: Partial<ExportData> = {}): ExportData {
  return {
    owner: "conta",
    exportDate: "2026-10-28",
    followers: accounts("ana", "bia", "dani", "eva"),
    following: accounts("ana", "bia", "caio", "zeca"),
    interactions: [],
    activity: "read",
    profile: null,
    ...over,
  };
}

function build(over: Partial<ExportData> = {}, previous: Analysis | null = null): Analysis {
  const result = analyse({ data: data(over), owner: "conta", photo: null }, previous);
  if (!result.ok) throw new Error(result.error);
  return result.analysis;
}

const names = (rows: { username: string }[]) => rows.map((row) => row.username);

describe("the lists", () => {
  it("splits following and followers into the four lists of one export", () => {
    const l = lists(build());
    expect(names(l.notFollowingBack)).toEqual(["caio", "zeca"]);
    expect(names(l.mutuals)).toEqual(["ana", "bia"]);
    expect(names(l.youDontFollowBack)).toEqual(["dani", "eva"]);
  });

  it("orders each list by username", () => {
    const l = lists(build({ following: accounts("zeca", "caio", "ana") }));
    expect(names(l.notFollowingBack)).toEqual(["caio", "zeca"]);
  });

  it("dates a following by when the owner followed it, a follower by when it followed", () => {
    const l = lists(build());
    expect(l.notFollowingBack[0]?.since).toBe(1_700_000_002);
    expect(l.youDontFollowBack[0]?.since).toBe(1_700_000_002);
  });
});

describe("barely interact", () => {
  it(`holds the mutuals with at most ${LOW_MAX} interactions, fewest first`, () => {
    const interactions = [
      ...Array.from({ length: LOW_MAX + 1 }, () => ({ username: "ana", at: at("2026-10-01") })),
      { username: "bia", at: at("2026-10-01") },
    ];
    const l = lists(
      build({
        following: accounts("ana", "bia", "caio"),
        followers: accounts("ana", "bia", "caio"),
        interactions,
      }),
    );
    expect(l.barelyInteract).toEqual([
      { username: "caio", count: 0 },
      { username: "bia", count: 1 },
    ]);
  });

  it(`counts only the ${WINDOW_DAYS} days that end on the export date`, () => {
    const interactions = [
      { username: "ana", at: at("2025-10-28") },
      { username: "ana", at: at("2025-10-29") },
      { username: "ana", at: at("2026-10-28") },
      { username: "ana", at: at("2026-10-29") },
    ];
    const analysis = build({ interactions });
    expect(analysis.interactions.ana).toBe(2);
  });

  it("keeps counts only for accounts the owner follows", () => {
    const analysis = build({ interactions: [{ username: "stranger", at: at("2026-10-01") }] });
    expect(analysis.interactions).toEqual({});
  });

  it("is empty when the export has no activity or it could not be read", () => {
    expect(lists(build({ activity: "none" })).barelyInteract).toEqual([]);
    expect(lists(build({ activity: "unreadable" })).barelyInteract).toEqual([]);
  });
});

describe("changes", () => {
  it("do not exist on the first analysis", () => {
    const analysis = build();
    expect(analysis.changes).toBeNull();
    expect(lists(analysis).unfollowed).toEqual([]);
  });

  it("list who unfollowed and who started following since the previous analysis", () => {
    const previous = build({ exportDate: "2026-09-12", followers: accounts("ana", "bia", "flor") });
    const analysis = build({ followers: accounts("ana", "gui", "bia") }, previous);
    expect(analysis.changes?.since).toBe("2026-09-12");
    expect(names(lists(analysis).unfollowed)).toEqual(["flor"]);
    expect(names(lists(analysis).started)).toEqual(["gui"]);
  });

  it("keep the stored changes when the same export is read again", () => {
    const first = build({ exportDate: "2026-09-12", followers: accounts("ana", "flor") });
    const second = build({ followers: accounts("ana") }, first);
    const again = build({ followers: accounts("ana") }, second);
    expect(again.changes).toEqual(second.changes);
  });

  it("refuse an export older than the stored analysis", () => {
    const stored = build();
    const result = analyse(
      { data: data({ exportDate: "2026-09-12" }), owner: "conta", photo: null },
      stored,
    );
    expect(result).toEqual({ ok: false, error: "older" });
  });
});

describe("the analysis", () => {
  it("keeps the owner, the date, the activity state and the profile", () => {
    const result = analyse(
      {
        data: data({ profile: { name: "Conta", photo: null } }),
        owner: "conta",
        photo: "data:image/jpeg;base64,AA",
      },
      null,
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.analysis).toMatchObject({
      owner: "conta",
      exportDate: "2026-10-28",
      activity: "read",
      profile: { name: "Conta", photo: "data:image/jpeg;base64,AA" },
    });
  });

  it("has no profile when the export carries none", () => {
    expect(build().profile).toBeNull();
  });

  it("days of the window are whole days", () => {
    expect(WINDOW_DAYS * DAY).toBe(31_536_000);
  });
});
