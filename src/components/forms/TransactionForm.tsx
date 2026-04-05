"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { Transaction, Category } from "@/types";
import { format } from "date-fns";
import { Zap } from "lucide-react";

interface Props {
  transaction?: Transaction | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Names of categories that are income-type — used to split the dropdown
const INCOME_CATEGORY_NAMES = new Set([
  "salary",
  "freelance",
  "rental income",
  "bonus",
  "investment returns",
  "dividends & interest",
  "cashback & refunds",
]);

function isIncomeCategory(name: string) {
  return INCOME_CATEGORY_NAMES.has(name.toLowerCase());
}

export function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoCatSuggestion, setAutoCatSuggestion] = useState<string | null>(null);

  const [form, setForm] = useState({
    amount: transaction?.amount?.toString() ?? "",
    description: transaction?.description ?? "",
    type: transaction?.type ?? "EXPENSE",
    categoryId: transaction?.categoryId ?? "",
    date: transaction ? format(new Date(transaction.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    isRecurring: transaction?.isRecurring ?? false,
    recurringInterval: transaction?.recurringInterval ?? "monthly",
    notes: transaction?.notes ?? "",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  // Categories visible for the currently selected type
  const filteredCategories = categories.filter((c) => {
    if (c.name === "Other") return true; // Other is valid for both types
    return form.type === "INCOME" ? isIncomeCategory(c.name) : !isIncomeCategory(c.name);
  });

  // Switch type and clear categoryId if the current selection doesn't belong to the new type
  const handleTypeChange = (newType: "EXPENSE" | "INCOME") => {
    const currentCat = categories.find((c) => c.id === form.categoryId);
    const keepCategory =
      !currentCat ||
      currentCat.name === "Other" ||
      (newType === "INCOME" ? isIncomeCategory(currentCat.name) : !isIncomeCategory(currentCat.name));

    setForm({ ...form, type: newType, categoryId: keepCategory ? form.categoryId : "" });
    setAutoCatSuggestion(null);
  };

  // Auto-categorize suggestion as user types description
  useEffect(() => {
    if (!form.description || form.categoryId) {
      setAutoCatSuggestion(null);
      return;
    }
    const timeout = setTimeout(() => {
      const lower = form.description.toLowerCase();
      // Only suggest categories that match the current type
      const matched = filteredCategories.find(
        (c) => c.name !== "Other" && c.keywords.some((k) => lower.includes(k.toLowerCase()))
      );
      setAutoCatSuggestion(matched?.id ?? null);
    }, 400);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description, form.categoryId, form.type, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url    = transaction ? `/api/transactions/${transaction.id}` : "/api/transactions";
    const method = transaction ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId || null,
      }),
    });

    setLoading(false);
    if (res.ok) onSuccess();
  };

  const suggestedCat = autoCatSuggestion
    ? filteredCategories.find((c) => c.id === autoCatSuggestion)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
              form.type === t
                ? t === "INCOME"
                  ? "bg-green-500 text-white shadow-sm"
                  : "bg-red-500 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input-base"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <input
          type="text"
          className="input-base"
          placeholder={form.type === "INCOME" ? "e.g. Monthly salary, Freelance project…" : "e.g. Zomato order, Monthly rent…"}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        {/* Auto-categorize suggestion */}
        {suggestedCat && !form.categoryId && (
          <button
            type="button"
            onClick={() => setForm({ ...form, categoryId: suggestedCat.id })}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            <Zap className="w-3 h-3" />
            Auto-detected: <strong>{suggestedCat.name}</strong> — tap to apply
          </button>
        )}
      </div>

      {/* Category — filtered to match the selected type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <select
          className="input-base"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          <option value="">Auto-detect / Uncategorized</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
        <input
          type="date"
          className="input-base"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
      </div>

      {/* Recurring */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="recurring"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600"
          checked={form.isRecurring}
          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
        />
        <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">
          Recurring transaction
        </label>
      </div>

      {form.isRecurring && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repeat every</label>
          <select
            className="input-base"
            value={form.recurringInterval}
            onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}
          >
            <option value="daily">Day</option>
            <option value="weekly">Week</option>
            <option value="monthly">Month</option>
            <option value="quarterly">Quarter (every 3 months)</option>
            <option value="yearly">Year</option>
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          className="input-base resize-none"
          rows={2}
          placeholder="Any additional notes..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {transaction ? "Update" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}
