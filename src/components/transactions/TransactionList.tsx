"use client";

import { useState, useCallback, useMemo } from "react";
import { isToday, isYesterday, format } from "date-fns";
import type { Transaction } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { formatCurrency, truncate } from "@/lib/utils";
import { Pencil, Trash2, RefreshCw } from "lucide-react";

interface Props {
  transactions: Transaction[];
  onRefresh: () => void;
  currency?: string;
}

// ─── Date group label ────────────────────────────────────────────────────────
function getDateLabel(date: Date): string {
  if (isToday(date))     return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd MMM yyyy");
}

// ─── Group transactions by date label ────────────────────────────────────────
function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    const label = getDateLabel(new Date(txn.date));
    const existing = map.get(label) ?? [];
    map.set(label, [...existing, txn]);
  }
  return Array.from(map.entries());
}

// ─── Category emoji helper ────────────────────────────────────────────────────
function getCategoryEmoji(name?: string | null): string {
  const map: Record<string, string> = {
    "Food":        "🍔",
    "Transport":   "🚗",
    "Shopping":    "🛍️",
    "Entertain":   "🎬",
    "Health":      "❤️",
    "Utilities":   "⚡",
    "Rent":        "🏠",
    "Education":   "📚",
    "Salary":      "💼",
    "Investment":  "📈",
  };
  if (!name) return "💳";
  for (const [key, emoji] of Object.entries(map)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "💳";
}

// ─── Single transaction row ────────────────────────────────────────────────────
function TransactionRow({
  txn,
  currency,
  onEdit,
  onDelete,
  deleting,
}: {
  txn: Transaction;
  currency: string;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{ backgroundColor: (txn.category?.color ?? "#94a3b8") + "20" }}
      >
        <span>{getCategoryEmoji(txn.category?.name)}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {truncate(txn.description, 36)}
          </p>
          {txn.isRecurring && (
            <span title={`Repeats ${txn.recurringInterval}`}>
              <RefreshCw className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {txn.category && (
            <Badge color={txn.category.color}>{txn.category.name}</Badge>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 mr-1">
        <p
          className={`text-sm font-semibold tabular-nums ${
            txn.type === "INCOME" ? "text-green-600" : "text-red-500"
          }`}
        >
          {txn.type === "INCOME" ? "+" : "−"}
          {formatCurrency(txn.amount, currency)}
        </p>
      </div>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onEdit(txn)}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(txn.id)}
          disabled={deleting === txn.id}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function TransactionList({ transactions, onRefresh, currency = "INR" }: Props) {
  const [editing, setEditing]   = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this transaction?")) return;
      setDeleting(id);
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      setDeleting(null);
      onRefresh();
    },
    [onRefresh]
  );

  const groups = useMemo(() => groupByDate(transactions), [transactions]);

  if (!transactions.length) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">💸</p>
        <p className="text-gray-500 font-medium">No transactions found</p>
        <p className="text-sm text-gray-400 mt-1">Add your first transaction to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {groups.map(([label, txns]) => {
          // Daily total for the group
          const dayIncome   = txns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
          const dayExpenses = txns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

          return (
            <div key={label}>
              {/* Date header */}
              <div className="flex items-center justify-between py-2 px-1 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {label}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {dayIncome > 0 && (
                    <span className="text-green-600 font-medium">
                      +{formatCurrency(dayIncome, currency)}
                    </span>
                  )}
                  {dayExpenses > 0 && (
                    <span className="text-red-500 font-medium">
                      −{formatCurrency(dayExpenses, currency)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions for this day */}
              {txns.map((txn) => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  currency={currency}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                  deleting={deleting}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Transaction">
        <TransactionForm
          transaction={editing}
          onSuccess={() => { setEditing(null); onRefresh(); }}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </>
  );
}
