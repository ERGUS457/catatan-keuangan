import { cookies } from "next/headers";
import { createHash, createHmac } from "crypto";

export const SESSION_COOKIE = "ck_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: number;
  username: string;
  name: string;
}

function getSecret(): string {
  return process.env.SESSION_SECRET || "fallback-secret-change-me";
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export function sign(value: string): string {
  const sig = createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expectedSig = createHmac("sha256", getSecret()).update(value).digest("hex");
  if (expectedSig !== sig) return null;
  return value;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function createSession(user: AuthUser): Promise<void> {
  const payload = base64UrlEncode(JSON.stringify(user));
  const signed = sign(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    if (!cookie) return null;

    const value = unsign(cookie.value);
    if (!value) return null;

    const json = base64UrlDecode(value);
    const user = JSON.parse(json) as AuthUser;
    if (!user || typeof user.id !== "number") return null;
    return user;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Simple in-memory rate limiter
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}
