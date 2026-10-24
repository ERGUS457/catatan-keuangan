import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, checkRateLimit, resetRateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORIES = [
  // Pengeluaran
  { name: "Makan", type: "expense", icon: "🍽️" },
  { name: "Transport", type: "expense", icon: "🚗" },
  { name: "Belanja", type: "expense", icon: "🛒" },
  { name: "Tagihan", type: "expense", icon: "📄" },
  { name: "Hiburan", type: "expense", icon: "🎮" },
  { name: "Kesehatan", type: "expense", icon: "💊" },
  { name: "Pendidikan", type: "expense", icon: "📚" },
  { name: "Pengeluaran Lain", type: "expense", icon: "📦" },
  // Pemasukan
  { name: "Gaji", type: "income", icon: "💰" },
  { name: "Bonus", type: "income", icon: "🎁" },
  { name: "Investasi", type: "income", icon: "📈" },
  { name: "Hadiah", type: "income", icon: "🎉" },
  { name: "Pemasukan Lain", type: "income", icon: "📦" },
];

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const { allowed } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
      { status: 429 }
    );
  }

  try {
    const { name, username, password } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nama minimal 2 karakter" }, { status: 400 });
    }

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "Username minimal 3 karakter" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: "Username hanya boleh huruf, angka, atau underscore" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "PIN/Password minimal 6 karakter" }, { status: 400 });
    }

    const db = getDb();

    // Check existing username
    const existing = await db.query("SELECT id FROM users WHERE username = $1", [cleanUsername]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username sudah terdaftar. Gunakan username lain." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);

    // Insert user
    const users = await db.query(
      "INSERT INTO users (name, username, password_hash) VALUES ($1, $2, $3) RETURNING id, name, username",
      [name.trim(), cleanUsername, passwordHash]
    );
    const newUser = users[0] as { id: number; name: string; username: string };

    // Create default accounts for new user: Saldo and Cash
    await db.query(
      "INSERT INTO accounts (user_id, name) VALUES ($1, 'Saldo'), ($1, 'Cash')",
      [newUser.id]
    );

    // Create default categories for new user
    for (const cat of DEFAULT_CATEGORIES) {
      await db.query(
        "INSERT INTO categories (user_id, name, type, icon) VALUES ($1, $2, $3, $4)",
        [newUser.id, cat.name, cat.type, cat.icon]
      );
    }

    resetRateLimit(ip);

    // Auto login: create session
    await createSession({
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Gagal mendaftar akun. Silakan coba lagi." }, { status: 500 });
  }
}
