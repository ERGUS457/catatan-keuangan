"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";

interface DebtItem {
  id: number;
  user_id: number;
  type: "payable" | "receivable";
  person_name: string;
  amount: number;
  due_date: string | null;
  note: string | null;
  status: "unpaid" | "paid";
  paid_at: string | null;
  created_at: string;
}

export default function HutangPiutangPage() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "receivable" | "payable" | "paid">("all");
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"receivable" | "payable">("receivable");
  const [personName, setPersonName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/debts");
      if (res.ok) {
        const data = await res.json();
        setDebts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  async function handleToggleStatus(item: DebtItem) {
    const nextStatus = item.status === "unpaid" ? "paid" : "unpaid";
    try {
      const res = await fetch(`/api/debts/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setDebts((prev) =>
          prev.map((d) =>
            d.id === item.id
              ? {
                  ...d,
                  status: nextStatus,
                  paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
                }
              : d
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus catatan hutang/piutang ini?")) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDebts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanAmount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!personName.trim()) {
      setError("Masukkan nama orang");
      return;
    }
    if (!cleanAmount || cleanAmount <= 0) {
      setError("Masukkan nominal yang valid");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          person_name: personName.trim(),
          amount: cleanAmount,
          due_date: dueDate || null,
          note: note.trim() || null,
        }),
      });

      if (res.ok) {
        setPersonName("");
        setAmountInput("");
        setDueDate("");
        setNote("");
        setShowForm(false);
        loadDebts();
      } else {
        const data = await res.json();
        setError(data.error || "Gagal menyimpan");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setSubmitting(false);
    }
  }

  // Aggregates
  const totalReceivableUnpaid = debts
    .filter((d) => d.type === "receivable" && d.status === "unpaid")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const totalPayableUnpaid = debts
    .filter((d) => d.type === "payable" && d.status === "unpaid")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  // Filtered List
  const filteredDebts = debts.filter((d) => {
    if (filter === "receivable") return d.type === "receivable" && d.status === "unpaid";
    if (filter === "payable") return d.type === "payable" && d.status === "unpaid";
    if (filter === "paid") return d.status === "paid";
    return true; // "all"
  });

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mb-1"
          >
            ← Kembali ke Beranda
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Hutang & Piutang</span>
            <span>🤝</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-semibold text-white shadow-md shadow-emerald-950 transition-all cursor-pointer"
        >
          {showForm ? "Tutup Form" : "+ Catat Baru"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Piutang (Tertagih)</span>
          </div>
          <p className="text-lg font-bold text-emerald-300">
            {formatRupiah(totalReceivableUnpaid)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Uang di orang lain (belum kembali)
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1 text-red-400">
            <span className="text-xs font-bold uppercase tracking-wider">Hutang (Kewajiban)</span>
          </div>
          <p className="text-lg font-bold text-red-300">
            {formatRupiah(totalPayableUnpaid)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Harus saya bayar ke orang lain
          </p>
        </div>
      </div>

      {/* Form Input Modal/Section */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-xl"
        >
          <h2 className="text-sm font-semibold text-white">Tambah Catatan Hutang/Piutang</h2>

          {error && (
            <div className="p-2 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormType("receivable")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                formType === "receivable"
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              💚 Piutang (Dia Pinjam ke Saya)
            </button>
            <button
              type="button"
              onClick={() => setFormType("payable")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                formType === "payable"
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              ❤️ Hutang (Saya Pinjam ke Dia)
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              {formType === "receivable" ? "Nama Peminjam (Siapa yang berhutang?)" : "Nama Pemberi Pinjaman"}
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Contoh: Budi, Sisko, Ro'ai..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Nominal (Rp)</label>
            <input
              type="text"
              value={amountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setAmountInput(raw ? "Rp " + parseInt(raw, 10).toLocaleString("id-ID") : "");
              }}
              placeholder="Rp 0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Jatuh Tempo (Opsional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Keterangan Singkat</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Talangan makan"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Catatan"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { key: "all", label: `Semua (${debts.length})` },
          { key: "receivable", label: "Piutang Saya" },
          { key: "payable", label: "Hutang Saya" },
          { key: "paid", label: "Sudah Lunas" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-xl border font-medium whitespace-nowrap transition-all cursor-pointer ${
              filter === tab.key
                ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                : "bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 animate-pulse">Memuat...</div>
      ) : filteredDebts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-900/50 border border-slate-800/60 rounded-2xl">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-xs">Tidak ada catatan hutang / piutang</p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              + Catat sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDebts.map((item) => {
            const isPaid = item.status === "paid";
            const isReceivable = item.type === "receivable";

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-3.5 transition-all ${
                  isPaid
                    ? "border-slate-800/50 opacity-60"
                    : isReceivable
                    ? "border-emerald-900/40"
                    : "border-red-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isPaid
                          ? "bg-slate-800 text-slate-400"
                          : isReceivable
                          ? "bg-emerald-950/80 border border-emerald-800/60 text-emerald-300"
                          : "bg-red-950/80 border border-red-800/60 text-red-300"
                      }`}
                    >
                      {item.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className={`font-semibold text-sm ${isPaid ? "text-slate-400 line-through" : "text-white"}`}>
                          {item.person_name}
                        </p>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isReceivable
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                              : "bg-red-950/80 text-red-400 border border-red-800/50"
                          }`}
                        >
                          {isReceivable ? "Piutang" : "Hutang"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isReceivable ? "Dia berhutang:" : "Saya berhutang:"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-bold text-sm ${
                        isPaid
                          ? "text-slate-500 line-through"
                          : isReceivable
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatRupiah(item.amount)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-full ${
                        isPaid
                          ? "bg-slate-800 text-slate-400"
                          : "bg-amber-950/70 text-amber-300 border border-amber-800/40"
                      }`}
                    >
                      {isPaid ? "✓ Lunas" : "Belum Lunas"}
                    </span>
                  </div>
                </div>

                {/* Additional Details */}
                {(item.note || item.due_date) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
                    {item.note && <p className="italic text-slate-300 truncate max-w-[200px]">{item.note}</p>}
                    {item.due_date && (
                      <p className="text-slate-400 ml-auto">
                        📅 Tempo: <span className="text-slate-200">{formatDate(item.due_date)}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 mt-2.5 pt-2 border-t border-slate-800/60 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    className={`font-semibold cursor-pointer transition-colors ${
                      isPaid
                        ? "text-slate-400 hover:text-white"
                        : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    {isPaid ? "Tandai Belum Lunas" : "✓ Tandai Sudah Lunas"}
                  </button>
                  <span className="text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
