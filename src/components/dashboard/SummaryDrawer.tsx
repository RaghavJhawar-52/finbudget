"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

interface Props {
  type: "INCOME" | "EXPENSE";
  total: number;
  onClose: () => void;
}

interface CatRow {
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
  pct: number;
}

interface MonthRow {
  label: string;   // "Jan", "Feb" …
  amount: number;
}

export function SummaryDrawer({ type, total, onClose }: Props) {
  const [loading,    setLoading]    = useState(true);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [months,     setMonths]     = useState<MonthRow[]>([]);
  const [topTxns,    setTopTxns]    = useState<Transaction[]>([]);
  const [txnCount,   setTxnCount]   = useState(0);

  const isIncome = type === "INCOME";
  const accentBg = isIncome ? "bg-green-500"  : "bg-red-500";
  const accentText = isIncome ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400";
  const label = isIncome ? "Income" : "Expenses";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/transactions?type=${type}&limit=500`);
        const data = await res.json();
        const txns: Transaction[] = data.transactions ?? [];
        setTxnCount(data.total ?? txns.length);

        // ── Category breakdown ──────────────────────────────────────────────
        const catMap = new Map<string, { name: string; icon: string; color: string; amount: number; count: number }>();
        for (const t of txns) {
          const key  = t.category?.id ?? "__none__";
          const name = t.category?.name ?? "Uncategorized";
          const icon = t.category?.icon ?? "📦";
          const color = t.category?.color ?? "#6B7280";
          const existing = catMap.get(key);
          if (existing) { existing.amount += t.amount; existing.count += 1; }
          else           catMap.set(key, { name, icon, color, amount: t.amount, count: 1 });
        }
        const catTotal = txns.reduce((s, t) => s + t.amount, 0);
        const sorted = Array.from(catMap.values())
          .sort((a, b) => b.amount - a.amount)
          .map(c => ({ ...c, pct: catTotal > 0 ? (c.amount / catTotal) * 100 : 0 }));
        setCategories(sorted);

        // ── Monthly breakdown (last 6 months) ──────────────────────────────
        const monthMap = new Map<string, number>();
        for (const t of txns) {
          const d   = new Date(t.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap.set(key, (monthMap.get(key) ?? 0) + t.amount);
        }
        const now = new Date();
        const last6: MonthRow[] = [];
        for (let i = 5; i >= 0; i--) {
          const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          last6.push({
            label:  d.toLocaleString("default", { month: "short" }),
            amount: monthMap.get(key) ?? 0,
          });
        }
        setMonths(last6);

        // ── Top 5 transactions ──────────────────────────────────────────────
        setTopTxns(
          [...txns].sort((a, b) => b.amount - a.amount).slice(0, 5)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  const fmt = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;

  const maxMonth = Math.max(...months.map(m => m.amount), 1);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className={cn("flex items-center justify-between px-5 py-4 flex-shrink-0")}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", accentBg)}>
              {isIncome
                ? <TrendingUp className="w-5 h-5 text-white" />
                : <TrendingDown className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label} Summary</p>
              <p className={cn("text-2xl font-bold tabular-nums", accentText)}>{fmt(total)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">

          {loading ? (
            <div className="space-y-3 animate-pulse pt-2">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* ── Monthly trend ─────────────────────────────────────────── */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Last 6 Months</h3>
                <div className="flex items-end gap-2 h-24">
                  {months.map((m) => (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: "72px" }}>
                        <div
                          className={cn("w-full rounded-t-lg transition-all", isIncome ? "bg-green-400" : "bg-red-400")}
                          style={{ height: `${Math.round((m.amount / maxMonth) * 72)}px`, minHeight: m.amount > 0 ? "4px" : "0" }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Category breakdown ──────────────────────────────────────── */}
              {categories.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    By Category <span className="text-gray-400 font-normal">({txnCount} transactions)</span>
                  </h3>
                  <div className="space-y-3">
                    {categories.slice(0, 8).map((cat) => (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none">{cat.icon}</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{cat.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{cat.count}×</span>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(cat.amount)}</span>
                            <span className="text-xs text-gray-400 ml-1">{cat.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Top transactions ────────────────────────────────────────── */}
              {topTxns.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {isIncome ? "Largest Income" : "Biggest Expenses"}
                  </h3>
                  <div className="space-y-2">
                    {topTxns.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{t.category?.icon ?? "📦"}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.description}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              {t.category && <> · {t.category.name}</>}
                            </p>
                          </div>
                        </div>
                        <span className={cn("text-sm font-bold flex-shrink-0 ml-2", accentText)}>
                          {fmt(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── View all link ──────────────────────────────────────────── */}
              <a
                href={`/transactions?type=${type}`}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold transition-colors",
                  isIncome
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                )}
              >
                View all {label.toLowerCase()} transactions <ArrowRight className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
