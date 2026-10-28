# 0002. Front end in TypeScript with Vite, no UI framework

- Status: Accepted
- Date: 2026-10-28

## Context

Five small screens (home, sequence, summary, list, settings) around one computation: read an export, compare sets of usernames, count interactions. It must install as a PWA and look like the games of the pack, which all run on TypeScript and Vite with no framework (Houdini Solitaire ADR 0002).

## Decision drivers

- Same stack and tooling as the pack, so its modules and configs are copied rather than rewritten.
- Types for the export's shapes, which vary between files and versions.
- PWA support without hand-written cache versioning.

## Considered options

1. TypeScript with Vite, no framework.
2. React with Vite.

## Decision

Option 1. Alan asked for the simplest stack, with React only if needed; nothing here needs it. The reading and the lists live in plain modules tested with Vitest; the screens are a few templates and event handlers, as in the games. `vite-plugin-pwa`, Biome and Vitest with happy-dom as in the pack.

## Consequences

- Parsing, lists, changes and storage are pure modules with tests, apart from the DOM.
- A smoke test drives the real page in happy-dom: a synthetic export goes in, the summary's counts come out.
