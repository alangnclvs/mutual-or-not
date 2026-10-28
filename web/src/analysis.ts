/** What the app keeps of an export, and the lists computed from it (docs/design.md, Lists). */

import type { Activity, ExportData } from "./export_reader";

/** A mutual with at most this many interactions in the window barely interacts. */
export const LOW_MAX = 2;
/** The days, ending on the export date, whose interactions count. */
export const WINDOW_DAYS = 365;

export interface Person {
  username: string;
  /** Seconds: when the owner followed them, or when they followed the owner. */
  since: number;
}

export interface Changes {
  /** The export date of the analysis these changes are measured from. */
  since: string;
  unfollowed: Person[];
  started: Person[];
}

export interface Analysis {
  owner: string;
  exportDate: string;
  followers: Person[];
  following: Person[];
  /** Interactions in the window, for the accounts the owner follows. */
  interactions: Record<string, number>;
  activity: Activity;
  /** `photo` is a small data URL, made from the export's photo by the page. */
  profile: { name: string | null; photo: string | null } | null;
  changes: Changes | null;
}

export const LIST_KEYS = [
  "notFollowingBack",
  "mutuals",
  "barelyInteract",
  "youDontFollowBack",
  "unfollowed",
  "started",
] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export interface Row {
  username: string;
  since?: number;
  count?: number;
}

export interface AnalyseInput {
  data: ExportData;
  /** The owner, from the export or asked of the person. */
  owner: string;
  photo: string | null;
}

export type AnalyseResult = { ok: true; analysis: Analysis } | { ok: false; error: "older" };

const DAY = 86_400;
const people = (accounts: ExportData["followers"]): Person[] =>
  accounts.map(({ username, at }) => ({ username, since: at }));
const byName = (a: { username: string }, b: { username: string }) =>
  a.username < b.username ? -1 : a.username > b.username ? 1 : 0;

function countInWindow(data: ExportData): Record<string, number> {
  const [y, m, d] = data.exportDate.split("-").map(Number);
  const end = Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1) / 1000;
  const start = end - WINDOW_DAYS * DAY;
  const followed = new Set(data.following.map((a) => a.username));
  const counts: Record<string, number> = {};
  for (const { username, at } of data.interactions) {
    if (at >= start && at < end && followed.has(username))
      counts[username] = (counts[username] ?? 0) + 1;
  }
  return counts;
}

/** The analysis of an export, measured against the owner's stored one when there is one. */
export function analyse(input: AnalyseInput, previous: Analysis | null): AnalyseResult {
  const { data, owner, photo } = input;
  if (previous && previous.exportDate > data.exportDate) return { ok: false, error: "older" };
  const followers = people(data.followers);
  let changes: Changes | null = null;
  if (previous && previous.exportDate === data.exportDate) {
    changes = previous.changes;
  } else if (previous) {
    const now = new Set(followers.map((p) => p.username));
    const before = new Set(previous.followers.map((p) => p.username));
    changes = {
      since: previous.exportDate,
      unfollowed: previous.followers.filter((p) => !now.has(p.username)),
      started: followers.filter((p) => !before.has(p.username)),
    };
  }
  return {
    ok: true,
    analysis: {
      owner,
      exportDate: data.exportDate,
      followers,
      following: people(data.following),
      interactions: countInWindow(data),
      activity: data.activity,
      profile: data.profile ? { name: data.profile.name, photo } : null,
      changes,
    },
  };
}

/** The six lists of an analysis. */
export function lists(analysis: Analysis): Record<ListKey, Row[]> {
  const followers = new Set(analysis.followers.map((p) => p.username));
  const following = new Set(analysis.following.map((p) => p.username));
  const rows = (list: Person[]): Row[] =>
    list.map(({ username, since }) => ({ username, since })).sort(byName);
  const mutuals = analysis.following.filter((p) => followers.has(p.username));
  const barelyInteract =
    analysis.activity === "read"
      ? mutuals
          .map(({ username }) => ({ username, count: analysis.interactions[username] ?? 0 }))
          .filter((row) => row.count <= LOW_MAX)
          .sort((a, b) => a.count - b.count || byName(a, b))
      : [];
  return {
    notFollowingBack: rows(analysis.following.filter((p) => !followers.has(p.username))),
    mutuals: rows(mutuals),
    barelyInteract,
    youDontFollowBack: rows(analysis.followers.filter((p) => !following.has(p.username))),
    unfollowed: rows(analysis.changes?.unfollowed ?? []),
    started: rows(analysis.changes?.started ?? []),
  };
}
