"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/types";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Preset data ──────────────────────────────────────────────────────────────

const INCOME_SOURCES = [
  { id: "salary",   label: "Salary / Job",   cat: "Salary" },
  { id: "freelance",label: "Freelance",       cat: "Freelance" },
  { id: "business", label: "Business",        cat: "Salary" },
  { id: "other",    label: "Other",           cat: "Salary" },
];

interface PresetExpense {
  id: string; emoji: string; label: string; cat: string; defaultAmount: number;
}

const PRESET_EXPENSES: PresetExpense[] = [
  { id: "rent",      emoji: "🏠", label: "Rent / Mortgage",   cat: "Rent & Housing",    defaultAmount: 15000 },
  { id: "grocery",   emoji: "🛒", label: "Monthly Groceries", cat: "Food & Dining",     defaultAmount: 3000  },
  { id: "jio",       emoji: "📱", label: "Mobile Recharge",   cat: "Utilities",         defaultAmount: 399   },
  { id: "internet",  emoji: "🌐", label: "Internet/Broadband",cat: "Utilities",         defaultAmount: 699   },
  { id: "netflix",   emoji: "🎬", label: "Netflix",           cat: "Entertainment",     defaultAmount: 649   },
  { id: "spotify",   emoji: "🎵", label: "Spotify",           cat: "Entertainment",     defaultAmount: 119   },
  { id: "prime",     emoji: "📦", label: "Amazon Prime",      cat: "Entertainment",     defaultAmount: 299   },
  { id: "sip",       emoji: "📈", label: "SIP / Investment",  cat: "Investment Returns",defaultAmount: 5000  },
  { id: "gym",       emoji: "💪", label: "Gym / Fitness",     cat: "Health & Fitness",  defaultAmount: 1500  },
  { id: "emi",       emoji: "🏦", label: "Loan EMI",          cat: "Rent & Housing",    defaultAmount: 8000  },
];

const BUDGET_PRESETS = [
  { cat: "Food & Dining",   emoji: "🍕", pct: 0.15 },
  { cat: "Transport",       emoji: "🚗", pct: 0.08 },
  { cat: "Shopping",        emoji: "🛍️", pct: 0.10 },
  { cat: "Entertainment",   emoji: "🎬", pct: 0.05 },
  { cat: "Health & Fitness",emoji: "💊", pct: 0.05 },
  { cat: "Personal Care",   emoji: "💅", pct: 0.04 },
];

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i < current
              ? "w-2 h-2 bg-primary-600"
              : i === current
              ? "w-6 h-2 bg-primary-600"
              : "w-2 h-2 bg-gray-300 dark:bg-gray-600"
          )}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props { onComplete: () => void; }

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep]           = useState(0); // 0=welcome, 1=income, 2=recurring, 3=budget
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving]       = useState(false);

  // Step 1 state
  const [incomeSource, setIncomeSource]   = useState("salary");
  const [incomeAmount, setIncomeAmount]   = useState("");

  // Step 2 state
  const [selectedExpenses, setSelectedExpenses] = useState<Record<string, boolean>>(
    Object.fromEntries(PRESET_EXPENSES.slice(0, 5).map(e => [e.id, true]))
  );
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, string>>(
    Object.fromEntries(PRESET_EXPENSES.map(e => [e.id, String(e.defaultAmount)]))
  );

  // Step 3 state
  const [budgets, setBudgets] = useState<Record<string, string>>(
    Object.fromEntries(BUDGET_PRESETS.map(b => [b.cat, ""]))
  );

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then((cats: Category[]) => {
      setCategories(cats);
      // Pre-fill budget suggestions based on income if available
    });
  }, []);

  const catId = (name: string) =>
    categories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;

  // Fill budget suggestions whenever income changes
  useEffect(() => {
    const income = parseFloat(incomeAmount);
    if (!income) return;
    setBudgets(prev => {
      const updated = { ...prev };
      BUDGET_PRESETS.forEach(b => {
        if (!prev[b.cat]) updated[b.cat] = String(Math.round(income * b.pct / 500) * 500);
      });
      return updated;
    });
  }, [incomeAmount]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      // 1. Create income transaction
      const income = parseFloat(incomeAmount);
      if (income > 0) {
        const source = INCOME_SOURCES.find(s => s.id === incomeSource);
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: income,
            description: source?.label === "Salary / Job" ? "Monthly Salary" : `${source?.label} Income`,
            type: "INCOME",
            categoryId: catId(source?.cat ?? "Salary"),
            date: firstOfMonth,
            isRecurring: true,
            recurringInterval: "monthly",
          }),
        });
      }

      // 2. Create selected recurring expenses
      const recurringPromises = PRESET_EXPENSES
        .filter(e => selectedExpenses[e.id])
        .map(e => {
          const amount = parseFloat(expenseAmounts[e.id] ?? "0");
          if (!amount) return Promise.resolve();
          return fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount,
              description: e.label,
              type: "EXPENSE",
              categoryId: catId(e.cat),
              date: firstOfMonth,
              isRecurring: true,
              recurringInterval: "monthly",
            }),
          });
        });
      await Promise.all(recurringPromises);

      // 3. Create budget targets
      const currentMonth = now.getMonth() + 1;
      const currentYear  = now.getFullYear();
      const budgetPromises = BUDGET_PRESETS
        .map(b => {
          const amount = parseFloat(budgets[b.cat] ?? "0");
          if (!amount) return Promise.resolve();
          const id = catId(b.cat);
          if (!id) return Promise.resolve();
          return fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, categoryId: id, month: currentMonth, year: currentYear }),
          });
        });
      await Promise.all(budgetPromises);

      onComplete();
    } catch {
      // Fail silently — onboarding is optional, don't block the user
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    if (step < 3) setStep(s => s + 1);
    else onComplete();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-lg">

        {/* Welcome screen */}
        {step === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 text-center space-y-6 animate-slide-up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-stacked.svg" alt="FinBudget" className="w-28 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to FinBudget!</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                Let&apos;s get you set up in 3 quick steps. We&apos;ll create your income, recurring expenses and budget targets — so your dashboard is ready from day one.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
              {[["💰", "Income"], ["🔄", "Recurring"], ["🎯", "Budgets"]].map(([emoji, label]) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onComplete}>Skip Setup</Button>
              <Button className="flex-1" onClick={() => setStep(1)}>
                Let&apos;s Go <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step card (steps 1–3) */}
        {step > 0 && step <= 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Progress header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <StepDots current={step - 1} total={3} />
                <span className="text-xs text-gray-400">Step {step} of 3</span>
              </div>
            </div>

            <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">

              {/* ── Step 1: Income ──────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💰</div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">What&apos;s your monthly income?</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      This creates your first income entry and helps suggest budgets.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Income source</label>
                    <div className="grid grid-cols-2 gap-2">
                      {INCOME_SOURCES.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setIncomeSource(s.id)}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                            incomeSource === s.id
                              ? "bg-primary-600 text-white border-primary-600"
                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="input-base text-lg font-semibold"
                      placeholder="e.g. 85000"
                      value={incomeAmount}
                      onChange={e => setIncomeAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: Recurring Expenses ──────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔄</div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set up recurring expenses</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Toggle what you pay every month. These will be tracked automatically.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {PRESET_EXPENSES.map(e => (
                      <div
                        key={e.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                          selectedExpenses[e.id]
                            ? "border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-950/30"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        )}
                        onClick={() => setSelectedExpenses(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          selectedExpenses[e.id] ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700"
                        )}>
                          {selectedExpenses[e.id]
                            ? <Check className="w-4 h-4" />
                            : <span className="text-base">{e.emoji}</span>
                          }
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{e.label}</span>
                        {selectedExpenses[e.id] && (
                          <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                            <span className="text-xs text-gray-500">₹</span>
                            <input
                              type="number"
                              min="0"
                              className="w-24 text-sm text-right border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary-500"
                              value={expenseAmounts[e.id] ?? ""}
                              onChange={ev => setExpenseAmounts(prev => ({ ...prev, [e.id]: ev.target.value }))}
                              onClick={ev => ev.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 3: Budgets ─────────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎯</div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set spending limits</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      We&apos;ll alert you when you&apos;re near these limits.
                      {incomeAmount && <span className="text-primary-600"> Suggestions based on ₹{Number(incomeAmount).toLocaleString("en-IN")} income.</span>}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {BUDGET_PRESETS.map(b => {
                      const suggested = incomeAmount
                        ? Math.round(parseFloat(incomeAmount) * b.pct / 500) * 500
                        : null;
                      return (
                        <div key={b.cat} className="flex items-center gap-3">
                          <span className="text-xl w-7 flex-shrink-0">{b.emoji}</span>
                          <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 min-w-0 truncate">{b.cat}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-gray-500">₹</span>
                            <input
                              type="number"
                              min="0"
                              className="w-28 text-sm text-right border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:border-primary-500"
                              placeholder={suggested ? `~${suggested.toLocaleString("en-IN")}` : "Amount"}
                              value={budgets[b.cat] ?? ""}
                              onChange={e => setBudgets(prev => ({ ...prev, [b.cat]: e.target.value }))}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <button
                onClick={skip}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip this step →
              </button>

              {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} loading={saving} disabled={saving}>
                  {saving ? "Saving…" : "Finish Setup 🎉"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
