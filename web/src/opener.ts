/** Which opening the app plays (docs/design.md, Opener). */

export type Opener = "full" | "none";

/** The full vignette on every opening, nothing for less motion. */
export function openerFor(reducedMotion: boolean): Opener {
  return reducedMotion ? "none" : "full";
}
