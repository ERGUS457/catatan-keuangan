import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  loadApiKey,
  callGemini,
  buildReportContext,
  ANALYZE_SYSTEM_PROMPT,
  aiRateLimit,
  GeminiError,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = aiRateLimit(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam satu menit." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const month = typeof body.month === "string" ? body.month.trim() : "";
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Bulan tidak valid (format YYYY-MM)" },
        { status: 400 }
      );
    }

    const stored = await loadApiKey(user.id);
    if (!stored) {
      return NextResponse.json(
        { error: "API key belum diatur. Silakan atur di halaman Pengaturan." },
        { status: 503 }
      );
    }

    const context = await buildReportContext(user.id, month);

    const text = await callGemini(
      stored.key,
      ANALYZE_SYSTEM_PROMPT,
      [{ role: "user", text: `Data keuangan bulan ${month} (JSON):\n${context}` }]
    );

    // Ganti analisis tersimpan bulan ini (write-once-per-month).
    const db = getDb();
    await db.query(
      "DELETE FROM ai_messages WHERE user_id = $1 AND month = $2 AND kind = 'analysis'",
      [user.id, month]
    );
    await db.query(
      `INSERT INTO ai_messages (user_id, month, kind, role, content)
       VALUES ($1, $2, 'analysis', 'assistant', $3)`,
      [user.id, month, text]
    );

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof GeminiError) {
      const status = error.status === 429 ? 429 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Error analyzing report:", error);
    return NextResponse.json(
      { error: "Gagal menganalisis laporan" },
      { status: 500 }
    );
  }
}
