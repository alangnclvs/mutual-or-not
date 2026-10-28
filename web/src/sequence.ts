/** What the sequence shows (docs/design.md, Sequence); the drawing is in sequence_view.ts. */

import type { Analysis } from "./analysis";

/** The list runs past this many accounts at most. */
export const MAX_ROWS = 150;

export interface SequenceRow {
  username: string;
  follows: boolean;
}

/** A seeded source, so the same owner sees the same list run. */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a of a text. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The accounts the owner follows, shuffled by a seed from the owner, up to MAX_ROWS. */
export function sequenceRows(analysis: Analysis): SequenceRow[] {
  const followers = new Set(analysis.followers.map((p) => p.username));
  const rows = analysis.following.map(({ username }) => ({
    username,
    follows: followers.has(username),
  }));
  const rand = seeded(hash(analysis.owner));
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rows[i], rows[j]] = [rows[j] as SequenceRow, rows[i] as SequenceRow];
  }
  return rows.slice(0, MAX_ROWS);
}
