import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const debtId = parseInt(id, 10);
    if (isNaN(debtId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const { status, person_name, amount, due_date, note } = body;

    const db = getDb();

    // Check if debt exists and belongs to user
    const existing = await db.query(
      "SELECT * FROM debts WHERE id = $1 AND user_id = $2",
      [debtId, user.id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    }

    // Toggle status or update fields
    let updatedStatus = status !== undefined ? status : existing[0].status;
    let paidAt = existing[0].paid_at;

    if (status === "paid") {
      paidAt = new Date().toISOString();
    } else if (status === "unpaid") {
      paidAt = null;
    }

    const updatedPerson = person_name !== undefined ? person_name.trim() : existing[0].person_name;
    const updatedAmount = amount !== undefined ? Math.round(Number(amount)) : existing[0].amount;
    const updatedDueDate = due_date !== undefined ? due_date || null : existing[0].due_date;
    const updatedNote = note !== undefined ? (note ? note.trim() : null) : existing[0].note;

    const result = await db.query(
      `UPDATE debts
       SET status = $1, paid_at = $2, person_name = $3, amount = $4, due_date = $5, note = $6
       WHERE id = $7 AND user_id = $8
       RETURNING id, user_id, type, person_name, amount,
                 to_char(due_date, 'YYYY-MM-DD') as due_date,
                 note, status,
                 to_char(paid_at, 'YYYY-MM-DD HH24:MI') as paid_at,
                 created_at`,
      [updatedStatus, paidAt, updatedPerson, updatedAmount, updatedDueDate, updatedNote, debtId, user.id]
    );

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating debt:", error);
    return NextResponse.json({ error: "Gagal memperbarui catatan hutang/piutang" }, { status: 500 });
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
    const debtId = parseInt(id, 10);
    if (isNaN(debtId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const db = getDb();
    const result = await db.query(
      "DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING id",
      [debtId, user.id]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting debt:", error);
    return NextResponse.json({ error: "Gagal menghapus catatan hutang/piutang" }, { status: 500 });
  }
}
