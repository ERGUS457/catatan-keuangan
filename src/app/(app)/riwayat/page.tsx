"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, formatDate, getCurrentMonth } from "@/lib/utils";

interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  account_id: number;
  to_account_id: number | null;
  category_id: number | null;
  account_name: string;
  to_account_name: string | null;
  category_name: string | null;
  category_icon: string | null;
  note: string | null;
  date: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface Account {
  id: number;
  name: string;
}

export default function RiwayatPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [type, setType] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      if (type) params.append("type", type);
      if (accountId) params.append("account_id", accountId);
      if (categoryId) params.append("category_id", categoryId);

      const [txRes, catRes, accRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        fetch("/api/categories"),
        fetch("/api/accounts"),
      ]);

      const txData = await txRes.json();
      const catData = await catRes.json();
      const accData = await accRes.json();

      setTransactions(Array.isArray(txData) ? txData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, type, accountId, categoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(id: number) {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTx) return;

    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTx),
      });
      if (res.ok) {
        setEditingTx(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-white">Riwayat Transaksi</h1>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Bulan</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Tipe</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="">Semua Tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Sumber Dana</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="">Semua Akun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 animate-pulse">Memuat...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-3xl mb-2">🔍</p>
          <p>Tidak ada transaksi yang cocok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {tx.type === "transfer" ? "🔄" : tx.category_icon || "📦"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {tx.type === "transfer"
                        ? `${tx.account_name} → ${tx.to_account_name}`
                        : tx.category_name || "Tanpa Kategori"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(tx.date)} ·{" "}
                      <span
                        className={
                          tx.account_name === "Saldo"
                            ? "text-blue-400"
                            : "text-orange-400"
                        }
                      >
                        {tx.account_name}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold text-sm ${
                      tx.type === "income"
                        ? "text-emerald-400"
                        : tx.type === "expense"
                        ? "text-red-400"
                        : "text-blue-400"
                    }`}
                  >
                    {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                    {formatRupiah(tx.amount)}
                  </p>
                </div>
              </div>

              {tx.note && (
                <p className="text-xs text-slate-500 mt-1 pl-7">{tx.note}</p>
              )}

              <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-slate-800/60 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingTx(tx)}
                  className="text-slate-400 hover:text-white"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tx.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm space-y-3">
            <h2 className="text-lg font-bold text-white">Ubah Transaksi</h2>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nominal</label>
                <input
                  type="number"
                  value={editingTx.amount}
                  onChange={(e) =>
                    setEditingTx({
                      ...editingTx,
                      amount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editingTx.date.split("T")[0]}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, date: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Catatan</label>
                <input
                  type="text"
                  value={editingTx.note || ""}
                  onChange={(e) =>
                    setEditingTx({ ...editingTx, note: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
