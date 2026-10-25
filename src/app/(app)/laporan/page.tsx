"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, getCurrentMonth, formatDate } from "@/lib/utils";

interface CategoryReport {
  name: string;
  icon: string;
  total: number;
}

interface TrendReport {
  month: string;
  income: number;
  expense: number;
}

interface TransactionItem {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  category_name?: string;
  category_icon?: string;
  account_name?: string;
  to_account_name?: string;
  note?: string;
  date: string;
}

function formatMonthName(monthStr: string): string {
  try {
    const [y, m] = monthStr.split("-");
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

export default function LaporanPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryReport[]>([]);
  const [trend, setTrend] = useState<TrendReport[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, txRes] = await Promise.all([
        fetch(`/api/reports?month=${month}`),
        fetch(`/api/transactions?month=${month}`),
      ]);

      const repData = await repRes.json();
      const txData = await txRes.json();

      setIncome(repData.income || 0);
      setExpense(repData.expense || 0);
      setByCategory(Array.isArray(repData.byCategory) ? repData.byCategory : []);
      setTrend(Array.isArray(repData.trend) ? repData.trend : []);
      setTransactions(Array.isArray(txData) ? txData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const net = income - expense;
  const maxTrend = Math.max(
    ...trend.map((t) => Math.max(Number(t.income), Number(t.expense))),
    1
  );

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Printable Sheet View (Only shown in print / PDF) */}
      <div className="hidden print:block text-slate-900 bg-white">
        <div className="border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                Catatan Keuangan
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Laporan Keuangan & Mutasi Transaksi Pribadi
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold uppercase text-slate-700">
                Periode: {formatMonthName(month)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>

        {/* Ringkasan Finansial Print */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
              Total Pemasukan
            </span>
            <span className="text-base font-extrabold text-emerald-700">
              {formatRupiah(income)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
              Total Pengeluaran
            </span>
            <span className="text-base font-extrabold text-red-700">
              {formatRupiah(expense)}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
              Arus Kas Bersih
            </span>
            <span className={`text-base font-extrabold ${net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatRupiah(net)}
            </span>
          </div>
        </div>

        {/* Rincian Kategori Print */}
        {byCategory.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 mb-2">
              Distribusi Pengeluaran per Kategori
            </h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-1.5 font-semibold">Kategori</th>
                  <th className="py-1.5 font-semibold text-right">Nominal</th>
                  <th className="py-1.5 font-semibold text-right">Porsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCategory.map((cat) => {
                  const pct = expense > 0 ? (Number(cat.total) / expense) * 100 : 0;
                  return (
                    <tr key={cat.name}>
                      <td className="py-1.5 font-medium text-slate-800">
                        {cat.icon} {cat.name}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-slate-900">
                        {formatRupiah(Number(cat.total))}
                      </td>
                      <td className="py-1.5 text-right text-slate-600">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabel Mutasi Lengkap Print */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 mb-2">
            Rincian Transaksi ({transactions.length} Transaksi)
          </h2>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center italic">
              Tidak ada catatan transaksi pada periode ini.
            </p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 text-left font-semibold">
                  <th className="py-1.5">Tanggal</th>
                  <th className="py-1.5">Tipe</th>
                  <th className="py-1.5">Kategori / Akun</th>
                  <th className="py-1.5">Keterangan</th>
                  <th className="py-1.5 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="text-slate-700">
                    <td className="py-1.5 whitespace-nowrap text-[11px] text-slate-500">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-1.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        tx.type === "income"
                          ? "bg-emerald-100 text-emerald-800"
                          : tx.type === "expense"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {tx.type === "income" ? "Masuk" : tx.type === "expense" ? "Keluar" : "Transfer"}
                      </span>
                    </td>
                    <td className="py-1.5">
                      {tx.type === "transfer"
                        ? `${tx.account_name} → ${tx.to_account_name}`
                        : `${tx.category_name || "Tanpa Kategori"} (${tx.account_name})`}
                    </td>
                    <td className="py-1.5 text-slate-600 max-w-[150px] truncate">
                      {tx.note || "-"}
                    </td>
                    <td className="py-1.5 text-right font-bold whitespace-nowrap">
                      {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                      {formatRupiah(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <span>Dicetak otomatis via Catatan Keuangan PWA</span>
          <span>Halaman 1</span>
        </div>
      </div>

      {/* Screen Interactive View (Hidden in print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-white">Laporan Keuangan</h1>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
              title="Unduh / Cetak Laporan PDF"
            >
              <span>📄</span>
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">Memuat...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-emerald-400 mb-1">Pemasukan</p>
                <p className="text-sm font-bold text-emerald-300 truncate">
                  {formatRupiah(income)}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-red-400 mb-1">Pengeluaran</p>
                <p className="text-sm font-bold text-red-300 truncate">
                  {formatRupiah(expense)}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-1">Selisih</p>
                <p
                  className={`text-sm font-bold truncate ${
                    net >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatRupiah(net)}
                </p>
              </div>
            </div>

            {/* Expense by Category (Bar Chart) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">
                Pengeluaran per Kategori
              </h2>
              {byCategory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  Belum ada pengeluaran di bulan ini
                </p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map((cat) => {
                    const percent = expense > 0 ? (Number(cat.total) / expense) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                          <span className="font-medium text-slate-200">
                            {formatRupiah(Number(cat.total))} ({percent.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-red-500 h-full rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Trend (Last 6 Months) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">
                Tren 6 Bulan Terakhir
              </h2>
              {trend.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  Belum ada data tren
                </p>
              ) : (
                <div className="space-y-3">
                  {trend.map((t) => {
                    const incW = (Number(t.income) / maxTrend) * 100;
                    const expW = (Number(t.expense) / maxTrend) * 100;
                    return (
                      <div key={t.month} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{t.month}</span>
                          <span>
                            <span className="text-emerald-400">
                              +{formatRupiah(Number(t.income))}
                            </span>{" "}
                            /{" "}
                            <span className="text-red-400">
                              -{formatRupiah(Number(t.expense))}
                            </span>
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${incW}%` }}
                            />
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-red-500 h-full rounded-full"
                              style={{ width: `${expW}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
