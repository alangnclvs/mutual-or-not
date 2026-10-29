# 0004. One shared password, asked at the edge

- Status: Accepted
- Date: 2026-10-29

## Context

The app is for Alan and Mariana only, but its address is public: anyone who finds it can use it. ADR 0001 keeps every export on the device of whoever reads it, so a stranger sees nothing of theirs; the lock is about who may use the app, not about the data.

## Decision drivers

- Only Alan and Mariana open the app.
- No account, user table or sign-in screen to build and run (ADR 0001).
- Zero cost, on the Vercel Hobby plan (ADR 0003).
- Nothing new leaves the device, and the CSP stays as it is.

## Considered options

1. Vercel's Deployment Protection (Password Protection, or Vercel Authentication on every deployment).
2. A password checked in the browser by the app.
3. A Vercel Routing Middleware that asks for one shared password through the browser's own password box (HTTP Basic), the password kept in a Vercel environment variable.

## Decision

Option 3. `web/middleware.ts` runs before any file is served, in one file with no relative import (Vercel runs it as an ES module in Node): the right password passes, whatever the user name; a missing or wrong one gets a 401 that makes the browser ask. The password is `APP_PASSWORD` in the Vercel project, never in the repo; with none set, everyone is refused. The manifest and the icons stay open, since Chrome fetches them for the install without the password.

- Option 1 protects the production domain only on paid plans.
- Option 2 ships the check, and the app, to anyone who asks for it; the lock would be a few lines to skip.
- Option 3 refuses the files themselves, costs nothing on Hobby, and needs no screen of ours.

## Consequences

- The browser keeps the password: once typed, it is asked again only when the browser forgets it. The installed app opens from its cache offline, without asking.
- Changing the password is changing `APP_PASSWORD` in Vercel and redeploying; there is no way to lock out one person only.
- `vite dev` and `vite preview` do not run the middleware: the lock exists only on Vercel.
