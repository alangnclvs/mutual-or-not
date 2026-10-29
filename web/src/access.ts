/**
 * The lock on the app (ADR 0004): one password shared by Alan and Mariana, asked by the browser's
 * own password box (HTTP Basic). Run by `web/middleware.ts` on Vercel before any file is served.
 */

const CHALLENGE = 'Basic realm="Mutual or Not", charset="UTF-8"';

/** The password typed, from an `Authorization: Basic` header; the user part is ignored. */
function typedPassword(request: Request): string | null {
  const [scheme, encoded] = (request.headers.get("Authorization") ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const credentials = new TextDecoder().decode(bytes);
    const colon = credentials.indexOf(":");
    return colon < 0 ? null : credentials.slice(colon + 1);
  } catch {
    return null;
  }
}

/** Compares in a time that does not depend on where the texts differ. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The 401 that makes the browser ask for the password, or null when the request may pass.
 * With no password set, everyone is refused: the lock fails closed.
 */
export function refusal(request: Request, password: string | undefined): Response | null {
  const typed = typedPassword(request);
  if (password && typed !== null && same(typed, password)) return null;
  return new Response("Password required.", {
    status: 401,
    headers: { "WWW-Authenticate": CHALLENGE, "Content-Type": "text/plain; charset=utf-8" },
  });
}
