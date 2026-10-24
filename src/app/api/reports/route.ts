import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface SummaryRow {
  income: string | number;
  expense: string | number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const db = getDb();

    // Monthly summary (income vs expense)
    let summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = $1 AND type != 'transfer'
    `;
    const params: unknown[] = [user.id];
    if (month) {
      summaryQuery += ` AND to_char(date, 'YYYY-MM') = $2`;
      params.push(month);
    }
    const summary = await db.query<SummaryRow>(summaryQuery, params);

    // Expense by category for selected month
    let categoryQuery = `
      SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.type = 'expense'
    `;
    const catParams: unknown[] = [user.id];
    if (month) {
      categoryQuery += ` AND to_char(t.date, 'YYYY-MM') = $2`;
      catParams.push(month);
    }
    categoryQuery += ` GROUP BY c.name, c.icon ORDER BY total DESC`;
    const byCategory = await db.query(categoryQuery, catParams);

    // Monthly trend (last 6 months)
    const trend = await db.query(
      `
      SELECT
        to_char(date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = $1 AND type != 'transfer' AND date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY to_char(date, 'YYYY-MM')
      ORDER BY month
    `,
      [user.id]
    );

    return NextResponse.json({
      income: Number(summary[0]?.income || 0),
      expense: Number(summary[0]?.expense || 0),
      byCategory,
      trend,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
