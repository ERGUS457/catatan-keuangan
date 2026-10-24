"use client";

import { useEffect, useState } from "react";
import { formatRupiah, getCurrentMonth, formatDateShort } from "@/lib/utils";
import Link from "next/link";

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

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const month = getCurrentMonth();
        const [accRes, txRes, repRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch(`/api/transactions?limit=5`),
          fetch(`/api/reports?month=${month}`),
        ]);
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
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse text-lg">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-2">
        <p className="text-slate-400 text-sm">Total Kekayaan</p>
        <p className="text-3xl font-bold text-white">{formatRupiah(total)}</p>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-950/50 border border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-lg">🏦</span>
            <span className="text-blue-300 text-sm font-medium">Saldo</span>
          </div>
          <p className="text-xl font-bold text-white">
            {formatRupiah(saldo?.balance || 0)}
          </p>
        </div>
        <div className="bg-orange-950/50 border border-orange-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-orange-400 text-lg">💵</span>
            <span className="text-orange-300 text-sm font-medium">Cash</span>
          </div>
          <p className="text-xl font-bold text-white">
            {formatRupiah(cash?.balance || 0)}
          </p>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <p className="text-slate-400 text-sm mb-3">Bulan Ini</p>
        <div className="flex justify-between">
          <div>
            <p className="text-emerald-400 text-sm">Pemasukan</p>
            <p className="text-lg font-semibold text-emerald-300">
              {formatRupiah(monthlyIncome)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-red-400 text-sm">Pengeluaran</p>
            <p className="text-lg font-semibold text-red-300">
              {formatRupiah(monthlyExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-slate-300 font-medium">Transaksi Terakhir</p>
          <Link href="/riwayat" className="text-emerald-400 text-sm">
            Lihat Semua
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-2">📝</p>
            <p>Belum ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {tx.type === "transfer"
                      ? "🔄"
                      : tx.category_icon || "📦"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {tx.type === "transfer"
                        ? `${tx.account_name} → ${tx.to_account_name}`
                        : tx.category_name || "Tanpa Kategori"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateShort(tx.date)} · {tx.account_name}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-semibold ${
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
