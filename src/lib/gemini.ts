import {
  scryptSync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";
import { getDb } from "@/lib/db";

export const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export const SETTING_KEY_GEMINI = "gemini_api_key";
const MAX_CONTEXT_TRANSACTIONS = 50;
const MAX_CHAT_HISTORY = 12;

// ---------------------------------------------------------------------------
// Enkripsi API key (AES-256-GCM, key diturunkan dari SESSION_SECRET)
// ---------------------------------------------------------------------------

const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "fallback-secret-change-me";
  return scryptSync(secret, "ck-gemini-key", 32);
}

export function encryptValue(plain: string): {
  value: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    value: enc.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptValue(
  valueHex: string,
  ivHex: string,
  authTagHex: string
): string | null {
  try {
    const d = createDecipheriv(ALGO, deriveKey(), Buffer.from(ivHex, "hex"));
    d.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([
      d.update(Buffer.from(valueHex, "hex")),
      d.final(),
    ]).toString("utf8");
  } catch {
    // SESSION_SECRET kemungkinan berganti — key tidak bisa dibaca lagi.
    return null;
  }
}

export function looksLikeGeminiKey(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{30,50}$/.test(key.trim());
}

// ---------------------------------------------------------------------------
// Rate limit per user (best-effort, in-memory per instance Vercel)
// ---------------------------------------------------------------------------

const aiAttempts = new Map<string, { count: number; resetAt: number }>();
const AI_MAX = 10;
const AI_WINDOW_MS = 60 * 1000;

export function aiRateLimit(userId: number): {
  allowed: boolean;
  remaining: number;
} {
  const key = `ai:${userId}`;
  const now = Date.now();
  const entry = aiAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    aiAttempts.set(key, { count: 1, resetAt: now + AI_WINDOW_MS });
    return { allowed: true, remaining: AI_MAX - 1 };
  }
  entry.count++;
  if (entry.count > AI_MAX) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: AI_MAX - entry.count };
}

// ---------------------------------------------------------------------------
// Penyimpanan key di user_settings
// ---------------------------------------------------------------------------

interface SettingRow {
  value_encrypted: string;
  iv: string;
  auth_tag: string;
  updated_at: string;
}

export async function loadApiKey(
  userId: number
): Promise<{ key: string; updatedAt: string } | null> {
  const db = getDb();
  const rows = await db.query<SettingRow>(
    "SELECT value_encrypted, iv, auth_tag, updated_at FROM user_settings WHERE user_id = $1 AND setting_key = $2",
    [userId, SETTING_KEY_GEMINI]
  );
  if (rows.length === 0) return null;
  const plain = decryptValue(
    rows[0].value_encrypted,
    rows[0].iv,
    rows[0].auth_tag
  );
  if (!plain) return null;
  return { key: plain, updatedAt: rows[0].updated_at };
}

export async function saveApiKey(
  userId: number,
  plain: string
): Promise<void> {
  const db = getDb();
  const enc = encryptValue(plain);
  await db.query(
    `INSERT INTO user_settings (user_id, setting_key, value_encrypted, iv, auth_tag, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id, setting_key)
     DO UPDATE SET value_encrypted = $3, iv = $4, auth_tag = $5, updated_at = now()`,
    [userId, SETTING_KEY_GEMINI, enc.value, enc.iv, enc.authTag]
  );
}

export async function deleteApiKey(userId: number): Promise<void> {
  const db = getDb();
  await db.query(
    "DELETE FROM user_settings WHERE user_id = $1 AND setting_key = $2",
    [userId, SETTING_KEY_GEMINI]
  );
}

// ---------------------------------------------------------------------------
// Pemanggilan Gemini (fetch langsung, tanpa SDK)
// ---------------------------------------------------------------------------

export interface GeminiMessage {
  role: "user" | "model";
  text: string;
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function translateError(status: number, detail: string): GeminiError {
  if (status === 400 || status === 401 || status === 403) {
    return new GeminiError("API key tidak valid atau ditolak Google.", status);
  }
  if (status === 429) {
    return new GeminiError(
      "Quota Gemini habis atau rate limit tercapai. Coba lagi nanti.",
      status
    );
  }
  if (status >= 500) {
    return new GeminiError("Layanan Gemini sedang bermasalah.", status);
  }
  return new GeminiError(detail || "Gagal memanggil Gemini.", status);
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: GeminiMessage[]
): Promise<string> {
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
  } catch {
    throw new GeminiError("Tidak bisa terhubung ke Gemini. Periksa koneksi.", 0);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message || "";
    } catch {
      /* ignore */
    }
    throw translateError(res.status, detail);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p.text || "").join("")
    : "";

  if (!text) {
    const block = data?.promptFeedback?.blockReason;
    throw new GeminiError(
      block
        ? `Permintaan diblokir Google (${block}).`
        : "Gemini mengembalikan jawaban kosong.",
      400
    );
  }
  return text;
}

export async function testApiKey(apiKey: string): Promise<number> {
  const start = Date.now();
  await callGemini(
    apiKey,
    "Balas hanya dengan satu kata: OK",
    [{ role: "user", text: "tes" }]
  );
  return Date.now() - start;
}

// ---------------------------------------------------------------------------
// Konteks laporan untuk dikirim ke model
// ---------------------------------------------------------------------------

interface SummaryRow {
  income: string | number;
  expense: string | number;
}

interface CategoryRow {
  name: string;
  icon: string;
  total: string | number;
}

interface TrendRow {
  month: string;
  income: string | number;
  expense: string | number;
}

interface TxRow {
  type: string;
  amount: string | number;
  category_name?: string;
  account_name?: string;
  to_account_name?: string;
  note?: string;
  date: string;
}

export async function buildReportContext(
  userId: number,
  month: string
): Promise<string> {
  const db = getDb();

  const summary = await db.query<SummaryRow>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions
     WHERE user_id = $1 AND type != 'transfer' AND to_char(date, 'YYYY-MM') = $2`,
    [userId, month]
  );

  const byCategory = await db.query<CategoryRow>(
    `SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1 AND t.type = 'expense' AND to_char(t.date, 'YYYY-MM') = $2
     GROUP BY c.name, c.icon
     ORDER BY total DESC`,
    [userId, month]
  );

  const trend = await db.query<TrendRow>(
    `SELECT
       to_char(date, 'YYYY-MM') as month,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions
     WHERE user_id = $1 AND type != 'transfer' AND date >= (CURRENT_DATE - INTERVAL '6 months')
     GROUP BY to_char(date, 'YYYY-MM')
     ORDER BY month`,
    [userId]
  );

  const transactions = await db.query<TxRow>(
    `SELECT t.type, t.amount, t.note, t.date,
            c.name as category_name, a.name as account_name, ta.name as to_account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     WHERE t.user_id = $1 AND to_char(t.date, 'YYYY-MM') = $2
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ${MAX_CONTEXT_TRANSACTIONS}`,
    [userId, month]
  );

  const income = Number(summary[0]?.income || 0);
  const expense = Number(summary[0]?.expense || 0);
  const expenseTotal = byCategory.reduce((s, c) => s + Number(c.total), 0);

  const payload = {
    bulan: month,
    total_pemasukan: income,
    total_pengeluaran: expense,
    selisih: income - expense,
    jumlah_transaksi_bulan_ini: transactions.length,
    pengeluaran_per_kategori: byCategory.map((c) => ({
      nama: `${c.icon} ${c.name}`,
      total: Number(c.total),
      persen:
        expenseTotal > 0
          ? Math.round((Number(c.total) / expenseTotal) * 1000) / 10
          : 0,
    })),
    tren_6_bulan: trend.map((t) => ({
      bulan: t.month,
      masuk: Number(t.income),
      keluar: Number(t.expense),
    })),
    transaksi_terbaru: transactions.map((t) => ({
      tanggal: t.date,
      tipe: t.type,
      kategori: t.category_name || null,
      akun: t.account_name || null,
      ke: t.to_account_name || null,
      catatan: t.note || null,
      jumlah: Number(t.amount),
    })),
  };

  return JSON.stringify(payload);
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const ANALYZE_SYSTEM_PROMPT = `Anda adalah asisten keuangan pribadi di aplikasi "Catatan Keuangan" (mata uang Rupiah, bahasa Indonesia).

Aturan:
- Gunakan HANYA angka yang ada pada konteks data yang diberikan. Jangan mengarang angka.
- Singkat, padat, langsung ke inti. Maksimal 300 kata.
- Sebut angka dalam format Rupiah (mis. Rp 1.250.000).
- Jangan memberi nasihat investasi, hukum, atau medis.

Format jawaban (markdown sederhana, pakai heading dan bullet):
## Ringkasan
Satu-dua kalimat kondisi bulan ini.
## Temuan
2-4 poin, tiap poin menyertai angka nyata dari data.
## Peringatan
1-2 poin risiko (defisit, kategori yang melonjak, tren naik). Tulis "Tidak ada risiko mencolok." bila aman.
## Saran
Maksimal 3 langkah konkret dan realistis.`;

export const CHAT_SYSTEM_PROMPT = `Anda adalah asisten keuangan pribadi di aplikasi "Catatan Keuangan" (mata uang Rupiah, bahasa Indonesia).

Anda diberi konteks data keuangan dalam format JSON pada pesan pertama. Jawab pertanyaan pengguna tentang data itu.

Aturan:
- Gunakan HANYA angka yang ada pada konteks. Jangan mengarang.
- Singkat, maksimal 120 kata, bahasa Indonesia santai tapi sopan.
- Sebut angka dalam format Rupiah.
- Jika data yang ditanya tidak ada dalam konteks, katakan terus terang bahwa datanya tidak tersedia.
- Jangan memberi nasihat investasi, hukum, atau medis.`;
