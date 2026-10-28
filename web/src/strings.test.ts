import { describe, expect, it } from "vitest";
import { STRINGS } from "./strings";

describe("the UI texts", () => {
  it("exist in Portuguese and English for every key", () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.pt).sort());
    for (const language of [STRINGS.pt, STRINGS.en]) {
      for (const [key, value] of Object.entries(language)) {
        expect(value, key).toBeTruthy();
      }
    }
  });
});
