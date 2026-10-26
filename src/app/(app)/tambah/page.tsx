"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToday } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [accountId, setAccountId] = useState<number>(0);
  const [toAccountId, setToAccountId] = useState<number>(0);
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
        if (Array.isArray(accData) && accData.length > 0) {
          setAccounts(accData);
          setAccountId(accData[0].id);
          if (accData.length > 1) {
            setToAccountId(accData[1].id);
          } else {
            setToAccountId(accData[0].id);
          }
        }

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

  function selectSourceAccount(id: number) {
    setAccountId(id);
    if (toAccountId === id) {
      const other = accounts.find((a) => a.id !== id);
      if (other) setToAccountId(other.id);
    }
  }

  function selectDestAccount(id: number) {
    setToAccountId(id);
    if (accountId === id) {
      const other = accounts.find((a) => a.id !== id);
      if (other) setAccountId(other.id);
    }
  }

  function handleSwapAccounts() {
    if (accountId && toAccountId) {
      const temp = accountId;
      setAccountId(toAccountId);
      setToAccountId(temp);
    }
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
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <h1 className="text-xl font-bold text-white">Catat Transaksi</h1>
        <ThemeToggle />
      </div>

      {/* Type Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            type === "expense"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-950/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            type === "income"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-950/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("transfer")}
          className={`py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            type === "transfer"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Transfer
        </button>
      </div>

      {/* Amount Display */}
      <div className="text-center py-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        <p className="text-slate-400 text-xs mb-1">Nominal</p>
        <p
          className={`text-3xl font-bold tracking-tight ${
            type === "income"
              ? "text-blue-400"
              : type === "expense"
              ? "text-rose-400"
              : "text-indigo-400"
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
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-700/60 active:scale-95 text-xs font-semibold text-slate-300 hover:text-blue-300 transition-all shrink-0 cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
        {numAmount > 0 && (
          <button
            type="button"
            onClick={() => setAmount("")}
            className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-xs font-semibold text-rose-300 transition-all shrink-0 active:scale-95 cursor-pointer"
            title="Reset Nominal"
          >
            Reset
          </button>
        )}
      </div>

      {/* Account / Transfer Selector */}
      {type === "transfer" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Arah Pemindahan Dana
            </span>
            <button
              type="button"
              onClick={handleSwapAccounts}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-800/50 cursor-pointer active:scale-95 transition-all"
            >
              ⇄ Tukar Arah
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-rose-300">
                1. Dari Sumber (Saldo Berkurang -)
              </label>
              <span className="text-[10px] text-slate-500">Asal uang</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((acc) => (
                <button
                  key={`src-${acc.id}`}
                  type="button"
                  onClick={() => selectSourceAccount(acc.id)}
                  className={`py-3 px-3 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                    accountId === acc.id
                      ? "bg-rose-600/90 border-rose-500 text-white shadow-md shadow-rose-950"
                      : "bg-slate-800/70 border-slate-700/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {acc.name === "Saldo" ? "🏦 Saldo (Digital)" : "💵 Cash (Tunai)"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-indigo-400 text-xs py-0.5">
            <span className="h-px bg-slate-800 flex-1"></span>
            <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px]">
              ➔ Ditransfer Menjadi ➔
            </span>
            <span className="h-px bg-slate-800 flex-1"></span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-blue-300">
                2. Ke Tujuan (Saldo Bertambah +)
              </label>
              <span className="text-[10px] text-slate-500">Tujuan uang</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((acc) => (
                <button
                  key={`dest-${acc.id}`}
                  type="button"
                  onClick={() => selectDestAccount(acc.id)}
                  className={`py-3 px-3 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                    toAccountId === acc.id
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-950"
                      : "bg-slate-800/70 border-slate-700/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {acc.name === "Saldo" ? "🏦 Saldo (Digital)" : "💵 Cash (Tunai)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <label className="text-xs text-slate-400 block mb-2 font-medium">
            {type === "income" ? "Masuk ke Rekening / Dompet" : "Sumber Pembayaran"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setAccountId(acc.id)}
                className={`py-3 px-3 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                  accountId === acc.id
                    ? acc.name === "Saldo"
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-950"
                      : "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-950"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <label className="text-xs text-slate-400 block mb-2 font-medium">Pilih Kategori</label>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`p-2.5 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                  categoryId === c.id
                    ? "bg-blue-950/70 border-blue-500 text-blue-300 shadow-md shadow-blue-950/40"
                    : "bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <label className="text-xs text-slate-400 block mb-1">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <label className="text-xs text-slate-400 block mb-1">Catatan</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opsional"
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
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
              className="py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-medium rounded-xl text-lg border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              {k === "backspace" ? "⌫" : k}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="text-rose-300 text-xs text-center bg-rose-950/60 border border-rose-800/60 rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || numAmount <= 0}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-2xl text-base transition-colors shadow-lg shadow-blue-900/30 cursor-pointer active:scale-[0.99]"
      >
        {loading ? "Menyimpan Transaksi..." : "Simpan Transaksi"}
      </button>
    </div>
  );
}
