import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

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
    const body = await request.json();
    const { type, amount, account_id, to_account_id, category_id, note, date } = body;

    const db = getDb();

    // Verify source account belongs to user
    const sourceAcc = await db.query(
      "SELECT id FROM accounts WHERE id = $1 AND user_id = $2",
      [account_id, user.id]
    );
    if (sourceAcc.length === 0) {
      return NextResponse.json({ error: "Akun sumber tidak valid" }, { status: 400 });
    }

    if (type === "transfer") {
      if (!to_account_id) {
        return NextResponse.json({ error: "Tujuan transfer diperlukan" }, { status: 400 });
      }
      if (account_id === to_account_id) {
        return NextResponse.json({ error: "Sumber dan tujuan transfer tidak boleh sama" }, { status: 400 });
      }
      const destAcc = await db.query(
        "SELECT id FROM accounts WHERE id = $1 AND user_id = $2",
        [to_account_id, user.id]
      );
      if (destAcc.length === 0) {
        return NextResponse.json({ error: "Akun tujuan transfer tidak valid" }, { status: 400 });
      }
    }

    const result = await db.query(
      `UPDATE transactions
       SET type = $1, amount = $2, account_id = $3, to_account_id = $4,
           category_id = $5, note = $6, date = $7
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [type, Math.round(amount), account_id, to_account_id || null, category_id || null, note || null, date, id, user.id]
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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const result = await db.query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, user.id]
    );
    if (result.length === 0) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 });
  }
}
