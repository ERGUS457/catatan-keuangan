import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  GEMINI_MODEL,
  SETTING_KEY_GEMINI,
  loadApiKey,
  saveApiKey,
  deleteApiKey,
  testApiKey,
  looksLikeGeminiKey,
  aiRateLimit,
} from "@/lib/gemini";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stored = await loadApiKey(user.id);
    return NextResponse.json({
      configured: !!stored,
      last4: stored ? stored.key.slice(-4) : null,
      model: GEMINI_MODEL,
      updatedAt: stored ? stored.updatedAt : null,
    });
  } catch (error) {
    console.error("Error reading AI settings:", error);
    return NextResponse.json(
      { error: "Gagal membaca pengaturan AI" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key tidak boleh kosong" },
        { status: 400 }
      );
    }
    if (!looksLikeGeminiKey(apiKey)) {
      return NextResponse.json(
        { error: "Format API key tidak valid. Key Google biasanya diawali AIza." },
        { status: 400 }
      );
    }

    // Uji dulu, baru simpan — key rusak tidak boleh masuk database.
    try {
      await testApiKey(apiKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API key gagal diuji.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await saveApiKey(user.id, apiKey);
    return NextResponse.json({ configured: true, last4: apiKey.slice(-4) });
  } catch (error) {
    console.error("Error saving AI settings:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan API key" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    await db.query(
      "DELETE FROM user_settings WHERE user_id = $1 AND setting_key = $2",
      [user.id, SETTING_KEY_GEMINI]
    );
    return NextResponse.json({ configured: false });
  } catch (error) {
    console.error("Error deleting AI settings:", error);
    return NextResponse.json(
      { error: "Gagal menghapus API key" },
      { status: 500 }
    );
  }
}
