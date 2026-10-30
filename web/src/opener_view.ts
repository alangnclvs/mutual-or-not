/**
 * The opener, drawn over home (docs/design.md, Opener): "Iguais", the icon's equals sign. A grid
 * of cream "=" builds from the middle outward; the risco strikes them, faster and faster, each
 * one turning into "≠", until the middle one is left: it turns red and fills the screen, the title
 * slams in, a wipe opens home. Every frame is a function of the time since the start, as in
 * Houdini's opener. Visual only: checked by eye on the phone.
 */

import { seeded } from "./sequence";

/** The grid in cqw: signs per side, a sign's box and the gap between boxes. */
const SIDE = 5;
const SIGN = 12;
const GAP = 5.5;
const STRIKES_FROM = 1000;
const ZOOM_FROM = 1950;
const RED_AT = 2280;
const WIPE_FROM = 2800;
export const OPENER_LENGTH_MS = 3150;

const clamp = (x: number): number => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));
const outCubic = (p: number): number => 1 - (1 - p) ** 3;
const inOutCubic = (p: number): number => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const outExpo = (p: number): number => (p === 1 ? 1 : 1 - 2 ** (-10 * p));
const inExpo = (p: number): number => (p === 0 ? 0 : 2 ** (10 * p - 10));
const f = (v: number): string => v.toFixed(2);

function el(tag: string, cls: string, parent: Element, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent.append(e);
  return e;
}

/** A hand-drawn line, the pack's risco: points jittered across the stroke, joined by curves. */
function risco(x1: number, y1: number, x2: number, y2: number, rand: () => number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const steps = 5;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const jitter = i === 0 || i === steps ? 0 : (rand() - 0.5) * 1.2;
    points.push([
      x1 + (dx * i) / steps - (dy / len) * jitter,
      y1 + (dy * i) / steps + (dx / len) * jitter,
    ]);
  }
  let d = `M${f(x1)} ${f(y1)}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1] as [number, number];
    const [cx, cy] = points[i] as [number, number];
    d += ` Q${f(px)} ${f(py)} ${f((px + cx) / 2)} ${f((py + cy) / 2)}`;
  }
  return `${d} L${f(x2)} ${f(y2)}`;
}

interface Sign {
  box: HTMLElement;
  appear: number;
  strike: { path: SVGPathElement; at: number } | null;
}

interface View {
  root: HTMLElement;
  stage: HTMLElement;
  grid: HTMLElement;
  signs: Sign[];
  hero: Sign;
  lit: number;
  slam: HTMLElement;
  title: HTMLElement[];
  fitted: boolean;
  wipe: HTMLElement;
  wipeAccent: HTMLElement;
}

function build(): View {
  const root = document.createElement("div");
  root.id = "opener";
  root.className = "opener";
  root.setAttribute("aria-hidden", "true");
  const stage = el("div", "op-stage", root);
  const wipeAccent = el("div", "op-wipe-accent", root);
  const wipe = el("div", "op-wipe", root);
  document.body.append(root);

  const grid = el("div", "op-grid", stage);
  // The strike layer counts in cqw, so its height follows the screen's shape.
  const width = stage.clientWidth || 100;
  const height = ((stage.clientHeight || 211) * 100) / width;
  const strikes = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  strikes.setAttribute("class", "op-strikes");
  strikes.setAttribute("viewBox", `0 0 100 ${f(height)}`);
  strikes.setAttribute("preserveAspectRatio", "none");
  grid.append(strikes);

  const span = SIDE * SIGN + (SIDE - 1) * GAP;
  const x0 = (100 - span) / 2;
  const y0 = -span / 2;
  const rand = seeded(3);
  const middle = (SIDE - 1) / 2;
  const signs: Sign[] = [];
  for (let row = 0; row < SIDE; row++) {
    for (let column = 0; column < SIDE; column++) {
      const x = x0 + column * (SIGN + GAP);
      const y = y0 + row * (SIGN + GAP);
      const box = el("div", "op-sign", grid);
      box.style.left = `${f(x)}cqw`;
      box.style.top = `calc(50cqh + ${f(y)}cqw)`;
      el("span", "op-bar", box);
      el("span", "op-bar", box);
      // The grid builds from the middle outward.
      const appear = 80 + Math.hypot(row - middle, column - middle) * 120 + rand() * 40;
      signs.push({ box, appear, strike: null });
    }
  }
  const hero = signs[(SIDE * SIDE - 1) / 2] as Sign;
  const others = signs.filter((sign) => sign !== hero);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [others[i], others[j]] = [others[j] as Sign, others[i] as Sign];
  }
  let at = STRIKES_FROM;
  others.forEach((sign, order) => {
    const i = signs.indexOf(sign);
    const x = x0 + (i % SIDE) * (SIGN + GAP);
    const y = height / 2 + y0 + Math.floor(i / SIDE) * (SIGN + GAP);
    // Bottom-left to top-right, as on the icon: "=" becomes "≠".
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", risco(x + 1.5, y + SIGN - 1, x + SIGN - 1.5, y + 1, rand));
    path.setAttribute("pathLength", "1");
    strikes.append(path);
    sign.strike = { path, at };
    at += 110 * 0.87 ** order;
  });
  grid.style.transformOrigin = "50cqw 50cqh";

  const slam = el("div", "op-slam", stage);
  const title = ["MUTUAL", "OR", "NOT"].map((word) => el("span", "op-word", slam, word));
  return {
    root,
    stage,
    grid,
    signs,
    hero,
    lit: at + 40,
    slam,
    title,
    fitted: false,
    wipe,
    wipeAccent,
  };
}

/** One size for the title's three lines, set by the widest, measured once the fonts are in. */
function fitTitle(view: View): void {
  for (const word of view.title) word.style.fontSize = "100px";
  const widest = Math.max(...view.title.map((word) => word.offsetWidth));
  if (widest > 0) {
    const size = `${(90 * view.stage.clientWidth) / widest}px`;
    for (const word of view.title) word.style.fontSize = size;
  }
  view.fitted = true;
}

function render(view: View, t: number): void {
  const red = t >= RED_AT;
  view.root.classList.toggle("red", red);
  view.grid.style.visibility = red ? "hidden" : "visible";

  let jolt = 0;
  let punch = 0;
  for (const sign of view.signs) {
    const q = outCubic(seg(t, sign.appear, sign.appear + 170));
    let opacity = q;
    if (sign.strike) {
      const { path, at } = sign.strike;
      path.style.strokeDashoffset = String(1 - seg(t, at, at + 90));
      path.style.opacity = t >= at ? "1" : "0";
      const since = t - at - 90;
      if (since >= 0) {
        opacity *= 0.22;
        path.style.opacity = "0.5";
        if (since < 120) jolt += Math.sin(since / 14) * 0.4 * (1 - since / 120);
        punch += 0.03 * Math.exp(-since / 110);
      }
    }
    sign.box.style.opacity = String(opacity);
    if (sign === view.hero) {
      sign.box.classList.toggle("hot", t >= view.lit);
      const pulse = 1 + 0.2 * Math.sin(Math.PI * seg(t, view.lit, view.lit + 120));
      const zoom = inExpo(seg(t, ZOOM_FROM, RED_AT));
      sign.box.style.transform = `scale(${pulse * (1 + zoom * 30)})`;
    } else {
      sign.box.style.transform = `scale(${f(0.6 + 0.4 * q)})`;
    }
  }
  const push = seg(t, STRIKES_FROM, ZOOM_FROM);
  view.grid.style.transform = `translateY(${f(jolt)}cqw) scale(${1 + 0.12 * push + punch})`;

  if (red && !view.fitted) fitTitle(view);
  view.slam.style.opacity = red ? "1" : "0";
  view.title.forEach((word, i) => {
    const start = RED_AT + 10 + i * 90;
    word.style.opacity = t >= start ? "1" : "0";
    word.style.transform = `scale(${1 + 1.9 * (1 - outExpo(seg(t, start, start + 160)))})`;
  });

  const p = inOutCubic(seg(t, WIPE_FROM, OPENER_LENGTH_MS));
  const lead = -35 + p * 170;
  const wedge = (edge: number) => `polygon(0 0, ${edge}% 0, ${edge - 35}% 100%, 0 100%)`;
  view.wipe.style.clipPath = wedge(p > 0 ? lead : -40);
  view.wipeAccent.style.clipPath = wedge(p > 0 ? lead + 9 : -40);
}

/** Plays the opener over the page; resolves when home should show, early on a tap. */
export function playOpener(): Promise<void> {
  return new Promise((resolve) => {
    const view = build();
    const start = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      view.root.remove();
      resolve();
    };
    // A click, not a pointerdown: the tap that skips must not land on home's buttons underneath.
    view.root.addEventListener("click", finish);
    const frame = (now: number) => {
      if (done) return;
      const t = now - start;
      if (t >= OPENER_LENGTH_MS) {
        finish();
        return;
      }
      render(view, t);
      requestAnimationFrame(frame);
    };
    render(view, 0);
    requestAnimationFrame(frame);
  });
}
