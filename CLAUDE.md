# Mutual or Not

A web app for Alan and Mariana that reads an Instagram export on the device and shows who follows back, who does not, and who the owner barely interacts with. Nothing leaves the device: no backend, no account, no telemetry (ADR 0001); a shared password at the edge keeps others out (ADR 0004). Not a game, but it shares the visual identity, stack and conventions of the pack (`../houdini-solitaire`, `../ego-death-sudoku`, `../twenty-one-clues`).

## Read before working

- `docs/design.md`: before touching the lists, the export reading, screens, visual tokens or data formats. Holds the glossary; use its terms.
- `docs/adr/`: before reversing a decision. A change of direction is a new ADR that supersedes the old one; an older ADR only gets its status line updated.
- `BACKLOG.md`: at the start of each session. Tell Alan when a step is done or an open question can be settled.
- `../houdini-solitaire`: the closest model. Copy its modules (`style.css`, `storage.ts`, `strings.ts`) and configs (`vite.config.ts`, `biome.json`, `tsconfig.json`, `package.json`, CI) before writing new ones.

## Repo map

```
web/                        Vite + TypeScript app
web/src/                    export reading, lists, storage, screens, sequence
docs/                       design, ADRs
```

## Working agreements

- The smallest thing that works comes first. Complexity enters only when a measured pain asks for it.
- Ask Alan only about decisions that are costly to undo; decide the rest and tell him what was decided. Ask before inventing terms; use his vocabulary.
- Docs change only when behaviour changes, and each fact lives in one place.
- A new ADR only for a decision that is hard to reverse.
- Alan's parts (Vercel, DNS, checks on the phone, a new export) go to the end of the roadmap; everything else is done for him.

## Privacy

- Nothing the app reads leaves the device. No request to any origin but the app's own: no analytics, no CDN, no Google Fonts. The CSP in `web/vercel.json` enforces it; never loosen it.
- A real export is read only to learn its structure: print shapes, labels and counts, never usernames, names or content. Never copy a real export, or anything from it, into the repo; test fixtures are synthetic.

## Commands

```
cd web; npm run dev                                app on the local network
cd web; npm test                                   Vitest (export reading, lists, changes, storage, strings, a smoke test of the page)
cd web; npx biome check --write . ; npm run build  lint, format, tsc and build
```

## Testing

| Area | Approach | Tool |
|---|---|---|
| Export reading, lists, interactions, changes, storage | TDD, red before green | Vitest |
| Visuals, the sequence, interaction | manual check on a phone via the Vercel preview | |

Name tests by behaviour ("reads the owner of a like from a Portuguese export"). Tests run through the public seam of a module, never its internals.

## Workflow

- `main` is production, `develop` collects finished steps, and each backlog step is one branch cut from `develop` (`docs/...`, `feat/...`, `chore/...`, `design/...`).
- When a branch is done and checks are green: commit, merge it into `develop` (`--no-ff`), push, and delete the branch, local and remote. Then release: merge `develop` into `main` (`--no-ff`) and push, which deploys production on Vercel. Run the full checks before pushing `main`.
- Conventional Commits, authored as `Alan Gonçalves <alangnclvs@outlook.com>`. Outside that end-of-branch merge, commit and push only when Alan asks.
- CI (GitHub Actions) on pull requests and pushes to `main` and `develop`: Biome, Vitest, tsc and the build.

## Conventions

- Code identifiers, file names and docs in English. Files in `snake_case`, top-level folders in `kebab-case`.
- UI strings exist in both `pt` and `en`.
