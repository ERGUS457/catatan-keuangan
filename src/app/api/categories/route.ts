import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const categories = await db.query("SELECT * FROM categories ORDER BY type, name");
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, type, icon } = await request.json();
    if (!name || !type) {
      return NextResponse.json({ error: "Nama dan tipe diperlukan" }, { status: 400 });
    }
    const db = getDb();
    const result = await db.query(
      "INSERT INTO categories (name, type, icon) VALUES ($1, $2, $3) RETURNING *",
      [name, type, icon || "📦"]
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Gagal membuat kategori" }, { status: 500 });
  }
}
