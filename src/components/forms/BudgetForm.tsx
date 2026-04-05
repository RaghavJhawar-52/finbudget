"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { Category, Budget } from "@/types";

interface Props {
  budget?: Budget | null;
  month: number;
  year: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BudgetForm({ budget, month, year, onSuccess, onCancel }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categoryId: budget?.categoryId ?? "",
    amount: budget?.amount?.toString() ?? "",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = budget ? `/api/budgets/${budget.id}` : "/api/budgets";
    const method = budget ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), month, year }),
    });

    setLoading(false);
    if (res.ok) onSuccess();
  };

  const MONTH_NAMES = ["", "January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Setting budget for <strong className="text-gray-700 dark:text-gray-300">{MONTH_NAMES[month]} {year}</strong>
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
        <select
          className="input-base"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          required
          disabled={!!budget} // can't change category on existing budget
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget Amount (₹)</label>
        <input
          type="number"
          step="1"
          min="1"
          className="input-base"
          placeholder="e.g. 5000"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading} className="flex-1">{budget ? "Update Budget" : "Set Budget"}</Button>
      </div>
    </form>
  );
}
