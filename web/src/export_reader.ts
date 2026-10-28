/**
 * An export as the owner picks it, a ZIP or loose JSON files, read into the data the lists need
 * (docs/design.md, Reading the export). Files are found by name, wherever they sit in the ZIP.
 * The ZIP is unpacked on the main thread: fflate's async mode starts workers from blob URLs, which
 * the CSP refuses (ADR 0001).
 */

import { strFromU8, unzipSync } from "fflate";
import { type Account, parseAccounts, parseInteractions, parseProfile } from "./export_parser";

/** The whole file is read into memory; above this a phone may run out of it. */
export const MAX_BYTES = 500 * 1024 * 1024;

export interface UploadedFile {
  name: string;
  size: number;
  /** Milliseconds since the epoch. */
  lastModified: number;
  bytes(): Promise<Uint8Array>;
}

export type ReadError =
  | "unsupported"
  | "html"
  | "no_followers"
  | "no_following"
  | "too_large"
  | "corrupt";
export type Activity = "none" | "read" | "unreadable";

export interface ExportData {
  /** Null when neither the ZIP's name nor the profile names it: the app asks. */
  owner: string | null;
  /** `YYYY-MM-DD`. */
  exportDate: string;
  followers: Account[];
  following: Account[];
  /** One entry per interaction, so an account appears as many times as it was interacted with. */
  interactions: Account[];
  activity: Activity;
  profile: { name: string | null; photo: { bytes: Uint8Array; type: string } | null } | null;
}

export type ReadResult = { ok: true; data: ExportData } | { ok: false; error: ReadError };

const FOLLOWERS = /^followers(_\d+)?\.json$/;
const FOLLOWING = /^following\.json$/;
const PERSONAL = /^personal_information\.json$/;
const ACTIVITY =
  /^(liked_posts|liked_comments|story_likes|polls|quizzes|questions|emoji_sliders|story_reaction_sticker_reactions|emoji_story_reactions|reels_comments|hype|post_comments(_\d+)?)\.json$/;
const ZIP_NAME = /instagram-([a-z0-9._]+)-(\d{4}-\d{2}-\d{2})-/i;
const PHOTO_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

const baseName = (path: string) => path.split("/").pop() ?? path;
const wanted = (path: string) => {
  const name = baseName(path);
  return FOLLOWERS.test(name) || FOLLOWING.test(name) || PERSONAL.test(name) || ACTIVITY.test(name);
};
const isZip = (bytes: Uint8Array) =>
  bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

function localDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The accounts of several files, in path order, each account once. */
function merge(lists: Account[][]): Account[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .filter((account) => !seen.has(account.username) && seen.add(account.username));
}

/** The followers and following files; those of the connections folder win over any others. */
function pick(paths: string[], pattern: RegExp): string[] {
  const matching = paths.filter((path) => pattern.test(baseName(path))).sort();
  const connections = matching.filter((path) => path.includes("followers_and_following/"));
  return connections.length > 0 ? connections : matching;
}

export async function readExport(files: UploadedFile[]): Promise<ReadResult> {
  if (files.some((file) => file.size > MAX_BYTES)) return { ok: false, error: "too_large" };

  const entries = new Map<string, Uint8Array>();
  const zips: Uint8Array[] = [];
  let html = false;
  for (const file of files) {
    const bytes = await file.bytes();
    if (isZip(bytes)) {
      try {
        const unpacked = unzipSync(bytes, {
          filter: (entry) => {
            if (entry.name.endsWith(".html")) html = true;
            return wanted(entry.name);
          },
        });
        for (const [path, content] of Object.entries(unpacked)) entries.set(path, content);
      } catch {
        return { ok: false, error: "corrupt" };
      }
      zips.push(bytes);
    } else if (file.name.toLowerCase().endsWith(".json")) {
      entries.set(file.name, bytes);
    } else if (file.name.toLowerCase().endsWith(".html")) {
      html = true;
    } else {
      return { ok: false, error: "unsupported" };
    }
  }

  const json = new Map<string, unknown>();
  for (const [path, bytes] of entries) {
    try {
      json.set(path, JSON.parse(strFromU8(bytes)));
    } catch {
      return { ok: false, error: "corrupt" };
    }
  }

  const paths = [...json.keys()];
  const followerPaths = pick(paths, FOLLOWERS);
  const followingPaths = pick(paths, FOLLOWING);
  if (html && followerPaths.length === 0 && followingPaths.length === 0)
    return { ok: false, error: "html" };
  if (followerPaths.length === 0) return { ok: false, error: "no_followers" };
  if (followingPaths.length === 0) return { ok: false, error: "no_following" };
  const followers = merge(followerPaths.map((path) => parseAccounts(json.get(path))));
  const following = merge(followingPaths.map((path) => parseAccounts(json.get(path))));

  const activityPaths = paths.filter((path) => ACTIVITY.test(baseName(path))).sort();
  let items = 0;
  const interactions: Account[] = [];
  for (const path of activityPaths) {
    const read = parseInteractions(json.get(path));
    items += read.items;
    interactions.push(...read.interactions);
  }
  const activity: Activity =
    activityPaths.length === 0
      ? "none"
      : items > 0 && interactions.length === 0
        ? "unreadable"
        : "read";

  const personalPath = paths.find((path) => PERSONAL.test(baseName(path)));
  const profile = personalPath ? parseProfile(json.get(personalPath)) : null;
  let photo: { bytes: Uint8Array; type: string } | null = null;
  const photoPath = profile?.photo;
  if (photoPath) {
    const type = PHOTO_TYPES[photoPath.split(".").pop()?.toLowerCase() ?? ""];
    for (const zip of zips) {
      const found = Object.values(
        unzipSync(zip, { filter: (entry) => entry.name.endsWith(photoPath) }),
      )[0];
      if (found && type) photo = { bytes: found, type };
    }
  }

  const named = files.map((file) => ZIP_NAME.exec(file.name)).find((match) => match !== null);
  const owner = named?.[1]?.toLowerCase() ?? profile?.username ?? null;
  const exportDate = named?.[2] ?? localDate(Math.max(...files.map((file) => file.lastModified)));

  return {
    ok: true,
    data: {
      owner,
      exportDate,
      followers,
      following,
      interactions,
      activity,
      profile: profile ? { name: profile.name, photo } : null,
    },
  };
}
