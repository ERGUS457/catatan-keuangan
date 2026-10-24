"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRupiah, getCurrentMonth } from "@/lib/utils";

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

export default function LaporanPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryReport[]>([]);
  const [trend, setTrend] = useState<TrendReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?month=${month}`);
      const data = await res.json();
      setIncome(data.income || 0);
      setExpense(data.expense || 0);
      setByCategory(Array.isArray(data.byCategory) ? data.byCategory : []);
      setTrend(Array.isArray(data.trend) ? data.trend : []);
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Laporan Keuangan</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
        />
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
  );
}
