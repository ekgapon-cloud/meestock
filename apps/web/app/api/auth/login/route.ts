import { NextResponse } from "next/server";
import { setSessionCookie } from "../../../../lib/session";

const API_URL = process.env.API_URL;

export async function POST(request: Request) {
  if (!API_URL) {
    throw new Error("API_URL environment variable is not set");
  }

  const body: unknown = await request.json().catch(() => null);
  const email = (body as { email?: unknown } | null)?.email;
  const password = (body as { password?: unknown } | null)?.password;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Email and password are required" } },
      { status: 400 },
    );
  }

  // Forward the real client IP and browser user-agent so the backend's login audit log records
  // the actual user, not this BFF server. Vercel sets x-forwarded-for on the incoming request.
  const clientIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
      ...(userAgent ? { "user-agent": userAgent } : {}),
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      data ?? { error: { code: "UNKNOWN_ERROR", message: "Login failed" } },
      { status: res.status },
    );
  }

  const { token, employee } = data as { token: string; employee: unknown };
  setSessionCookie(token);

  return NextResponse.json({ employee });
}
