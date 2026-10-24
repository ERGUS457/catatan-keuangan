"use client";

import { useEffect, useState } from "react";
import { formatRupiah, getCurrentMonth, formatDateShort } from "@/lib/utils";
import Link from "next/link";
import Logo from "@/components/Logo";

interface Account {
  id: number;
  name: string;
  balance: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  account_name: string;
  to_account_name: string | null;
  category_name: string | null;
  category_icon: string | null;
  note: string | null;
  date: string;
}

interface UserInfo {
  id: number;
  name: string;
  username: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const month = getCurrentMonth();
        const [meRes, accRes, txRes, repRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/accounts"),
          fetch(`/api/transactions?limit=5`),
          fetch(`/api/reports?month=${month}`),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user || null);
        }

        const accData = await accRes.json();
        const txData = await txRes.json();
        const repData = await repRes.json();

        setAccounts(Array.isArray(accData) ? accData : []);
        setTransactions(Array.isArray(txData) ? txData : []);
        setMonthlyIncome(repData.income || 0);
        setMonthlyExpense(repData.expense || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saldo = accounts.find((a) => a.name === "Saldo");
  const cash = accounts.find((a) => a.name === "Cash");
  const total = (saldo?.balance || 0) + (cash?.balance || 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-slate-400 text-sm">Memuat data keuangan...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Top Bar with Brand Logo and Greeting */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-slate-900">
        <Logo size="sm" showText={true} />
        <div className="text-right">
          <p className="text-[11px] text-slate-400">Pengguna</p>
          <p className="text-xs font-semibold text-emerald-400">
            {user ? `${user.name} 👋` : "Pengguna"}
          </p>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
          Total Kekayaan Bersih
        </p>
        <p className="text-3xl font-extrabold text-white tracking-tight">
          {formatRupiah(total)}
        </p>
        <p className="text-[11px] text-slate-500 mt-2">
          Akumulasi total Saldo digital dan Uang tunai (Cash)
        </p>
      </div>

      {/* Account Cards (Saldo vs Cash) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Saldo Digital */}
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900/80 border border-blue-800/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              Saldo Digital
            </span>
            <span className="p-1.5 bg-blue-900/40 rounded-lg text-sm">🏦</span>
          </div>
          <p className="text-xl font-bold text-white tracking-tight">
            {formatRupiah(saldo?.balance || 0)}
          </p>
          <p className="text-[10px] text-blue-400/80 mt-1">Bank & E-Wallet</p>
        </div>

        {/* Cash Tunai */}
        <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/80 border border-amber-800/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Uang Cash
            </span>
            <span className="p-1.5 bg-amber-900/40 rounded-lg text-sm">💵</span>
          </div>
          <p className="text-xl font-bold text-white tracking-tight">
            {formatRupiah(cash?.balance || 0)}
          </p>
          <p className="text-[10px] text-amber-400/80 mt-1">Uang Tunai Dompet</p>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ringkasan Bulan Ini
          </p>
          <span className="text-[11px] text-slate-500">{getCurrentMonth()}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3">
            <p className="text-emerald-400 text-xs font-medium">Pemasukan</p>
            <p className="text-base font-bold text-emerald-300 mt-0.5">
              +{formatRupiah(monthlyIncome)}
            </p>
          </div>
          <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-right">
            <p className="text-rose-400 text-xs font-medium">Pengeluaran</p>
            <p className="text-base font-bold text-rose-300 mt-0.5">
              -{formatRupiah(monthlyExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="pt-1">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            5 Transaksi Terakhir
          </p>
          <Link
            href="/riwayat"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
          >
            Lihat Semua →
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 border border-slate-800/60 rounded-2xl text-slate-500">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm font-medium">Belum ada transaksi</p>
            <p className="text-xs text-slate-600 mt-1">
              Ketuk tombol + di bawah untuk mencatat
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">
                    {tx.type === "transfer"
                      ? "🔄"
                      : tx.category_icon || "📦"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {tx.type === "transfer"
                        ? `${tx.account_name} → ${tx.to_account_name}`
                        : tx.category_name || "Tanpa Kategori"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDateShort(tx.date)} · <span className="text-slate-500">{tx.account_name}</span>
                      {tx.note && <span className="italic text-slate-500"> · {tx.note}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      tx.type === "income"
                        ? "text-emerald-400"
                        : tx.type === "expense"
                        ? "text-rose-400"
                        : "text-blue-400"
                    }`}
                  >
                    {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                    {formatRupiah(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
