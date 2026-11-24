# Desain: Integrasi Gemini AI — Pengaturan API Key, Analisis & Chat di Laporan

Tanggal: 2026-11-25
Status: MENUNGGU PERSETUJUAN
Repo: github.com/ERGUS457/catatan-keuangan

## 1. Intent & Why

Aplikasi catatan keuangan pribadi (Next.js 16 + Neon PostgreSQL, deploy di Vercel)
sudah punya data lengkap: pemasukan, pengeluaran, distribusi kategori, tren 6 bulan,
dan rincian transaksi — tapi penggunanya masih membaca angka itu sendirian.

Tujuan: menambahkan **Gemini AI** supaya pengguna bisa (a) mendapat **analisis
otomatis** atas laporan bulan berjalan, dan (b) **bertanya bebas** tentang
keuangannya ("kenapa pengeluaran naik?", "sisa budget makan berapa?").

Dua kebutuhan turunan yang sudah disepakati:

1. **API key diisi lewat aplikasi** (bukan env var Vercel), lengkap dengan
   **tombol "Uji API Key"**.
2. Section khusus di halaman **Laporan** berisi **Analisis** + **Chat**.

## 2. Goals

- G-1: Pengguna dapat memasukkan, mengganti, dan menguji API key Gemini dari
  halaman Pengaturan tanpa menyentuh Vercel/deploy ulang.
- G-2: API key tidak pernah dikirim ke browser setelah disimpan, tidak pernah
  muncul di log, dan tidak terbaca walau database bocor (di-encrypt at-rest).
- G-3: Tombol "Uji API Key" memberi hasil yang jelas: valid & terhubung, atau
  alasan gagal (key salah / koneksi / quota).
- G-4: Halaman Laporan punya section baru: satu tombol analisis yang
  menghasilkan insight bulan berjalan, dan satu chat yang memahami data
  keuangan pengguna.
- G-5: Riwayat chat tersimpan per pengguna dan bisa dibuka kembali.
- G-6: Semua endpoint AI dilindungi auth yang sudah ada (`getAuthUser()`),
  key milik user A tidak bisa dipakai user B.

### Non-Goals

- Bukan chatbot umum — hanya menjawab seputar data keuangan pengguna.
- Tidak ada streaming token (lihat §5, alasan).
- Tidak ada pilihan model di UI (dikunci `gemini-3.8-flash`).
- Tidak ada integrasi AI di halaman lain (dashboard, riwayat, dsb).
- Tidak ada perubahan pada flow auth, kategori, transaksi, atau cetak PDF.

### Anti-Goals

- Jangan pernah menampilkan key penuh di UI setelah tersimpan.
- Jangan mengirim seluruh transaksi historis tanpa batas ke model (biaya/konteks).
- Jangan mengubah tampilan laporan yang sudah ada — section AI adalah tambahan.

## 3. Constraints

- **Runtime**: Next.js 16 App Router, route handler, Node runtime (bukan Edge).
- **DB**: Neon PostgreSQL via `@neondatabase/serverless`, helper `getDb()`
  dengan parameterized query. Pola yang dipakai seluruh app: `user_id = $1`.
- **Auth**: `getAuthUser()` membaca cookie `ck_session`; middleware sudah
  melindungi semua route non-public, jadi route AI otomatis terproteksi.
- **Tidak ada tooling migrasi** di repo ini — semua tabel dibuat manual di
  Neon SQL Editor. Maka: DDL disediakan sebagai file SQL yang harus dijalankan
  manual sebelum fitur aktif (lihat §7).
- **Bahasa UI**: Indonesia, konsisten dengan seluruh app.
- **Tema**: dark-first dengan aksen `slate-900`/`blue-600`, mengikuti pola
  kartu `bg-slate-900 border border-slate-800 rounded-2xl`.
- **Model**: `gemini-3.8-flash` (stabil, Google AI Studio, rilis 2 Sep 2026).

## 4. Approaches (yang dipertimbangkan)

### A. Env var `GEMINI_API_KEY` di Vercel — DITOLAK
Ditolak atas permintaan pengguna: key harus bisa diisi dari dalam aplikasi.
Kelebihannya (paling aman, paling sedikit kode) tidak relevan dengan kebutuhan.

### B. Key per-user di DB, chat tanpa persistensi — DITOLAK
Tabel `user_settings` saja; riwayat chat hilang saat refresh. Chat keuangan
biasanya ditanya berulang, jadi riwayat dianggap esensial.

### C. Key per-user terenkripsi + tabel riwayat chat — DIPILIH
Dua tabel baru (`user_settings`, `ai_messages`), empat route AI baru, satu
section baru di Laporan, satu section baru di Pengaturan.

**Trade-off**: lebih banyak kode daripada B, tapi riwayat chat bertahan dan
key tetap aman. Konsisten dengan pola app (semua per-user, semua di DB).

## 5. Decisions (keputusan yang sudah diambil)

### D-1: Penyimpanan key
- Tabel `user_settings(user_id, setting_key, value_encrypted, iv, updated_at)`,
  PK `(user_id, setting_key)`.
- Enkripsi **AES-256-GCM** via `node:crypto`. Key turunan:
  `scrypt(SESSION_SECRET, salt="ck-gemini-key", 32)` — tanpa env baru.
- `iv` 12 byte acak disimpan terpisah (GCM nonce). Format simpan:
  `iv:tag:ciphertext` hex, atau tiga kolom — **builder memilih**, asalkan
  tag GCM ikut disimpan.
- Key hanya pernah di-decrypt **di server, dalam satu request** yang sedang
  memanggil Gemini. Tidak ada endpoint yang mengembalikan key ke client.
- Status (ada/tidaknya key) dibaca via endpoint status yang hanya mengembalikan
  boolean + 4 digit terakhir untuk dikenali.

### D-2: Enkripsi vs plain — sudah diputuskan terenkripsi
Alasan: DB Neon bisa dibackup/di-export; app punya multi-user (register
terbuka), jadi kebocoran satu row = kebocoran key asli.

### D-3: Endpoint AI

| Route | Method | Fungsi |
|---|---|---|
| `/api/ai/settings` | GET | Status key: `{ configured, last4, model, updatedAt }` |
| `/api/ai/settings` | PUT | Simpan key baru `{ apiKey }` — divalidasi format dulu (`AIza...`, 39 char), lalu diuji nyata |
| `/api/ai/settings` | DELETE | Hapus key |
| `/api/ai/test` | POST | Tombol **"Uji API Key"**: `{ apiKey? }` — jika field kosong, uji key tersimpan. Kirim `models/gemini-3.8-flash:generateContent` prompt "balas OK". Return `{ ok, message, latencyMs }` |
| `/api/ai/messages` | GET | `?month=YYYY-MM` → `{ messages, analysis }`. `messages`: maks **50** pesan `kind='chat'` terakhir (urut ASC) utk tab Chat. `analysis`: baris `kind='analysis'` **terbaru** utk bulan itu (atau null). |
| `/api/ai/analyze` | POST | Analisis bulan `{ month }` → panggil Gemini dengan ringkasan laporan, **ganti** analisis tersimpan bulan itu (hapus `kind='analysis'` lama → insert baru), kembalikan teks |
| `/api/ai/chat` | POST | Chat `{ month, message }` → kirim konteks data + riwayat 12 pesan terakhir, simpan pasangan user/assistant, kembalikan jawaban |

Semua: `export const dynamic = "force-dynamic"`, cek `getAuthUser()` dulu.

**Rate limit**: helper **terpisah** di `src/lib/gemini.ts`
`aiRateLimit(userId)` — Map in-memory per proses, **10 permintaan/menit per
user id**, mengembalikan 429 saat lewat. `checkRateLimit()` yang ada di
`auth.ts` **tidak disentuh** (itu IP-keyed, 6/15 menit, dan dipakai login
register — mengubahnya melanggar non-goal "tanpa perubahan flow auth").
Catatan jujur: di Vercel yang serverless, Map ini per-instance sehingga
proteksi quota bersifat **best-effort** — bukan jaminan keras. Ini dipilih
daripada tabel counter baru karena DDL sudah dijalankan manual dan app ini
dipakai satu orang.

### D-4: Konteks yang dikirim ke model
Untuk bulan terpilih, kirim **ringkasan terstruktur** (JSON), bukan screenshot
mentah:

```
bulan, total_pemasukan, total_pengeluaran, selisih,
tren_6_bulan [{bulan, masuk, keluar}],
pengeluaran_per_kategori [{nama, total, persen}],
transaksi_terakhir_maks_50 [{tanggal, tipe, kategori, akun, catatan, jumlah}],
jumlah_total_transaksi_bulan_itu
```

Aturan: **maks 50 transaksi** (diambil paling baru), agar token terkendali.
Sisa transaksi tetap bisa ditanyakan user — model tahu jumlahnya.

### D-5: Prompt
- System prompt (Bahasa Indonesia): Anda asisten keuangan pribadi pengguna
  aplikasi Catatan Keuangan. Jawab singkat, pakai Rupiah, sebut angka dari
  konteks, jangan mengarang angka yang tidak ada, dan sarankan maksimal 3
  langkah konkret. Jangan memberi nasihat investasi/medis.
- `analyze`: instruksi menghasilkan 4 bagian — **Ringkasan**, **Temuan**
  (2-4 poin, angka nyata), **Peringatan** (jika defisit/kategori melonjak),
  **Saran** (maks 3, konkret dan realistis untuk penghasilan pengguna).
- `chat`: riwayat 12 pesan terakhir ikut dikirim sebagai `contents`.

### D-6: Tanpa streaming — disengaja
Jawaban dikirim utuh dalam satu JSON response. Alasan: streaming butuh
`ReadableStream` + penanganan cookie/middleware yang hati-hati dan jadi sumber
bug sulit; untuk analisis bulanan yang panjangnya ~200 kata, menunggu 2-4 detik
masih wajar. Bisa ditambahkan belakangan tanpa mengubah skema.

### D-7: UI Pengaturan (section "AI Gemini")
Kartu baru di halaman Pengaturan, urutan: profil → tema → **AI Gemini** →
hutang/piutang → kategori.

Isi kartu:
- Jika belum ada key: penjelasan singkat + input `type="password"` (auto-fill
  off, autocomplete off) + link `https://aistudio.google.com/apikey` +
  tombol **Simpan & Uji**.
- Jika sudah ada: status ✅ `Terhubung · key ****1234`, tombol **Uji API Key**
  (memakai key tersimpan), tombol **Ganti Key** (buka input), tombol **Hapus Key**.
- Area hasil test: spinner saat berjalan, hijau `Terhubung (342 ms)`, atau merah
  dengan pesan error yang sudah diterjemahkan (401 → key tidak valid,
  429 → quota habis, dst).
- Key **tidak pernah** di-fetch ulang ke client; hanya `last4`.

### D-8: UI Laporan (section "AI")
Section baru **di bawah** kartu Tren, hanya tampil di layar (ikut
`print:hidden` — analisis AI tidak ikut ke PDF).

Dua tab dalam satu kartu:
- **Analisis**: tombol `✨ Analisis Bulan Ini` → spinner → hasil dirender
  sebagai markdown sederhana (heading + bullet + **angka tebal**, parser
  ringan buatan sendiri, bukan library). Jika belum ada key, tampilkan ajakan
  "Atur API key di Pengaturan →" sebagai link.
  **Kunjungan ulang**: kalau bulan itu sudah punya analisis tersimpan,
  tampilkan hasilnya **gratis** (tanpa panggil Gemini) + tombol
  `↻ Perbarui` yang memanggil ulang dan **mengganti** yang lama
  (write-once-per-month, bukan menumpuk).
- **Chat**: bubble chat (user kanan biru, AI kiri slate), input di bawah dengan
  placeholder `Tanya soal keuangan bulan ini...`, tombol kirim. Riwayat di-load
  via `GET /api/ai/messages?month=` saat tab dibuka (maks 50). Quick-prompt
  chips: "Kenapa pengeluaran naik?", "Berapa pengeluaran makan bulan ini?",
  "Saran hemat bulan depan".
- Chat terikat `month` yang sedang dipilih; pertanyaan lintas bulan dijawab
  model dari konteks bulan itu saja.

### D-9: Model dikunci `gemini-3.8-flash`
Konstanta `GEMINI_MODEL` di `src/lib/gemini.ts`. Tidak ada UI pemilih model.

### D-10: Klien Gemini tanpa SDK
Pakai `fetch` langsung ke
`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
dengan header `x-goog-api-key` (key di header, bukan query string, agar tidak
muncul di log URL). Tanpa dependency baru — app tidak memakai SDK Google.

## 6. Data Flow

**Simpan key**: Form → `PUT /api/ai/settings` → validasi format → test nyata
ke Gemini → jika sukses: enkripsi → upsert `user_settings` → return `last4`.
Jika test gagal: **tidak disimpan**, error dikembalikan (praktik "uji dulu
baru simpan" mencegah key rusak masuk DB).

**Analisis**: Tombol → `POST /api/ai/analyze {month}` → load ringkasan dari
tabel yang sama seperti `/api/reports` + 50 transaksi terbaru → decrypt key →
panggil Gemini → simpan output ke `ai_messages` (role `assistant`, kind
`analysis`) → return teks → render markdown.

**Chat**: Kirim → `POST /api/ai/chat {month, message}` → load 12 pesan
terakhir user utk bulan itu → decrypt key → Gemini `generateContent` → simpan
user & assistant message → return jawaban.

## 7. Skema Database (DDL — dijalankan manual di Neon)

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setting_key    TEXT    NOT NULL,
  value_encrypted TEXT   NOT NULL,
  iv             TEXT    NOT NULL,
  auth_tag       TEXT    NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, setting_key)
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month      TEXT    NOT NULL,             -- 'YYYY-MM'
  kind       TEXT    NOT NULL DEFAULT 'chat',  -- 'chat' | 'analysis'
  role       TEXT    NOT NULL,             -- 'user' | 'assistant' | 'system'
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_messages_user_month_idx
  ON ai_messages (user_id, month, id DESC);

-- Hapus riwayat chat bulan lalu (opsional, kebersihan data)
-- DELETE FROM ai_messages WHERE month < to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM');
```

Catatan: file `schema.sql` yang berisi DDL di atas **belum ada** di repo dan
menjadi deliverable (§8). Ditekan `IF NOT EXISTS` agar aman dijalankan ulang.

## 8. Deliverables (untuk builder)

1. `schema.sql` (root repo) — DDL §7.
2. `src/lib/gemini.ts` — konstanta model, `encryptSetting()`,
   `decryptSetting()`, `callGemini(key, contents, systemPrompt)`,
   `buildReportContext(db, userId, month)`, penerjemah error Gemini.
3. `src/app/api/ai/settings/route.ts` — GET/PUT/DELETE.
4. `src/app/api/ai/test/route.ts` — POST (tombol uji).
5. `src/app/api/ai/messages/route.ts` — GET (riwayat chat + analisis tersimpan).
6. `src/app/api/ai/analyze/route.ts` — POST.
7. `src/app/api/ai/chat/route.ts` — POST.
8. `src/app/(app)/pengaturan/page.tsx` — tambah section AI Gemini (D-7).
9. `src/app/(app)/laporan/page.tsx` — tambah section AI (D-8), komponen
   chat & analisis boleh dipecah ke `src/components/ai/`.
10. `README.md` — bagian "AI Gemini": cara ambil key, jalankan DDL, ganti key.
11. `.env.example` — **tidak** berubah (tidak ada env baru; `SESSION_SECRET`
    sudah dipakai untuk derivation).

Ketergantungan: **tidak ada package npm baru.**

## 9. Testing / Acceptance

- `npm run build` lolos (TypeScript strict).
- Jalankan DDL → simpan key lewat UI → test key sukses → status muncul `****1234`.
- Key salah → tombol uji merah dengan pesan jelas, key **tidak** tersimpan.
- Hapus key → section AI menampilkan ajakan mengatur key, endpoint AI
  mengembalikan `503 { error: "API key belum diatur" }`.
- Analisis menghasilkan 4 bagian dengan angka yang cocok dengan `byCategory`.
- Chat: tanya "berapa pengeluaran bulan ini" → jawaban cocok dengan `expense`.
- Refresh halaman Laporan → riwayat chat masih ada.
- User B (register akun kedua) tidak melihat key maupun chat user A.
- Tanpa login → semua `/api/ai/*` redirect ke `/login`.
- Cetak PDF laporan → section AI tidak ikut tercetak.

## 10. Risks

- **Quota/biaya Gemini**: dijawab dengan rate-limit 10 req/menit/user,
  batas 50 transaksi, dan riwayat 12 pesan.
- **`SESSION_SECRET` diganti** → key tersimpan tidak bisa didecrypt lagi →
  pengguna harus memasukkan ulang. Didokumentasikan di README.
- **Neon pool/connection**: ikut pola `getDb()` yang sudah terbukti.
- **Prompt injection dari catatan transaksi**: catatan user dikirim sebagai
  data dalam JSON; system prompt membatasi peran model. Risiko sisa: rendah,
  dan ini app pribadi.

## 11. Pertanyaan terbuka (menunggu jawaban pemilik)

- **Q-1 — Siapa yang menjalankan verifikasi end-to-end (§9)?** Builder
  butuh `DATABASE_URL` Neon + DDL dijalankan + API key Gemini asli untuk
  menguji jalur penuh. Kalau kredensial tidak tersedia, definisi "selesai"
  menjadi: `npm run build` hijau + daftar langkah verifikasi manual untuk
  pemilik dijalankan sendiri.
