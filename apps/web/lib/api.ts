import { redirect } from "next/navigation";
import { getSessionToken } from "./session";

const API_URL = process.env.API_URL;

/**
 * Call on a 401 from apiFetch. Routes through /api/auth/logout (a Route Handler, which
 * can mutate cookies) to clear the stale session cookie before landing on /login —
 * redirect("/login") directly would leave the cookie in place, and middleware.ts (which
 * only checks cookie presence, not validity) would bounce the user right back in, looping
 * forever. Centralized here so new pages get the fix by construction instead of having to
 * remember it.
 */
export function redirectToLogin(): never {
  redirect("/api/auth/logout");
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/** Server-only: reads the session cookie, so it must run in a Server Component, Route Handler, or Server Action. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new Error("API_URL environment variable is not set");
  }

  const token = getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const errorBody = data as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      errorBody?.error?.code ?? "UNKNOWN_ERROR",
      errorBody?.error?.message ?? "Request failed",
      res.status,
    );
  }

  return data as T;
}
