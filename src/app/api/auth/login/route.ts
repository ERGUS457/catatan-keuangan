import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, checkRateLimit, resetRateLimit } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const { allowed, remaining } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
      { status: 429 }
    );
  }

  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password diperlukan" }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: `Password salah. Sisa percobaan: ${remaining}` },
        { status: 401 }
      );
    }

    resetRateLimit(ip);
    await createSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
