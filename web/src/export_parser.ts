/**
 * The JSON files of an Instagram export, read into accounts and interactions
 * (docs/design.md, Reading the export). Labels follow the account's language, so every rule that
 * looks for a label has a structural fallback that does not.
 */

/** An account with the moment that ties it to the owner: when it followed, or when it was liked. */
export interface Account {
  username: string;
  /** Seconds since the epoch, as Instagram writes it. */
  at: number;
}

export interface Profile {
  username: string | null;
  name: string | null;
  /** The photo's path inside the ZIP. */
  photo: string | null;
}

const OWNER_TITLES = new Set(["owner", "proprietário", "proprietario", "dono", "autor"]);
const USERNAME_LABELS = new Set([
  "username",
  "nome de usuário",
  "nome de usuario",
  "nome do usuário",
]);
const NAME_LABELS = new Set(["name", "nome"]);
const MEDIA_OWNER_KEYS = [
  "media owner",
  "proprietário da mídia",
  "proprietario da midia",
  "dono da mídia",
];
const STORY_URL = /instagram\.com\/stories\/([^/?#]+)/i;
const IMAGE_PATH = /\.(jpe?g|png|webp|heic)$/i;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const lower = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

/** A username as the lists compare it, or null when the text cannot be one. */
export function readUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const username = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(username) ? username : null;
}

function fromLink(href: unknown): string | null {
  if (typeof href !== "string") return null;
  try {
    const segments = new URL(href).pathname.split("/").filter((s) => s && s !== "_u");
    return readUsername(segments[segments.length - 1]);
  } catch {
    return null;
  }
}

/** The items of a file: the file itself when it is a list, else the first list inside it. */
function itemsOf(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (!isObject(json)) return [];
  if ("label_values" in json || "string_map_data" in json) return [json];
  const list = Object.values(json).find(Array.isArray);
  return list ?? [];
}

/** Followers (`followers_*.json`) or following (`following.json`), once each. */
export function parseAccounts(json: unknown): Account[] {
  const seen = new Set<string>();
  const accounts: Account[] = [];
  for (const item of itemsOf(json)) {
    if (!isObject(item)) continue;
    const data = Array.isArray(item.string_list_data) ? item.string_list_data[0] : undefined;
    const entry = isObject(data) ? data : {};
    const username = readUsername(entry.value) ?? readUsername(item.title) ?? fromLink(entry.href);
    if (!username || seen.has(username)) continue;
    seen.add(username);
    accounts.push({ username, at: typeof entry.timestamp === "number" ? entry.timestamp : 0 });
  }
  return accounts;
}

/** The first value `find` returns while walking the tree depth first. */
function walk<T>(node: unknown, find: (node: Json) => T | null): T | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = walk(child, find);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isObject(node)) return null;
  const here = find(node);
  if (here !== null) return here;
  for (const child of Object.values(node)) {
    if (typeof child === "object") {
      const found = walk(child, find);
      if (found !== null) return found;
    }
  }
  return null;
}

/** By the labels: the block titled Owner, and the entry labelled Username inside it. */
function ownerByLabels(item: Json): string | null {
  return walk(item, (node) =>
    OWNER_TITLES.has(lower(node.title))
      ? walk(node, (inner) =>
          USERNAME_LABELS.has(lower(inner.label)) ? readUsername(inner.value) : null,
        )
      : null,
  );
}

/**
 * By the structure: the owner is the middle one of three sibling titled blocks (Hashtags, Owner,
 * Brand partner), and its username the third entry of its group (URL, Name, Username).
 */
function ownerByStructure(item: Json): string | null {
  const inList = (list: unknown[]): string | null => {
    const titled = list.filter(
      (x) => isObject(x) && x.label === undefined && lower(x.title) !== "",
    );
    if (titled.length === 3) {
      const groups = (titled[1] as Json).dict;
      const group = Array.isArray(groups) && isObject(groups[0]) ? groups[0].dict : undefined;
      if (Array.isArray(group)) {
        const entry = group[2] ?? group[group.length - 1];
        return isObject(entry) ? readUsername(entry.value) : null;
      }
    }
    return null;
  };
  const search = (node: unknown): string | null => {
    if (Array.isArray(node)) {
      const here = inList(node);
      if (here !== null) return here;
      for (const child of node) {
        const found = search(child);
        if (found !== null) return found;
      }
    } else if (isObject(node)) {
      for (const child of Object.values(node)) {
        const found = search(child);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return search(item);
}

function ownerByStoryLink(item: Json): string | null {
  return walk(item, (node) => {
    for (const value of Object.values(node)) {
      const match = typeof value === "string" ? STORY_URL.exec(value) : null;
      if (match) return readUsername(match[1]);
    }
    return null;
  });
}

function commentOwner(map: Json): string | null {
  const byKey = Object.entries(map).find(([key]) => MEDIA_OWNER_KEYS.includes(key.toLowerCase()));
  // Comment, Media Owner, Time: the owner is the second key when its label is not known.
  const entry = byKey?.[1] ?? Object.values(map)[1];
  return isObject(entry) ? readUsername(entry.value) : null;
}

function ownerOf(item: Json): string | null {
  if (isObject(item.string_map_data)) return commentOwner(item.string_map_data);
  if (Array.isArray(item.string_list_data)) return readUsername(item.title);
  return ownerByLabels(item) ?? ownerByStructure(item) ?? ownerByStoryLink(item);
}

function timeOf(item: Json): number {
  if (typeof item.timestamp === "number") return item.timestamp;
  const stamped = walk(item, (node) =>
    typeof node.timestamp === "number" ? node.timestamp : null,
  );
  return stamped ?? 0;
}

/**
 * The owner's interactions in one activity file: likes, comments, story replies. `items` counts
 * every item, read or not, so an export whose owners cannot be read is told apart from an empty one.
 */
export function parseInteractions(json: unknown): { items: number; interactions: Account[] } {
  const items = itemsOf(json).filter(isObject);
  const interactions: Account[] = [];
  for (const item of items) {
    const username = ownerOf(item);
    if (username) interactions.push({ username, at: timeOf(item) });
  }
  return { items: items.length, interactions };
}

/** The owner's profile (`personal_information.json`), as far as it can be read. */
export function parseProfile(json: unknown): Profile | null {
  const text = (labels: Set<string>) =>
    walk(json, (node) => {
      for (const [key, value] of Object.entries(node)) {
        if (labels.has(lower(key)) && isObject(value) && typeof value.value === "string")
          return value.value;
      }
      return labels.has(lower(node.label)) && typeof node.value === "string" ? node.value : null;
    });
  const username = readUsername(text(USERNAME_LABELS));
  const name = text(NAME_LABELS)?.trim() || null;
  const photo = walk(json, (node) =>
    typeof node.uri === "string" && IMAGE_PATH.test(node.uri) ? node.uri : null,
  );
  if (!username && !name) return null;
  return { username, name, photo };
}
