import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/session";

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ message: "Logged out" });
}

/**
 * Used by protected pages when the backend rejects the session cookie (expired/invalid
 * JWT) — clears the cookie before redirecting, so middleware.ts (which only checks cookie
 * presence, not validity) doesn't bounce the user straight back in and loop forever.
 *
 * A GET route that mutates state has no CSRF protection of its own (Next.js's automatic
 * Origin check only covers Server Actions, not plain Route Handlers), so a cross-site link
 * could otherwise force a visitor's session to be cleared. `Sec-Fetch-Site` is set by the
 * browser and can't be spoofed by a page's own script; it's only ever "cross-site" for a
 * genuine cross-origin navigation — every legitimate call to this route (a redirect from
 * one of our own pages, whether a fresh load or mid-session) comes back "none" or
 * "same-origin"/"same-site". Older browsers that predate Fetch Metadata omit the header
 * entirely, so a missing header fails open rather than blocking them.
 */
export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
