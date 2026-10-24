import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("category_id");
    const accountId = searchParams.get("account_id");
    const limit = searchParams.get("limit");

    let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon,
             a.name as account_name, ta.name as to_account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (month) {
      query += ` AND to_char(t.date, 'YYYY-MM') = $${paramIdx}`;
      params.push(month);
      paramIdx++;
    }
    if (type) {
      query += ` AND t.type = $${paramIdx}`;
      params.push(type);
      paramIdx++;
    }
    if (categoryId) {
      query += ` AND t.category_id = $${paramIdx}`;
      params.push(parseInt(categoryId));
      paramIdx++;
    }
    if (accountId) {
      query += ` AND (t.account_id = $${paramIdx} OR t.to_account_id = $${paramIdx})`;
      params.push(parseInt(accountId));
      paramIdx++;
    }

    query += " ORDER BY t.date DESC, t.created_at DESC";

    if (limit) {
      query += ` LIMIT $${paramIdx}`;
      params.push(parseInt(limit));
    }

    const db = getDb();
    const transactions = await db.query(query, params);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Gagal memuat transaksi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, account_id, to_account_id, category_id, note, date } = body;

    if (!type || !amount || !account_id) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (type === "transfer" && !to_account_id) {
      return NextResponse.json({ error: "Tujuan transfer diperlukan" }, { status: 400 });
    }

    const db = getDb();
    const result = await db.query(
      `INSERT INTO transactions (type, amount, account_id, to_account_id, category_id, note, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        type,
        Math.round(amount),
        account_id,
        to_account_id || null,
        category_id || null,
        note || null,
        date || new Date().toISOString().split("T")[0],
      ]
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
  }
}
