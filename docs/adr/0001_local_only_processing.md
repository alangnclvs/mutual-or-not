# 0001. The export is read on the device and nothing leaves it

- Status: Accepted
- Date: 2026-10-28

## Context

The app reads an Instagram export: who the owner follows, who follows them, what they liked and commented, and their profile. It is personal data of the owner and of every account in the lists. The app is for Alan and Mariana only, on their phones.

## Decision drivers

- No one but the owner sees the export, not even a server of ours.
- No account, sign-in or database to run.
- Works offline once installed.

## Considered options

1. A static web app that reads the export in the browser and keeps the analysis in localStorage.
2. A backend that receives the export, computes the lists and stores the history.
3. Option 1 plus a Supabase table for the history, as the games keep their plays.

## Decision

Option 1.

- Option 2 sends the export to a server, which is what the app promises not to do.
- Option 3 sends the lists out for a history that the device already holds; the games need a server because two devices share progress, which this app does not.
- Option 1: the ZIP is unpacked in the browser (`fflate`), the lists are computed there, and the analysis is kept in localStorage. The fonts are served by the app (`@fontsource`), not by Google Fonts, so not even a font request reaches a third party. A Content Security Policy in `web/vercel.json` (`default-src 'self'`, `connect-src 'self'`) makes the browser refuse any request to another origin, so a bug or a dependency cannot send data out either.

## Consequences

- The history lives on one device: a new phone, a cleared browser or DELETE DATA ON THIS DEVICE starts it over. Changing the domain loses it too (localStorage is bound to the origin).
- No telemetry: what works or breaks on the phone is learned by using it.
- The whole ZIP is read into memory: a very large export (high-quality media) can fail on a phone. The steps on home ask for low-quality media and only the needed categories, and the app refuses files above 500 MB.
- A row of a list links to the account on instagram.com; following that link is a navigation the owner chooses, not a request of the app.
