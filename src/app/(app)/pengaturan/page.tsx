"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  icon: string;
}

interface UserInfo {
  id: number;
  name: string;
  username: string;
}

export default function PengaturanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [icon, setIcon] = useState("📦");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const icons = ["🍽️", "🚗", "🛒", "📄", "🎮", "💊", "📚", "💰", "🎁", "📈", "🎉", "✈️", "☕", "🏠", "👔", "📦", "💻", "🏋️", "🍕", "⛽"];

  async function loadData() {
    try {
      const [meRes, catRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/categories"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user || null);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, icon }),
      });

      if (res.ok) {
        setName("");
        const catRes = await fetch("/api/categories");
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      } else {
        const data = await res.json();
        setError(data.error || "Gagal menambah kategori");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm("Hapus kategori ini?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        const catRes = await fetch("/api/categories");
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      } else {
        alert(data.error || "Gagal menghapus");
      }
    } catch {
      alert("Koneksi gagal");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-900">
        <Logo size="sm" showText={true} />
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
          Pengaturan
        </span>
      </div>

      {/* Profile Card */}
      {user && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-xl font-bold text-emerald-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-white">{user.name}</p>
              <p className="text-xs text-slate-400">@{user.username}</p>
            </div>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
            Akun Aktif
          </span>
        </div>
      )}

      {/* Fitur Tambahan: Hutang & Piutang */}
      <Link
        href="/hutang-piutang"
        className="block bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <p className="text-sm font-semibold text-white">Kelola Hutang & Piutang</p>
              <p className="text-xs text-slate-400">Pencatatan pinjaman, talangan teman, dan jatuh tempo</p>
            </div>
          </div>
          <span className="text-xs text-emerald-400 font-medium">Buka →</span>
        </div>
      </Link>

      {/* Add Category Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Tambah Kategori Baru</h2>
          <span className="text-xs text-slate-500">Kustomisasi</span>
        </div>

        <form onSubmit={handleAddCategory} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs rounded-lg font-semibold transition ${
                type === "expense"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs rounded-lg font-semibold transition ${
                type === "income"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pemasukan
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-lg text-white focus:outline-none focus:border-emerald-500"
            >
              {icons.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kategori baru..."
              className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950/50"
          >
            {loading ? "Menyimpan..." : "+ Tambah Kategori"}
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white">Daftar Kategori Anda</h2>
          <span className="text-xs text-slate-500">{categories.length} kategori</span>
        </div>

        <div className="space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center justify-between hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <span className="text-sm font-medium text-white">{c.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    c.type === "income"
                      ? "bg-emerald-950/80 border border-emerald-800/50 text-emerald-400"
                      : "bg-rose-950/80 border border-rose-800/50 text-rose-400"
                  }`}
                >
                  {c.type === "income" ? "Pemasukan" : "Pengeluaran"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteCategory(c.id)}
                className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded-lg hover:bg-rose-950/30 transition"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* App Info & Logout */}
      <div className="pt-4 border-t border-slate-900 space-y-4">
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">Catatan Keuangan PWA v1.1</p>
          <p>Database Neon PostgreSQL (Singapore) · Vercel Hosted</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3.5 bg-rose-950/30 border border-rose-900/40 text-rose-400 hover:bg-rose-950/60 font-semibold text-sm rounded-2xl transition shadow-lg shadow-rose-950/20"
        >
          Keluar dari Akun (Logout)
        </button>
      </div>
    </div>
  );
}
