import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AccountRow {
  id: number;
  name: string;
}

interface TotalRow {
  total: string | number;
}

export async function GET() {
  try {
    const db = getDb();
    const accounts = await db.query<AccountRow>("SELECT * FROM accounts ORDER BY id");

    const balances = await Promise.all(
      accounts.map(async (acc) => {
        const incomeResult = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = $1 AND type = 'income'`,
          [acc.id]
        );
        const expenseResult = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = $1 AND type = 'expense'`,
          [acc.id]
        );
        const transferIn = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE to_account_id = $1 AND type = 'transfer'`,
          [acc.id]
        );
        const transferOut = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE account_id = $1 AND type = 'transfer'`,
          [acc.id]
        );

        const balance =
          Number(incomeResult[0]?.total || 0) -
          Number(expenseResult[0]?.total || 0) +
          Number(transferIn[0]?.total || 0) -
          Number(transferOut[0]?.total || 0);

        return { ...acc, balance };
      })
    );

    return NextResponse.json(balances);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Gagal memuat akun" }, { status: 500 });
  }
}
