import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MessageRow {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

interface AnalysisRow {
  content: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Parameter month wajib (YYYY-MM)" },
        { status: 400 }
      );
    }

    const db = getDb();

    // 50 pesan chat terakhir, diurutkan menaik untuk dirender berurutan.
    const messages = await db.query<MessageRow>(
      `SELECT id, role, content, created_at
       FROM ai_messages
       WHERE user_id = $1 AND month = $2 AND kind = 'chat'
       ORDER BY id DESC
       LIMIT 50`,
      [user.id, month]
    );

    // Analisis tersimpan terbaru untuk bulan ini (bisa null).
    const analysis = await db.query<AnalysisRow>(
      `SELECT content, created_at
       FROM ai_messages
       WHERE user_id = $1 AND month = $2 AND kind = 'analysis'
       ORDER BY id DESC
       LIMIT 1`,
      [user.id, month]
    );

    return NextResponse.json({
      messages: messages.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
      analysis:
        analysis.length > 0
          ? {
              content: analysis[0].content,
              createdAt: analysis[0].created_at,
            }
          : null,
    });
  } catch (error) {
    console.error("Error fetching AI messages:", error);
    return NextResponse.json(
      { error: "Gagal memuat riwayat percakapan" },
      { status: 500 }
    );
  }
}
