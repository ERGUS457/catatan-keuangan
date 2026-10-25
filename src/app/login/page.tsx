"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("PIN / Password harus diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Login gagal");
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Brand Header with Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="p-3 bg-slate-900 border border-blue-900/40 rounded-2xl mb-4 shadow-xl shadow-blue-950/40">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Catatan<span className="text-blue-400">Keuangan</span>
          </h1>
          <p className="text-xs font-semibold text-blue-400/80 tracking-widest uppercase mt-0.5">
            Pribadi & PWA
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Masuk untuk mengakses saldo Saldo & Cash Anda
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username <span className="text-slate-500 font-normal">(opsional jika login PIN utama)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="Contoh: ergus"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                PIN / Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan 6 digit PIN atau password"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm pr-12 tracking-wider"
                  autoFocus
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1 py-1"
                >
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-900/40 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memeriksa...</span>
                </>
              ) : (
                "Masuk ke Aplikasi"
              )}
            </button>
          </form>

          {/* Registration CTA */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">
              Belum memiliki akun?
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl border border-blue-600/40 hover:border-blue-500 bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 font-medium text-xs transition"
            >
              ✨ Buat / Daftar Akun Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
