import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, checkRateLimit, resetRateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface UserRow {
  id: number;
  name: string;
  username: string;
  password_hash: string;
}

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
    const body = await request.json();
    const { username, password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password diperlukan" }, { status: 400 });
    }

    const db = getDb();
    const inputHash = hashPassword(password);
    let matchedUser: UserRow | null = null;

    if (username && typeof username === "string" && username.trim().length > 0) {
      // Find user by username
      const cleanUsername = username.trim().toLowerCase();
      const rows = await db.query(
        "SELECT id, name, username, password_hash FROM users WHERE LOWER(username) = $1",
        [cleanUsername]
      ) as UserRow[];

      if (rows.length > 0 && rows[0].password_hash === inputHash) {
        matchedUser = rows[0];
      }
    } else {
      // Direct PIN / single password login
      // 1. Check if matches APP_PASSWORD_HASH in env
      const appHash = process.env.APP_PASSWORD_HASH;
      if (appHash && inputHash === appHash) {
        const rows = await db.query(
          "SELECT id, name, username, password_hash FROM users ORDER BY id ASC LIMIT 1"
        ) as UserRow[];
        if (rows.length > 0) {
          matchedUser = rows[0];
        }
      }

      // 2. If not matched yet, check against all users in database if hash matches exactly one
      if (!matchedUser) {
        const rows = await db.query(
          "SELECT id, name, username, password_hash FROM users WHERE password_hash = $1 LIMIT 1",
          [inputHash]
        ) as UserRow[];
        if (rows.length > 0) {
          matchedUser = rows[0];
        }
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: `PIN atau username salah. Sisa percobaan: ${remaining}` },
        { status: 401 }
      );
    }

    resetRateLimit(ip);

    await createSession({
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        username: matchedUser.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
