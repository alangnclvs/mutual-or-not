import { describe, expect, it } from "vitest";
import { formatDay, formatMonth, STRINGS } from "./strings";

describe("the UI texts", () => {
  it("exist in Portuguese and English for every key", () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.pt).sort());
    for (const language of [STRINGS.pt, STRINGS.en]) {
      for (const [key, value] of Object.entries(language)) {
        expect(value, key).toBeTruthy();
      }
    }
  });

  it("have the same steps, lists and notices in both languages", () => {
    expect(STRINGS.en.steps).toHaveLength(STRINGS.pt.steps.length);
    expect(Object.keys(STRINGS.en.lists)).toEqual(Object.keys(STRINGS.pt.lists));
    expect(Object.keys(STRINGS.en.notices)).toEqual(Object.keys(STRINGS.pt.notices));
  });

  it("write dates as the app shows them", () => {
    expect(formatDay(STRINGS.pt, "2026-10-28")).toBe("28 OUT 2026");
    expect(formatDay(STRINGS.en, "2026-09-12")).toBe("12 SEP 2026");
    expect(formatMonth(STRINGS.pt, Date.UTC(2025, 2, 15) / 1000)).toBe("MAR 2025");
  });
});
