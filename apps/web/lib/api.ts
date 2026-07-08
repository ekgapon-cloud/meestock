import { getSessionToken } from "./session";

const API_URL = process.env.API_URL;

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
