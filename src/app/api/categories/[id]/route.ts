import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface CountRow {
  count: string | number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, type, icon } = await request.json();
    const db = getDb();
    const result = await db.query(
      "UPDATE categories SET name = $1, type = $2, icon = $3 WHERE id = $4 AND user_id = $5 RETURNING *",
      [name, type, icon, id, user.id]
    );
    if (result.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Gagal memperbarui kategori" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    // Check if category is used
    const used = await db.query<CountRow>(
      "SELECT COUNT(*) as count FROM transactions WHERE category_id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (Number(used[0]?.count || 0) > 0) {
      return NextResponse.json(
        { error: "Kategori masih digunakan oleh transaksi" },
        { status: 400 }
      );
    }
    const result = await db.query(
      "DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, user.id]
    );
    if (result.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
