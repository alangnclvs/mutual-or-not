import { describe, expect, it } from "vitest";
import type { Analysis } from "./analysis";
import { MAX_ROWS, sequenceRows } from "./sequence";

function analysis(owner: string, following: number, followers: string[]): Analysis {
  return {
    owner,
    exportDate: "2026-10-28",
    following: Array.from({ length: following }, (_, i) => ({ username: `acc${i}`, since: i })),
    followers: followers.map((username) => ({ username, since: 0 })),
    interactions: {},
    activity: "none",
    profile: null,
    changes: null,
  };
}

describe("the rows of the sequence", () => {
  it(`are at most ${MAX_ROWS} accounts the owner follows`, () => {
    const rows = sequenceRows(analysis("conta", 400, []));
    expect(rows).toHaveLength(MAX_ROWS);
    expect(new Set(rows.map((r) => r.username)).size).toBe(MAX_ROWS);
  });

  it("are all the following when there are fewer", () => {
    expect(sequenceRows(analysis("conta", 12, []))).toHaveLength(12);
  });

  it("mark who follows back", () => {
    const rows = sequenceRows(analysis("conta", 3, ["acc1"]));
    expect(rows.find((r) => r.username === "acc1")?.follows).toBe(true);
    expect(rows.filter((r) => !r.follows)).toHaveLength(2);
  });

  it("come in the same order for the same owner, and in another for another owner", () => {
    const a = sequenceRows(analysis("conta", 50, [])).map((r) => r.username);
    expect(sequenceRows(analysis("conta", 50, [])).map((r) => r.username)).toEqual(a);
    expect(sequenceRows(analysis("outra", 50, [])).map((r) => r.username)).not.toEqual(a);
  });
});
