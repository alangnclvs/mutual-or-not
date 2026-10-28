/**
 * The sequence after an upload (docs/design.md, Sequence): the accounts the owner follows run up
 * past a red reading line, faster and faster, those that do not follow back struck by the risco as
 * they cross; the screen turns red, the count slams in, a wipe opens the summary. Every frame is a
 * function of the time since the start, as in Houdini's opener. Visual only: checked by eye.
 */

import { type SequenceRow, seeded } from "./sequence";

const ROW = 6.4;
const SCROLL_FROM = 250;
const RED_AT = 2750;
const WIPE_FROM = RED_AT + 560;
export const SEQUENCE_LENGTH_MS = RED_AT + 900;

const clamp = (x: number): number => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));
const inCubic = (p: number): number => p ** 3;
const outCubic = (p: number): number => 1 - (1 - p) ** 3;
const inOutCubic = (p: number): number => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const outExpo = (p: number): number => (p === 1 ? 1 : 1 - 2 ** (-10 * p));

function el(tag: string, cls: string, parent: Element, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent.append(e);
  return e;
}

/** The pack's risco: points jittered across the stroke, joined by curves. */
function risco(x1: number, y1: number, x2: number, y2: number, rand: () => number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const steps = 5;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const jitter = i === 0 || i === steps ? 0 : (rand() - 0.5) * 4.8;
    points.push([
      x1 + (dx * i) / steps - (dy / len) * jitter,
      y1 + (dy * i) / steps + (dx / len) * jitter,
    ]);
  }
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(x1)} ${f(y1)}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1] as [number, number];
    const [cx, cy] = points[i] as [number, number];
    d += ` Q${f(px)} ${f(py)} ${f((px + cx) / 2)} ${f((py + cy) / 2)}`;
  }
  return `${d} L${f(x2)} ${f(y2)}`;
}

/** A strike over an element: an SVG stretched to its box, drawn by its dash offset. */
function strikeOver(parent: HTMLElement, rand: () => number): SVGPathElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "seq-strike");
  svg.setAttribute("viewBox", "0 0 100 20");
  svg.setAttribute("preserveAspectRatio", "none");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", risco(0, 12 + (rand() - 0.5) * 4, 100, 8 + (rand() - 0.5) * 4, rand));
  path.setAttribute("pathLength", "1");
  svg.append(path);
  parent.append(svg);
  return path;
}

export interface SequenceTexts {
  caption: string;
  label: string;
  follows: string;
  doesNotFollow: string;
}

interface Line {
  row: HTMLElement;
  status: HTMLElement;
  y: number;
  path: SVGPathElement | null;
}

/**
 * Plays the sequence over the page; resolves when the summary should show, early on a tap.
 * `count` is the real not-following-back count, which the tally reaches and the slam shows.
 */
export function playSequence(
  rows: SequenceRow[],
  count: number,
  texts: SequenceTexts,
): Promise<void> {
  const rand = seeded(rows.length * 31 + count);
  const root = el("div", "seq", document.body);
  root.setAttribute("aria-hidden", "true");
  const stage = el("div", "seq-stage", root);
  const layer = el("div", "seq-layer", stage);
  el("div", "seq-fade", layer);
  el("div", "seq-line", layer);
  const ledger = el("div", "seq-ledger", layer);
  const tally = el("span", "seq-tally", layer, "0");
  const caption = el("span", "seq-cap", stage, texts.caption);
  const slam = el("div", "seq-slam", stage);
  const number = el("span", "seq-num", slam, String(count));
  const label = el("span", "seq-lab", slam, texts.label);
  const wipeAccent = el("div", "seq-wipe-accent", root);
  const wipe = el("div", "seq-wipe", root);

  const lines: Line[] = rows.map(({ username, follows }, i) => {
    const row = el("div", "seq-row", ledger);
    row.style.top = `${i * ROW}cqw`;
    const name = el("span", "seq-name", row, `@${username}`);
    const status = el(
      "span",
      follows ? "seq-st" : "seq-st no",
      row,
      follows ? texts.follows : texts.doesNotFollow,
    );
    return { row, status, y: i * ROW, path: follows ? null : strikeOver(name, rand) };
  });
  const struckInSample = lines.filter((line) => line.path).length;
  const distance = rows.length * ROW;
  let fitted = false;

  const render = (t: number) => {
    const red = t >= RED_AT;
    root.classList.toggle("red", red);
    layer.style.visibility = red ? "hidden" : "visible";
    caption.style.opacity = red ? "0" : String(0.6 * seg(t, 0, 240));

    const scroll =
      inCubic(seg(t, SCROLL_FROM, RED_AT - 150)) * distance + seg(t, 0, SCROLL_FROM) * ROW * 2;
    ledger.style.transform = `translateY(${-scroll}cqw)`;
    let struck = 0;
    for (const line of lines) {
      const y = line.y - scroll;
      const passed = clamp(-y / (ROW * 0.7));
      line.row.style.opacity = String(y > 70 ? 0 : y > 0 ? 1 - y / 80 : Math.max(0.15, 1 + y / 90));
      line.status.style.opacity = String(passed);
      if (line.path) {
        line.path.style.strokeDashoffset = String(1 - passed);
        line.path.style.opacity = passed > 0 ? "1" : "0";
        if (passed >= 1) struck++;
      }
    }
    tally.textContent = String(struckInSample ? Math.round((count * struck) / struckInSample) : 0);

    if (red && !fitted) {
      number.style.fontSize = "100px";
      const width = number.offsetWidth;
      if (width > 0) number.style.fontSize = `${(74 * stage.clientWidth) / width}px`;
      fitted = true;
    }
    slam.style.opacity = red ? "1" : "0";
    const start = RED_AT + 10;
    number.style.opacity = t >= start ? "1" : "0";
    number.style.transform = `scale(${1 + 1.9 * (1 - outExpo(seg(t, start, start + 160)))})`;
    const l = seg(t, RED_AT + 190, RED_AT + 330);
    label.style.opacity = String(l);
    label.style.transform = `translateY(${(1 - outCubic(l)) * 3}cqw)`;

    const p = inOutCubic(seg(t, WIPE_FROM, SEQUENCE_LENGTH_MS));
    const lead = -35 + p * 170;
    const wedge = (edge: number) => `polygon(0 0, ${edge}% 0, ${edge - 35}% 100%, 0 100%)`;
    wipe.style.clipPath = wedge(p > 0 ? lead : -40);
    wipeAccent.style.clipPath = wedge(p > 0 ? lead + 9 : -40);
  };

  return new Promise((resolve) => {
    const begin = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
      // Removed on the next frame, once the summary underneath has been drawn.
      requestAnimationFrame(() => root.remove());
    };
    // A click, not a pointerdown: the tap that skips must not land on the summary's buttons.
    root.addEventListener("click", finish);
    const frame = (now: number) => {
      if (done) return;
      const t = now - begin;
      if (t >= SEQUENCE_LENGTH_MS) return finish();
      render(t);
      requestAnimationFrame(frame);
    };
    render(0);
    requestAnimationFrame(frame);
  });
}
