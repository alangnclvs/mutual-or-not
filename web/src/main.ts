/** The page: wires the screens of docs/design.md (Screens) to the modules. */

import "@fontsource/archivo-black/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./style.css";
import { version } from "../package.json";
import { type Analysis, analyse, type ListKey, lists, type Row } from "./analysis";
import { readUsername } from "./export_parser";
import { type ExportData, readExport, type UploadedFile } from "./export_reader";
import { thumbnail } from "./photo";
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
import { formatDay, formatMonth, STRINGS, type Strings } from "./strings";
import { LANGUAGES, type Language, THEMES, type Theme } from "./types";

type Screen = "home" | "summary" | "list";
const SCREENS: Screen[] = ["home", "summary", "list"];
const DEPTH: Record<Screen, number> = { home: 0, summary: 1, list: 2 };
const CONFIRM_MS = 2500;

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
};
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** localStorage, or a memory stand-in when the browser refuses it. */
function deviceStorage(): KeyValueStorage {
  try {
    const storage = window.localStorage;
    storage.getItem("mon.language");
    return storage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    };
  }
}

const storage = deviceStorage();
const app = {
  language: loadLanguage(storage, detectLanguage(navigator.language)) as Language,
  theme: loadTheme(storage) as Theme,
  current: null as Analysis | null,
  list: "notFollowingBack" as ListKey,
  /** Notes shown on top of the summary after an upload: storage full, photo unreadable. */
  notes: [] as string[],
  busy: false,
};
const t = (): Strings => STRINGS[app.language];
let shown: Screen | null = null;

// ---------- screens ----------

function show(screen: Screen): void {
  for (const name of SCREENS) $(`#${name}`).hidden = name !== screen;
  if (shown !== null && shown !== screen) {
    const node = $(`#${screen} > .wrap:last-child`);
    node.classList.remove("enter-forward", "enter-back");
    void node.offsetWidth;
    node.classList.add(DEPTH[screen] >= DEPTH[shown] ? "enter-forward" : "enter-back");
  }
  if (screen === "home") {
    const hero = $("#hero");
    hero.classList.remove("rise");
    void hero.offsetWidth;
    hero.classList.add("rise");
  }
  shown = screen;
  syncThemeColor();
  window.scrollTo?.(0, 0);
}

function render(): void {
  if (shown === "home" || shown === null) renderHome();
  if (shown === "summary") renderSummary();
  if (shown === "list") renderList();
}

/** The phone's status bar takes the screen's colour. */
function syncThemeColor(color?: string): void {
  const value = color ?? getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!value) return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = value;
    meta.removeAttribute("media");
  }
}

function applyTexts(): void {
  document.documentElement.lang = app.language === "pt" ? "pt-BR" : "en";
  for (const element of document.querySelectorAll<HTMLElement>("[data-t]")) {
    const value = t()[element.dataset.t as keyof Strings];
    if (typeof value === "string") element.textContent = value;
  }
  for (const b of document.querySelectorAll<HTMLElement>("[data-theme-set]")) {
    b.textContent = t().themes[b.dataset.themeSet as Theme];
  }
  $("#how-steps").innerHTML = t()
    .steps.map((step) => `<li>${step}</li>`)
    .join("");
  $("#how-tip").innerHTML = t().searchTip;
  $("#version").textContent = `v${version}`;
  $("#settings-version").textContent = `v${version}`;
  renderSettings();
}

function applyTheme(): void {
  if (app.theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = app.theme;
  if (shown) syncThemeColor();
}

// ---------- home ----------

function notify(text: string | null): void {
  const notice = $("#notice");
  notice.hidden = text === null;
  notice.textContent = text ?? "";
}

function renderHome(): void {
  const analyses = loadAnalyses(storage);
  $("#saved").hidden = analyses.length === 0;
  $("#saved-list").innerHTML = analyses
    .map(
      (a) => `<li><button type="button" class="row-btn" data-owner="${esc(a.owner)}">
        <span class="u">@${esc(a.owner)}</span><span class="m">${formatDay(t(), a.exportDate)}</span><span class="go" aria-hidden="true">→</span>
      </button></li>`,
    )
    .join("");
  const choose = $("#choose");
  choose.textContent = app.busy ? t().reading : t().chooseFile;
  choose.setAttribute("aria-busy", String(app.busy));
}

function setBusy(busy: boolean): void {
  app.busy = busy;
  renderHome();
}

const uploaded = (file: File): UploadedFile => ({
  name: file.name,
  size: file.size,
  lastModified: file.lastModified,
  bytes: async () => new Uint8Array(await file.arrayBuffer()),
});

async function upload(files: File[]): Promise<void> {
  if (app.busy || files.length === 0) return;
  notify(null);
  setBusy(true);
  const result = await readExport(files.map(uploaded));
  setBusy(false);
  if (!result.ok) {
    notify(t().notices[result.error]);
    return;
  }
  const owner = result.data.owner ?? (await askOwner());
  if (owner) await finish(result.data, owner);
}

async function finish(data: ExportData, owner: string): Promise<void> {
  const source = data.profile?.photo ?? null;
  const photo = source ? await thumbnail(source.bytes, source.type) : null;
  const previous = loadAnalysis(storage, owner);
  const result = analyse({ data, owner, photo }, previous);
  if (!result.ok) {
    const stored = previous ? formatDay(t(), previous.exportDate) : "";
    notify(t().older(formatDay(t(), data.exportDate), owner, stored));
    return;
  }
  app.notes = [];
  if (!saveAnalysis(storage, result.analysis)) app.notes.push(t().notices.full);
  if (source && !photo) app.notes.push(t().notices.photo);
  app.current = result.analysis;
  renderSummary();
  show("summary");
}

/** The owner of an export that does not name it, asked once; null when the person cancels. */
function askOwner(): Promise<string | null> {
  const sheet = $("#owner-sheet");
  const form = $<HTMLFormElement>("#owner-form");
  const input = $<HTMLInputElement>("#owner");
  const error = $("#owner-error");
  input.value = "";
  error.hidden = true;
  sheet.hidden = false;
  input.focus();
  return new Promise((resolve) => {
    const close = (owner: string | null) => {
      sheet.hidden = true;
      form.removeEventListener("submit", submit);
      $("#owner-cancel").removeEventListener("click", cancel);
      resolve(owner);
    };
    const submit = (event: Event) => {
      event.preventDefault();
      const owner = readUsername(input.value);
      if (owner) close(owner);
      else error.hidden = false;
    };
    const cancel = () => close(null);
    form.addEventListener("submit", submit);
    $("#owner-cancel").addEventListener("click", cancel);
  });
}

// ---------- summary ----------

function profileCard(a: Analysis): string {
  const name = a.profile?.name;
  const photo = a.profile?.photo;
  const avatar = photo ? `<img src="${esc(photo)}" alt="" />` : esc((name ?? a.owner).charAt(0));
  return `<div class="profile"><div class="avatar" aria-hidden="true">${avatar}</div>
    <div>${name ? `<p class="p-name">${esc(name)}</p><p class="p-user">@${esc(a.owner)}</p>` : `<p class="p-name">@${esc(a.owner)}</p>`}</div></div>`;
}

function renderSummary(): void {
  const a = app.current;
  if (!a) return;
  const l = lists(a);
  const s = t();
  const figure = (key: ListKey, value: string, hot = false) =>
    `<button type="button" class="figure" data-list="${key}"><span class="fl">${esc(s.lists[key])}</span><span class="fn${hot ? " hot" : ""}">${value}</span></button>`;
  const low = a.activity === "read" ? String(l.barelyInteract.length) : "—";
  const changes = a.changes
    ? `<p class="eyebrow">${esc(s.sinceAnalysis(formatDay(s, a.changes.since)))}</p>
       <div class="figures">${figure("unfollowed", `−${l.unfollowed.length}`, true)}${figure("started", `+${l.started.length}`)}</div>`
    : "";
  $("#summary-body").innerHTML = `
    ${profileCard(a)}
    <p class="eyebrow">${esc(s.exportOf(formatDay(s, a.exportDate)))} · ${a.following.length} ${esc(s.following)}</p>
    ${app.notes.map((note) => `<p class="notice">${esc(note)}</p>`).join("")}
    <div><p class="poster-n" id="poster-count">${l.notFollowingBack.length}</p><p class="poster-l">${esc(s.lists.notFollowingBack)}</p></div>
    <button type="button" class="play" data-list="notFollowingBack">${esc(s.seeList)}</button>
    <div class="figures">
      ${figure("mutuals", String(l.mutuals.length))}
      ${figure("barelyInteract", low)}
      ${figure("youDontFollowBack", String(l.youDontFollowBack.length))}
      <div class="figure static"><span class="fl">${esc(s.followers)}</span><span class="fn">${a.followers.length}</span></div>
    </div>
    ${changes}
    <button type="button" class="play secondary" data-new-export>${esc(s.newExport)}</button>`;
}

// ---------- list ----------

function rowMeta(key: ListKey, row: Row): string {
  if (key === "barelyInteract") {
    const n = row.count ?? 0;
    return `<span class="m${n === 0 ? " zero" : ""}">${esc(t().interactions(n))}</span>`;
  }
  return row.since
    ? `<span class="m">${esc(t().since(formatMonth(t(), row.since)))}</span>`
    : "<span></span>";
}

function renderList(): void {
  const a = app.current;
  if (!a) return;
  const s = t();
  const key = app.list;
  const all = lists(a)[key];
  const query = readUsername($<HTMLInputElement>("#search").value) ?? "";
  const rows = query ? all.filter((row) => row.username.includes(query)) : all;
  $("#list-bar-title").textContent = s.lists[key];
  $("#list-title").textContent = s.lists[key];
  $("#list-eyebrow").textContent = `${all.length} · ${formatDay(s, a.exportDate)}`;
  const rule = $("#list-rule");
  rule.hidden = key !== "barelyInteract";
  rule.textContent =
    a.activity === "none"
      ? s.activityNone
      : a.activity === "unreadable"
        ? s.activityUnreadable
        : s.lowRule;
  $("#people").innerHTML =
    rows.length === 0
      ? `<li><p class="empty">${esc(all.length === 0 ? s.emptyList : s.noMatch)}</p></li>`
      : rows
          .map(
            (row) =>
              `<li><a href="https://www.instagram.com/${encodeURIComponent(row.username)}/" target="_blank" rel="noopener noreferrer"><span class="u">@${esc(row.username)}</span>${rowMeta(key, row)}<span class="ext" aria-hidden="true">↗</span></a></li>`,
          )
          .join("");
}

function openList(key: ListKey): void {
  app.list = key;
  $<HTMLInputElement>("#search").value = "";
  renderList();
  show("list");
}

// ---------- settings ----------

let deleteArmed: number | null = null;

function renderSettings(): void {
  const pressed = (selector: string, on: (b: HTMLElement) => boolean) => {
    for (const b of document.querySelectorAll<HTMLElement>(selector)) {
      b.setAttribute("aria-pressed", String(on(b)));
    }
  };
  pressed("[data-language]", (b) => b.dataset.language === app.language);
  pressed("[data-theme-set]", (b) => b.dataset.themeSet === app.theme);
  $("#delete-data").textContent = deleteArmed === null ? t().deleteData : t().confirmDelete;
}

function disarmDelete(): void {
  if (deleteArmed !== null) window.clearTimeout(deleteArmed);
  deleteArmed = null;
}

function pressDelete(): void {
  if (deleteArmed === null) {
    deleteArmed = window.setTimeout(() => {
      deleteArmed = null;
      renderSettings();
    }, CONFIRM_MS);
    renderSettings();
    return;
  }
  disarmDelete();
  deleteAll(storage);
  app.current = null;
  app.language = detectLanguage(navigator.language);
  app.theme = "system";
  applyTheme();
  applyTexts();
  $("#deleted").hidden = false;
  show("home");
  renderHome();
}

function openSettings(): void {
  disarmDelete();
  $("#deleted").hidden = true;
  renderSettings();
  $("#settings").hidden = false;
}

// ---------- wiring ----------

document.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("button, [data-go]");
  if (!target) return;
  if (target.matches("[data-open-settings]")) return openSettings();
  if (target.id === "settings-close") {
    disarmDelete();
    $("#settings").hidden = true;
    return;
  }
  if (target.id === "delete-data") return pressDelete();
  if (target.id === "choose") return $<HTMLInputElement>("#file").click();
  if (target.dataset.language) {
    app.language = LANGUAGES.find((l) => l === target.dataset.language) ?? app.language;
    saveLanguage(storage, app.language);
    applyTexts();
    render();
    return;
  }
  if (target.dataset.themeSet) {
    app.theme = THEMES.find((theme) => theme === target.dataset.themeSet) ?? app.theme;
    saveTheme(storage, app.theme);
    applyTheme();
    renderSettings();
    return;
  }
  if (target.dataset.owner) {
    app.current = loadAnalysis(storage, target.dataset.owner);
    app.notes = [];
    if (app.current) {
      renderSummary();
      show("summary");
    }
    return;
  }
  if (target.dataset.list) return openList(target.dataset.list as ListKey);
  if (target.matches("[data-new-export]")) {
    show("home");
    renderHome();
    return;
  }
  if (target.dataset.go === "home") {
    show("home");
    renderHome();
    return;
  }
  if (target.dataset.go === "summary") {
    renderSummary();
    show("summary");
  }
});

$<HTMLInputElement>("#file").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  void upload(files);
});
$<HTMLInputElement>("#search").addEventListener("input", () => renderList());

// A file dropped anywhere on home, on a computer.
const homeWrap = $("#home-wrap");
homeWrap.addEventListener("dragover", (event) => {
  event.preventDefault();
  homeWrap.classList.add("dropping");
});
homeWrap.addEventListener("dragleave", () => homeWrap.classList.remove("dropping"));
homeWrap.addEventListener("drop", (event) => {
  event.preventDefault();
  homeWrap.classList.remove("dropping");
  void upload(Array.from(event.dataTransfer?.files ?? []));
});

applyTheme();
applyTexts();
renderHome();
show("home");
