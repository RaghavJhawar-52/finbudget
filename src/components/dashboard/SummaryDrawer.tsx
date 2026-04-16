"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

// Map Lucide icon names (stored in DB) → emoji
const ICON_EMOJI: Record<string, string> = {
  "wallet":        "💰",
  "briefcase":     "💼",
  "laptop":        "💻",
  "utensils":      "🍽️",
  "shopping-cart": "🛒",
  "shopping-bag":  "🛍️",
  "car":           "🚗",
  "home":          "🏠",
  "heart":         "❤️",
  "tv":            "📺",
  "plane":         "✈️",
  "gift":          "🎁",
  "zap":           "⚡",
  "shield":        "🛡️",
  "book-open":     "📖",
  "percent":       "📊",
  "trending-up":   "📈",
  "key":           "🔑",
  "tag":           "🏷️",
  "scissors":      "✂️",
  "baby":          "👶",
  "paw-print":     "🐾",
  "sofa":          "🛋️",
  "wine":          "🍷",
  "award":         "🏆",
  "shirt":         "👕",
  "refresh-cw":    "🔄",
};
const catIcon = (icon: string) => ICON_EMOJI[icon] ?? "📦";

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
  return `${sign}₹${Math.round(abs)}`;
}

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
  label: string;
  amount: number;
}

export function SummaryDrawer({ type, total, onClose }: Props) {
  const [loading,    setLoading]    = useState(true);
  const [categories, setCategories] = useState<CatRow[]>([]);
  const [months,     setMonths]     = useState<MonthRow[]>([]);
  const [topTxns,    setTopTxns]    = useState<Transaction[]>([]);
  const [txnCount,   setTxnCount]   = useState(0);

  const isIncome = type === "INCOME";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/transactions?type=${type}&limit=500`);
        const data = await res.json();
        const txns: Transaction[] = data.transactions ?? [];
        setTxnCount(data.total ?? txns.length);

        // Category breakdown
        const catMap = new Map<string, { name: string; icon: string; color: string; amount: number; count: number }>();
        for (const t of txns) {
          const key = t.category?.id ?? "__none__";
          if (!catMap.has(key)) {
            catMap.set(key, {
              name:   t.category?.name  ?? "Uncategorized",
              icon:   t.category?.icon  ?? "",
              color:  t.category?.color ?? "#6B7280",
              amount: 0, count: 0,
            });
          }
          const b = catMap.get(key)!;
          b.amount += t.amount;
          b.count  += 1;
        }
        const catTotal = txns.reduce((s, t) => s + t.amount, 0);
        setCategories(
          Array.from(catMap.values())
            .sort((a, b) => b.amount - a.amount)
            .map(c => ({ ...c, pct: catTotal > 0 ? (c.amount / catTotal) * 100 : 0 }))
        );

        // Monthly (last 6)
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
          last6.push({ label: d.toLocaleString("default", { month: "short" }), amount: monthMap.get(key) ?? 0 });
        }
        setMonths(last6);

        // Top 5
        setTopTxns([...txns].sort((a, b) => b.amount - a.amount).slice(0, 5));
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  const maxMonth = Math.max(...months.map(m => m.amount), 1);

  // Theme colours
  const headerGradient = isIncome
    ? "from-green-500 to-emerald-600"
    : "from-red-500 to-rose-600";
  const pillBg  = isIncome ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
  const barColor = isIncome ? "bg-emerald-400" : "bg-rose-400";
  const viewAllBg = isIncome
    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer — max-h keeps it on screen; overflow-hidden on outer, scroll on inner */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[88vh] rounded-t-3xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 animate-slide-up">

        {/* ── Gradient header ───────────────────────────────────────────── */}
        <div className={cn("bg-gradient-to-r flex-shrink-0", headerGradient)}>
          {/* drag pill */}
          <div className="flex justify-center pt-2.5 pb-0">
            <div className="w-10 h-1 rounded-full bg-white/40" />
          </div>

          <div className="flex items-center justify-between px-5 pt-3 pb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                {isIncome
                  ? <TrendingUp  className="w-5 h-5 text-white" />
                  : <TrendingDown className="w-5 h-5 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest">
                  {isIncome ? "Income" : "Expenses"} Summary
                </p>
                <p className="text-white text-2xl font-bold tabular-nums truncate">{fmt(total)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors ml-2"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* stat pills */}
          <div className="flex gap-2 px-5 pb-4 overflow-x-auto scrollbar-none">
            <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
              {txnCount} transactions
            </span>
            {categories.length > 0 && (
              <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </span>
            )}
            {categories[0] && (
              <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white truncate max-w-[140px]">
                Top: {categories[0].name}
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-5 space-y-6">

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                {/* ── Monthly trend ──────────────────────────────────── */}
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Last 6 Months</p>
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4">
                    <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                      {months.map((m) => {
                        const h = Math.round((m.amount / maxMonth) * 64);
                        return (
                          <div key={m.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <div className="w-full flex flex-col items-center justify-end" style={{ height: 64 }}>
                              {m.amount > 0 && (
                                <p className="text-[9px] font-semibold text-gray-400 mb-0.5 truncate w-full text-center leading-none">
                                  {m.amount >= 1e5 ? `${(m.amount / 1e5).toFixed(0)}L` : m.amount >= 1000 ? `${Math.round(m.amount / 1000)}k` : `${Math.round(m.amount)}`}
                                </p>
                              )}
                              <div
                                className={cn("w-full rounded-t-md", barColor, m.amount === 0 && "opacity-20")}
                                style={{ height: `${Math.max(h, m.amount > 0 ? 4 : 2)}px` }}
                              />
                            </div>
                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{m.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* ── Category breakdown ─────────────────────────────── */}
                {categories.length > 0 && (
                  <section>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Category</p>
                    <div className="space-y-2">
                      {categories.slice(0, 8).map((cat, idx) => (
                        <div
                          key={cat.name}
                          className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5"
                        >
                          {/* Row 1: icon + name + amount */}
                          <div className="flex items-center gap-2">
                            {/* rank badge */}
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-base flex-shrink-0 leading-none">{catIcon(cat.icon)}</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0">
                              {cat.name}
                            </span>
                            <span className="flex-shrink-0 text-sm font-bold text-gray-900 dark:text-white ml-1">
                              {fmt(cat.amount)}
                            </span>
                          </div>
                          {/* Row 2: progress bar + stats */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(cat.pct, 2)}%`, backgroundColor: cat.color }}
                              />
                            </div>
                            <span className={cn("flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", pillBg)}>
                              {cat.pct.toFixed(0)}%
                            </span>
                            <span className="flex-shrink-0 text-[10px] text-gray-400">{cat.count}×</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Top transactions ───────────────────────────────── */}
                {topTxns.length > 0 && (
                  <section>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {isIncome ? "Largest Sources" : "Biggest Spends"}
                    </p>
                    <div className="space-y-1.5">
                      {topTxns.map((t, idx) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60"
                        >
                          {/* rank */}
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-base flex-shrink-0">{catIcon(t.category?.icon ?? "")}</span>
                          {/* text — min-w-0 forces truncation */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">
                              {t.description}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                              {t.category && <> · {t.category.name}</>}
                            </p>
                          </div>
                          {/* amount — never shrinks */}
                          <span className={cn(
                            "flex-shrink-0 text-sm font-bold tabular-nums",
                            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {fmt(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── View all ───────────────────────────────────────── */}
                <a
                  href={`/transactions?type=${type}`}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold transition-colors",
                    viewAllBg
                  )}
                >
                  View all {isIncome ? "income" : "expense"} transactions
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
