import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // payable | receivable
    const status = searchParams.get("status"); // unpaid | paid

    let query = `
      SELECT id, user_id, type, person_name, amount, 
             to_char(due_date, 'YYYY-MM-DD') as due_date,
             note, status,
             to_char(paid_at, 'YYYY-MM-DD HH24:MI') as paid_at,
             created_at
      FROM debts
      WHERE user_id = $1
    `;
    const params: unknown[] = [user.id];
    let paramIdx = 2;

    if (type) {
      query += ` AND type = $${paramIdx}`;
      params.push(type);
      paramIdx++;
    }

    if (status) {
      query += ` AND status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    query += ` ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`;

    const db = getDb();
    const debts = await db.query(query, params);
    return NextResponse.json(debts);
  } catch (error) {
    console.error("Error fetching debts:", error);
    return NextResponse.json({ error: "Gagal memuat catatan hutang/piutang" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, person_name, amount, due_date, note } = body;

    if (!type || !person_name || !amount) {
      return NextResponse.json(
        { error: "Tipe, nama orang, dan nominal wajib diisi" },
        { status: 400 }
      );
    }

    if (type !== "payable" && type !== "receivable") {
      return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
    }

    const numAmount = Math.round(Number(amount));
    if (numAmount <= 0) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0" }, { status: 400 });
    }

    const db = getDb();
    const result = await db.query(
      `INSERT INTO debts (user_id, type, person_name, amount, due_date, note, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'unpaid')
       RETURNING id, user_id, type, person_name, amount, 
                 to_char(due_date, 'YYYY-MM-DD') as due_date,
                 note, status, created_at`,
      [
        user.id,
        type,
        person_name.trim(),
        numAmount,
        due_date || null,
        note ? note.trim() : null,
      ]
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating debt:", error);
    return NextResponse.json({ error: "Gagal menyimpan catatan hutang/piutang" }, { status: 500 });
  }
}
