"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToday } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  type: string;
  icon: string;
}

interface Account {
  id: number;
  name: string;
}

export default function TambahPage() {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<number>(1); // Saldo
  const [toAccountId, setToAccountId] = useState<number>(2); // Cash (for transfer)
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getToday());
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [catRes, accRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/accounts"),
        ]);
        const catData = await catRes.json();
        const accData = await accRes.json();

        setCategories(catData);
        setAccounts(accData);

        // Default category for current type
        const filtered = catData.filter((c: Category) => c.type === "expense");
        if (filtered.length > 0) setCategoryId(filtered[0].id);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  // Update default category when type changes
  function handleTypeChange(newType: "expense" | "income" | "transfer") {
    setType(newType);
    if (newType !== "transfer") {
      const filtered = categories.filter((c) => c.type === newType);
      if (filtered.length > 0) setCategoryId(filtered[0].id);
      else setCategoryId(null);
    }
  }

  function handleKeypad(val: string) {
    if (val === "backspace") {
      setAmount((prev) => prev.slice(0, -1));
    } else if (val === "clear") {
      setAmount("");
    } else {
      if (amount.length >= 10) return; // Cap at billions
      setAmount((prev) => prev + val);
    }
  }

  function handleQuickChip(val: number) {
    const cur = parseInt(amount || "0", 10);
    const next = cur + val;
    if (next.toString().length > 10) return;
    setAmount(next.toString());
  }

  const numAmount = parseInt(amount || "0", 10);
  const displayAmount = numAmount > 0 ? "Rp " + numAmount.toLocaleString("id-ID") : "Rp 0";

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit() {
    if (numAmount <= 0) {
      setError("Masukkan nominal");
      return;
    }

    if (type === "transfer" && accountId === toAccountId) {
      setError("Sumber dan tujuan transfer tidak boleh sama");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: numAmount,
          account_id: accountId,
          to_account_id: type === "transfer" ? toAccountId : null,
          category_id: type !== "transfer" ? categoryId : null,
          note: note.trim() || null,
          date,
        }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Gagal menyimpan");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Type Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`py-3 rounded-lg font-medium text-sm transition-all ${
            type === "expense"
              ? "bg-red-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`py-3 rounded-lg font-medium text-sm transition-all ${
            type === "income"
              ? "bg-emerald-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("transfer")}
          className={`py-3 rounded-lg font-medium text-sm transition-all ${
            type === "transfer"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Transfer
        </button>
      </div>

      {/* Amount Display */}
      <div className="text-center py-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <p className="text-slate-400 text-xs mb-1">Nominal</p>
        <p
          className={`text-3xl font-bold tracking-tight ${
            type === "income"
              ? "text-emerald-400"
              : type === "expense"
              ? "text-red-400"
              : "text-blue-400"
          }`}
        >
          {displayAmount}
        </p>
      </div>

      {/* Quick Amount Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { label: "+10rb", val: 10000 },
          { label: "+20rb", val: 20000 },
          { label: "+50rb", val: 50000 },
          { label: "+100rb", val: 100000 },
          { label: "+200rb", val: 200000 },
          { label: "+500rb", val: 500000 },
        ].map((chip) => (
          <button
            key={chip.val}
            type="button"
            onClick={() => handleQuickChip(chip.val)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 active:scale-95 text-xs font-semibold text-slate-300 transition-all shrink-0 cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
        {numAmount > 0 && (
          <button
            type="button"
            onClick={() => setAmount("")}
            className="px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs font-semibold text-red-300 transition-all shrink-0 active:scale-95 cursor-pointer"
            title="Reset Nominal"
          >
            Reset
          </button>
        )}
      </div>

      {/* Account / Transfer Selector */}
      {type === "transfer" ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Dari Sumber</label>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={`py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                    accountId === acc.id
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  {acc.name === "Saldo" ? "🏦 " : "💵 "}
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Ke Tujuan</label>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setToAccountId(acc.id)}
                  className={`py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                    toAccountId === acc.id
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  {acc.name === "Saldo" ? "🏦 " : "💵 "}
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs text-slate-400 block mb-1">Sumber Dana</label>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setAccountId(acc.id)}
                className={`py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                  accountId === acc.id
                    ? acc.name === "Saldo"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-orange-600 border-orange-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                {acc.name === "Saldo" ? "🏦 Saldo (Digital)" : "💵 Cash (Tunai)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Grid (for non-transfer) */}
      {type !== "transfer" && (
        <div>
          <label className="text-xs text-slate-400 block mb-1">Kategori</label>
          <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`p-2 rounded-xl flex flex-col items-center justify-center border transition-all ${
                  categoryId === c.id
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-[11px] truncate w-full text-center mt-1">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date & Note */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Catatan</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opsional"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "backspace"].map(
          (k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKeypad(k)}
              className="py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-medium rounded-xl text-lg border border-slate-800 flex items-center justify-center transition-colors"
            >
              {k === "backspace" ? "⌫" : k}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm text-center bg-red-950/50 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || numAmount <= 0}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-xl text-lg transition-colors shadow-lg shadow-emerald-900/30"
      >
        {loading ? "Menyimpan..." : "Simpan Transaksi"}
      </button>
    </div>
  );
}
