/**
 * Vercel Routing Middleware: runs before any file is served and asks for the password (ADR 0004).
 * The rule lives in src/access.ts, where it is tested; the password is the Vercel environment
 * variable APP_PASSWORD. Not run by `vite dev` or `vite preview`.
 */

import { next } from "@vercel/functions/middleware";
import { refusal } from "./src/access";

declare const process: { env: Record<string, string | undefined> };

export default function middleware(request: Request): Response {
  return refusal(request, process.env.APP_PASSWORD) ?? next();
}

// The manifest and the icons stay open: Chrome fetches them for the install without the password.
export const config = { matcher: "/((?!manifest\\.webmanifest|icons/).*)" };
