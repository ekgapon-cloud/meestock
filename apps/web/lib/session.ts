import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";

/** Matches the backend's default JWT_EXPIRES_IN ("8h") — see apps/api/.env.example. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function getSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE_NAME)?.value;
}

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE_NAME);
}
