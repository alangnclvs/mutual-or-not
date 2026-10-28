import { describe, expect, it } from "vitest";
import { type Analysis, analyse } from "./analysis";
import {
  deleteAll,
  detectLanguage,
  type KeyValueStorage,
  loadAnalyses,
  loadAnalysis,
  loadLanguage,
  loadTheme,
  saveAnalysis,
  saveLanguage,
  saveTheme,
} from "./storage";

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const blocked: KeyValueStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

function analysis(owner: string, exportDate: string): Analysis {
  const result = analyse(
    {
      owner,
      photo: null,
      data: {
        owner,
        exportDate,
        followers: [{ username: "ana", at: 1 }],
        following: [{ username: "ana", at: 2 }],
        interactions: [],
        activity: "none",
        profile: null,
      },
    },
    null,
  );
  if (!result.ok) throw new Error(result.error);
  return result.analysis;
}

describe("settings", () => {
  it("detect Portuguese from the browser and default to English", () => {
    expect(detectLanguage("pt-BR")).toBe("pt");
    expect(detectLanguage("en-US")).toBe("en");
    expect(detectLanguage(undefined)).toBe("en");
  });

  it("remember the language and the theme", () => {
    const storage = memory();
    saveLanguage(storage, "en");
    saveTheme(storage, "dark");
    expect(loadLanguage(storage, "pt")).toBe("en");
    expect(loadTheme(storage)).toBe("dark");
  });

  it("fall back when nothing or nonsense is stored", () => {
    const storage = memory();
    storage.setItem("mon.theme", "purple");
    expect(loadLanguage(storage, "pt")).toBe("pt");
    expect(loadTheme(storage)).toBe("system");
  });
});

describe("analyses", () => {
  it("are kept one per owner, the newest export first", () => {
    const storage = memory();
    saveAnalysis(storage, analysis("bia", "2026-09-01"));
    saveAnalysis(storage, analysis("ana", "2026-10-28"));
    saveAnalysis(storage, analysis("bia", "2026-09-12"));
    expect(loadAnalyses(storage).map((a) => [a.owner, a.exportDate])).toEqual([
      ["ana", "2026-10-28"],
      ["bia", "2026-09-12"],
    ]);
    expect(loadAnalysis(storage, "bia")?.exportDate).toBe("2026-09-12");
  });

  it("ignore a stored value that is not an analysis", () => {
    const storage = memory();
    saveAnalysis(storage, analysis("ana", "2026-10-28"));
    storage.setItem("mon.analysis.ana", "{broken");
    expect(loadAnalyses(storage)).toEqual([]);
    expect(loadAnalysis(storage, "ana")).toBeNull();
  });

  it("are all removed with the settings by deleting the device's data", () => {
    const storage = memory();
    saveLanguage(storage, "en");
    saveAnalysis(storage, analysis("ana", "2026-10-28"));
    saveAnalysis(storage, analysis("bia", "2026-10-28"));
    deleteAll(storage);
    expect([...storage.data.keys()]).toEqual([]);
  });

  it("report a save that did not fit", () => {
    const storage = memory();
    const full: KeyValueStorage = {
      ...storage,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(saveAnalysis(full, analysis("ana", "2026-10-28"))).toBe(false);
    expect(saveAnalysis(storage, analysis("ana", "2026-10-28"))).toBe(true);
  });
});

describe("blocked storage", () => {
  it("never throws", () => {
    expect(loadLanguage(blocked, "pt")).toBe("pt");
    expect(loadTheme(blocked)).toBe("system");
    expect(loadAnalyses(blocked)).toEqual([]);
    expect(saveAnalysis(blocked, analysis("ana", "2026-10-28"))).toBe(false);
    expect(() => deleteAll(blocked)).not.toThrow();
  });
});
