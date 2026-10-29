# Mutual or Not

See who follows you back on Instagram, who doesn't, and who you barely interact with. Private: it runs in the browser, with no account, and nothing leaves your device. Only Alan and Mariana have the password.

Status: building. It will run at **mutual-or-not.alangoncalves.com** (Portuguese and English).

## How it works

Instagram gives every account its own data as a ZIP ("Download your information"). The app opens that ZIP in the browser, reads the followers, the accounts followed and the owner's likes, comments and story replies, and builds six lists: who doesn't follow back, mutuals, mutuals you barely interact with, who you don't follow back, and, from the second export on, who unfollowed you and who started following. The last analysis of each account stays on the device for the next comparison. No server, no analytics, no third-party request: a Content Security Policy keeps every request on the app's own origin. Same visual identity as Twenty One Clues, Ego Death Sudoku and Houdini Solitaire.

- Design: [docs/design.md](docs/design.md)
- Decisions: [docs/adr/](docs/adr/)
- Roadmap: [BACKLOG.md](BACKLOG.md)

## Development

Requires Node.

```
cd web
npm install       install the app's tools
npm run dev       the app on the local network
npm test          tests
npm run build     type check and build
```

Branches: `main` is production, `develop` collects finished steps, and each roadmap step is its own branch cut from `develop`; a finished step is merged into `develop` and then into `main`. CI (GitHub Actions) runs Biome, Vitest, tsc and the build on every pull request and on pushes to `main` and `develop`.
