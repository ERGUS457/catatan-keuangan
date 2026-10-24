import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const categories = await db.query(
      "SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name",
      [user.id]
    );
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, type, icon } = await request.json();
    if (!name || !type) {
      return NextResponse.json({ error: "Nama dan tipe diperlukan" }, { status: 400 });
    }
    const db = getDb();
    const result = await db.query(
      "INSERT INTO categories (user_id, name, type, icon) VALUES ($1, $2, $3, $4) RETURNING *",
      [user.id, name, type, icon || "📦"]
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Gagal membuat kategori" }, { status: 500 });
  }
}
