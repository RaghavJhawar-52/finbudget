"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Goal } from "@/types";
import { formatCurrency, formatDate, clamp, safePercent } from "@/lib/utils";
import { Plus, Target, Pencil, Trash2, CheckCircle } from "lucide-react";

const GOAL_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444",
  "#f97316","#22c55e","#14b8a6","#3b82f6",
];

function GoalForm({
  goal, onSuccess, onCancel,
}: { goal?: Goal | null; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm] = useState({
    name: goal?.name ?? "",
    targetAmount: goal?.targetAmount?.toString() ?? "",
    currentAmount: goal?.currentAmount?.toString() ?? "0",
    deadline: goal?.deadline ? formatDate(goal.deadline, "yyyy-MM-dd") : "",
    color: goal?.color ?? "#6366f1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const target  = parseFloat(form.targetAmount);
    const current = parseFloat(form.currentAmount || "0");
    if (current > target) {
      setError("Saved amount cannot exceed the target amount.");
      return;
    }

    setLoading(true);
    try {
      const url    = goal ? `/api/goals/${goal.id}` : "/api/goals";
      const method = goal ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetAmount: target, currentAmount: current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save goal. Please try again.");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
        <input className="input-base" placeholder="e.g. Emergency Fund, New Laptop" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target (₹)</label>
          <input type="number" min="1" className="input-base" placeholder="50000" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saved so far (₹)</label>
          <input type="number" min="0" className="input-base" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date <span className="text-gray-400">(optional)</span></label>
        <input type="date" className="input-base" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, color: c })}
              className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading} className="flex-1">{goal ? "Update Goal" : "Create Goal"}</Button>
      </div>
    </form>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/goals");
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchGoals();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Financial Goals</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track your savings milestones</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          {[1,2,3].map((i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No goals yet. Create your first financial goal!</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Create Goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = clamp(safePercent(goal.currentAmount, goal.targetAmount), 0, 100);
            const done = pct >= 100;
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <Card key={goal.id} className="relative overflow-hidden group">
                {/* Color accent */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: goal.color }} />

                <div className="pt-2">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {done
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <Target className="w-5 h-5 flex-shrink-0" style={{ color: goal.color }} />}
                      <h3 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                    </div>
                    <div className="hidden group-hover:flex gap-1">
                      <button onClick={() => { setEditing(goal); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(goal.currentAmount)}
                      </p>
                      <p className="text-xs text-gray-400">of {formatCurrency(goal.targetAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${done ? "text-green-600" : ""}`} style={!done ? { color: goal.color } : undefined}>
                        {pct}%
                      </p>
                      {goal.deadline && !done && (
                        <p className="text-xs text-gray-400">by {formatDate(goal.deadline, "dd MMM yyyy")}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: done ? "#22c55e" : goal.color }}
                    />
                  </div>

                  {!done && (
                    <p className="text-xs text-gray-400 mt-2">
                      {formatCurrency(remaining)} more to go
                    </p>
                  )}
                  {done && (
                    <p className="text-xs text-green-600 font-medium mt-2">Goal achieved! 🎉</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Goal" : "New Goal"}
      >
        <GoalForm
          goal={editing}
          onSuccess={() => { setShowForm(false); setEditing(null); fetchGoals(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
