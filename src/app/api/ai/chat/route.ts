import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  loadApiKey,
  callGemini,
  buildReportContext,
  CHAT_SYSTEM_PROMPT,
  aiRateLimit,
  GeminiError,
  type GeminiMessage,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 12;

interface HistoryRow {
  role: string;
  content: string;
}

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
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Bulan tidak valid (format YYYY-MM)" },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang (maks 1000 karakter)." },
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

    const db = getDb();

    const history = await db.query<HistoryRow>(
      `SELECT role, content FROM (
         SELECT role, content, id
         FROM ai_messages
         WHERE user_id = $1 AND month = $2 AND kind = 'chat'
         ORDER BY id DESC
         LIMIT $3
       ) t ORDER BY id ASC`,
      [user.id, month, HISTORY_LIMIT]
    );

    const context = await buildReportContext(user.id, month);

    const contents: GeminiMessage[] = [
      { role: "user", text: `Data keuangan bulan ${month} (JSON):\n${context}` },
      ...history.map((h) => ({
        role: (h.role === "assistant" ? "model" : "user") as
          | "user"
          | "model",
        text: h.content,
      })),
      { role: "user", text: message },
    ];

    const reply = await callGemini(stored.key, CHAT_SYSTEM_PROMPT, contents);

    await db.query(
      `INSERT INTO ai_messages (user_id, month, kind, role, content)
       VALUES ($1, $2, 'chat', 'user', $3)`,
      [user.id, month, message]
    );
    const saved = await db.query<{ id: number; created_at: string }>(
      `INSERT INTO ai_messages (user_id, month, kind, role, content)
       VALUES ($1, $2, 'chat', 'assistant', $3)
       RETURNING id, created_at`,
      [user.id, month, reply]
    );

    return NextResponse.json({
      reply,
      id: saved[0]?.id,
      createdAt: saved[0]?.created_at,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      const status = error.status === 429 ? 429 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Error in AI chat:", error);
    return NextResponse.json(
      { error: "Gagal membalas pesan" },
      { status: 500 }
    );
  }
}
