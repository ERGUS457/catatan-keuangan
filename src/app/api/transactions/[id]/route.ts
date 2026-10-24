import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, amount, account_id, to_account_id, category_id, note, date } = body;

    const db = getDb();
    const result = await db.query(
      `UPDATE transactions
       SET type = $1, amount = $2, account_id = $3, to_account_id = $4,
           category_id = $5, note = $6, date = $7
       WHERE id = $8 RETURNING *`,
      [type, Math.round(amount), account_id, to_account_id || null, category_id || null, note || null, date, id]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.query("DELETE FROM transactions WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 });
  }
}
