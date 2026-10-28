# 0003. Host the app on Vercel

- Status: Accepted
- Date: 2026-10-28

## Context

The app is a static PWA. Alan's site and the games of the pack run on Vercel (Hobby plan) under alangoncalves.com.

## Decision drivers

- Zero cost.
- A subdomain where the domain already lives.
- A preview per branch, for checking on a phone.
- Response headers, for the Content Security Policy of ADR 0001.

## Considered options

1. GitHub Pages.
2. Vercel behind a subdomain of alangoncalves.com.

## Decision

Option 2. Project root `web/`; `main` deploys to production, every other branch to a preview URL. Domain: `mutual-or-not.alangoncalves.com`, through a CNAME at Squarespace. The CSP is set in `web/vercel.json`.

- Option 1 needs a public repo on the free plan and cannot set response headers.
- Option 2 is the provider the pack already uses.

## Consequences

- GitHub Actions runs CI only; deployment belongs to Vercel.
- The analyses live in localStorage, bound to the origin: changing the domain later loses them.
