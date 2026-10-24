import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const accounts = await db.query<AccountRow>(
      "SELECT id, name FROM accounts WHERE user_id = $1 ORDER BY id",
      [user.id]
    );

    const balances = await Promise.all(
      accounts.map(async (acc) => {
        const incomeResult = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND account_id = $2 AND type = 'income'`,
          [user.id, acc.id]
        );
        const expenseResult = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND account_id = $2 AND type = 'expense'`,
          [user.id, acc.id]
        );
        const transferIn = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND to_account_id = $2 AND type = 'transfer'`,
          [user.id, acc.id]
        );
        const transferOut = await db.query<TotalRow>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND account_id = $2 AND type = 'transfer'`,
          [user.id, acc.id]
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
