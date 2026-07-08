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
 */
export async function GET(request: Request) {
  clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
