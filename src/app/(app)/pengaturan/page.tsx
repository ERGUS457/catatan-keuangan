"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  icon: string;
}

export default function PengaturanPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [icon, setIcon] = useState("📦");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const icons = ["🍽️", "🚗", "🛒", "📄", "🎮", "💊", "📚", "💰", "🎁", "📈", "🎉", "✈️", "☕", "🏠", "👔", "📦"];

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadCategories();
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
        loadCategories();
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
        loadCategories();
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
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-white">Pengaturan</h1>

      {/* Add Category Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Tambah Kategori Baru</h2>

        <form onSubmit={handleAddCategory} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs rounded-lg font-medium ${
                type === "expense"
                  ? "bg-red-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs rounded-lg font-medium ${
                type === "income"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Pemasukan
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 text-lg"
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
              placeholder="Nama kategori..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
              required
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            {loading ? "Menyimpan..." : "Tambah Kategori"}
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Daftar Kategori</h2>

        <div className="space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>{c.icon}</span>
                <span className="text-sm text-white">{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.type === "income"
                      ? "bg-emerald-950 text-emerald-400"
                      : "bg-red-950 text-red-400"
                  }`}
                >
                  {c.type === "income" ? "Pemasukan" : "Pengeluaran"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteCategory(c.id)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* App Info & Logout */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="text-xs text-slate-500 space-y-1">
          <p>Catatan Keuangan v1.0</p>
          <p>Tersimpan aman di Neon PostgreSQL</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 bg-red-950/40 border border-red-900/40 text-red-400 hover:bg-red-950/60 font-medium text-sm rounded-xl transition-colors"
        >
          Keluar dari Aplikasi
        </button>
      </div>
    </div>
  );
}
