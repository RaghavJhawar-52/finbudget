"use client";

import { useState, useEffect, useCallback } from "react";
import { BudgetForm } from "@/components/forms/BudgetForm";
import { BudgetProgress } from "@/components/charts/BudgetProgress";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Budget } from "@/types";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<(Budget & { spent: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
    const data = await res.json();
    setBudgets(data);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    fetchBudgets();
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Budgets</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set spending limits per category</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Budget
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="secondary" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-base font-semibold text-gray-900 dark:text-white min-w-36 text-center">
          {MONTHS[month]} {year}
        </span>
        <Button variant="secondary" size="sm" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary cards */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card padding="sm" className="text-center">
            <p className="text-xs text-gray-500">Budgeted</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalBudgeted)}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-gray-500">Spent</p>
            <p className={`text-lg font-bold mt-1 ${totalSpent > totalBudgeted ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
              {formatCurrency(totalSpent)}
            </p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-gray-500">Remaining</p>
            <p className={`text-lg font-bold mt-1 ${totalBudgeted - totalSpent < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(totalBudgeted - totalSpent))}
            </p>
          </Card>
        </div>
      )}

      {/* Budget list */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
          </div>
        ) : (
          <>
            <BudgetProgress budgets={budgets} />
            {budgets.length > 0 && (
              <div className="mt-6 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Actions</p>
                {budgets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{b.category.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setEditing(b); setShowAdd(true); }}
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        title={editing ? "Edit Budget" : "Set Budget"}
      >
        <BudgetForm
          budget={editing}
          month={month}
          year={year}
          onSuccess={() => { setShowAdd(false); setEditing(null); fetchBudgets(); }}
          onCancel={() => { setShowAdd(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
