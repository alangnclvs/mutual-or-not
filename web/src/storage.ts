/** What the app keeps on the device. Every access survives blocked storage (private window). */

import type { Analysis } from "./analysis";
import { LANGUAGES, type Language, THEMES, type Theme } from "./types";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const LANGUAGE_KEY = "mon.language";
const THEME_KEY = "mon.theme";
/** The owners with a stored analysis, so they can be listed and deleted. */
const OWNERS_KEY = "mon.owners";
const analysisKey = (owner: string) => `mon.analysis.${owner}`;

function read(storage: KeyValueStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** False when the value could not be kept: blocked storage, or a full one. */
function write(storage: KeyValueStorage, key: string, value: string | null): boolean {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readJson(storage: KeyValueStorage, key: string): unknown {
  try {
    return JSON.parse(read(storage, key) ?? "null");
  } catch {
    return null;
  }
}

export function detectLanguage(browserLanguage: string | undefined): Language {
  return browserLanguage?.toLowerCase().startsWith("pt") ? "pt" : "en";
}

export function loadLanguage(storage: KeyValueStorage, detected: Language): Language {
  const saved = read(storage, LANGUAGE_KEY);
  return LANGUAGES.find((language) => language === saved) ?? detected;
}

export function saveLanguage(storage: KeyValueStorage, language: Language): void {
  write(storage, LANGUAGE_KEY, language);
}

export function loadTheme(storage: KeyValueStorage): Theme {
  const saved = read(storage, THEME_KEY);
  return THEMES.find((theme) => theme === saved) ?? "system";
}

export function saveTheme(storage: KeyValueStorage, theme: Theme): void {
  write(storage, THEME_KEY, theme);
}

function loadOwners(storage: KeyValueStorage): string[] {
  const owners = readJson(storage, OWNERS_KEY);
  return Array.isArray(owners) ? owners.filter((o): o is string => typeof o === "string") : [];
}

function isAnalysis(value: unknown): value is Analysis {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Partial<Analysis>;
  return (
    typeof a.owner === "string" &&
    typeof a.exportDate === "string" &&
    Array.isArray(a.followers) &&
    Array.isArray(a.following) &&
    typeof a.interactions === "object"
  );
}

export function loadAnalysis(storage: KeyValueStorage, owner: string): Analysis | null {
  const value = readJson(storage, analysisKey(owner));
  return isAnalysis(value) ? value : null;
}

/** Every stored analysis, the newest export first. */
export function loadAnalyses(storage: KeyValueStorage): Analysis[] {
  return loadOwners(storage)
    .map((owner) => loadAnalysis(storage, owner))
    .filter((a): a is Analysis => a !== null)
    .sort((a, b) => (a.exportDate < b.exportDate ? 1 : a.exportDate > b.exportDate ? -1 : 0));
}

/** Replaces the owner's analysis; false when it did not fit, and the old one stays. */
export function saveAnalysis(storage: KeyValueStorage, analysis: Analysis): boolean {
  if (!write(storage, analysisKey(analysis.owner), JSON.stringify(analysis))) return false;
  const owners = loadOwners(storage);
  if (!owners.includes(analysis.owner))
    write(storage, OWNERS_KEY, JSON.stringify([...owners, analysis.owner]));
  return true;
}

/** DELETE DATA ON THIS DEVICE: the analyses and the settings. */
export function deleteAll(storage: KeyValueStorage): void {
  for (const owner of loadOwners(storage)) write(storage, analysisKey(owner), null);
  for (const key of [OWNERS_KEY, LANGUAGE_KEY, THEME_KEY]) write(storage, key, null);
}
