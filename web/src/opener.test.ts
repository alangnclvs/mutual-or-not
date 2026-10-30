import { describe, expect, it } from "vitest";
import { openerFor } from "./opener";

describe("the opener", () => {
  it("plays in full on every opening", () => {
    expect(openerFor(false)).toBe("full");
  });

  it("plays nothing when the device asks for less motion", () => {
    expect(openerFor(true)).toBe("none");
  });
});
