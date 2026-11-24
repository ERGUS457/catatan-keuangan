import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  loadApiKey,
  testApiKey,
  looksLikeGeminiKey,
  aiRateLimit,
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

    let body: { apiKey?: unknown } = { apiKey: undefined };
    try {
      body = await request.json();
    } catch {
      /* body kosong = uji key tersimpan */
    }

    const inputKey =
      typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    let apiKey = inputKey;

    if (!apiKey) {
      const stored = await loadApiKey(user.id);
      if (!stored) {
        return NextResponse.json(
          { error: "Belum ada API key tersimpan. Masukkan key dulu." },
          { status: 400 }
        );
      }
      apiKey = stored.key;
    } else if (!looksLikeGeminiKey(apiKey)) {
      return NextResponse.json(
        { error: "Format API key tidak valid. Key Google biasanya diawali AIza." },
        { status: 400 }
      );
    }

    const latencyMs = await testApiKey(apiKey);
    return NextResponse.json({
      ok: true,
      message: `Terhubung ke Gemini (${latencyMs} ms)`,
      latencyMs,
      usedStoredKey: !inputKey,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "API key gagal diuji.";
    const status = msg.includes("Quota") ? 429 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
