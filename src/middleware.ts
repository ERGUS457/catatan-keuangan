import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Verify HMAC-SHA256 signature using standard Web Crypto API
async function verifyHmacSignature(value: string, signatureHex: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
    const hashArray = Array.from(new Uint8Array(sigBuffer));
    const expectedHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return expectedHex === signatureHex;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/offline" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("ck_session");
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const signed = sessionCookie.value;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("ck_session");
    return response;
  }

  const value = signed.slice(0, idx);
  const signature = signed.slice(idx + 1);
  const secret = process.env.SESSION_SECRET || "fallback-secret-change-me";

  const isValid = await verifyHmacSignature(value, signature, secret);
  if (!isValid) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("ck_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline).*)"],
};
