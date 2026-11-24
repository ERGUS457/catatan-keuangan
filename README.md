# Catatan Keuangan 💰

Aplikasi pencatatan keuangan harian pribadi yang simpel, mobile-first, mendukung PWA, dengan pemisahan jelas antara **SALDO** (uang digital: rekening bank, e-wallet) dan **CASH** (uang tunai).

## Fitur Utama

- **Dashboard**: Kartu Saldo & Cash terpisah, total kekayaan, ringkasan bulanan, 5 transaksi terakhir.
- **Tambah Transaksi (Maksimal 3 Ketukan)**: Keypad angka mobile, pemilih kategori cepat, sumber dana.
- **Transfer Antar Sumber Dana**: Tarik tunai (Saldo → Cash) & Setor tunai (Cash → Saldo) tanpa tercatat sebagai pemasukan/pengeluaran.
- **Riwayat Transaksi**: Filter per bulan, tipe, akun, dan kategori. Edit & hapus transaksi.
- **Laporan Visual**: Pengeluaran per kategori (persentase & bar), tren keuangan 6 bulan terakhir.
- **Kelola Kategori**: Tambah & hapus kategori kustom.
- **Keamanan**: Login PIN terlindungi hash SHA-256, session bertanda tangan HMAC, rate limiting 5x percobaan per 15 menit, route middleware protection.
- **PWA & Offline**: Installable di ponsel (Android/iOS), offline fallback page, standalone mode.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon PostgreSQL (Serverless Driver)
- **Deployment**: Vercel (Region Singapore `sin1`)

## Persiapan Lokal

1. Clone repositori:
   ```bash
   git clone https://github.com/ERGUS457/catatan-keuangan.git
   cd catatan-keuangan
   ```

2. Salin environment variable:
   ```bash
   cp .env.example .env.local
   ```
   Isi `DATABASE_URL`, `APP_PASSWORD_HASH`, dan `SESSION_SECRET`.

3. Install dependensi:
   ```bash
   npm install
   ```

4. Jalankan server dev:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Deskripsi |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection URI |
| `APP_PASSWORD_HASH` | SHA-256 hash dari PIN/password |
| `SESSION_SECRET` | String acak panjang untuk HMAC signature |

## AI Gemini (Opsional)

Fitur analisis laporan dan chat keuangan bertenaga **Gemini 3.8 Flash**. Seluruhnya
opsional — tanpa API key, fitur lain tetap jalan normal.

### Aktivasi

1. **Jalankan skema database** di Neon SQL Editor (sekali saja):
   ```sql
   -- isi dari file schema.sql di root repo
   ```
2. Ambil API key gratis di [Google AI Studio](https://aistudio.google.com/apikey).
3. Buka **Pengaturan → AI Gemini**, tempel key, klik **Simpan & Uji**.
   Key diuji dulu ke Google sebelum disimpan; bila gagal, tidak ada yang tersimpan.
4. Buka **Laporan** → section **✨ AI Gemini**:
   - **📊 Analisis** — ringkasan, temuan, peringatan, dan saran untuk bulan terpilih.
     Hasil tersimpan, jadi membuka ulang tidak memanggil Gemini lagi; pakai **↻ Perbarui**
     untuk analisis baru.
   - **💬 Chat** — tanya bebas soal keuangan bulan itu. Riwayat tersimpan.

### Catatan teknis

- API key di-encrypt (AES-256-GCM) di tabel `user_settings`, key enkripsi
  diturunkan dari `SESSION_SECRET`. Key tidak pernah dikirim ke browser.
- **Jangan ganti `SESSION_SECRET`** tanpa memasukkan ulang key — key lama jadi
  tidak terbaca.
- Rate limit 10 permintaan AI per menit per pengguna (best-effort, in-memory).
- Model dikunci `gemini-3.8-flash` di `src/lib/gemini.ts`.
- Tanpa env variable tambahan.

## Deploy ke Vercel

1. Hubungkan repository GitHub ke project Vercel.
2. Tambahkan environment variable yang diperlukan di project settings.
3. Deploy akan berjalan otomatis pada setiap push ke branch `main`.
