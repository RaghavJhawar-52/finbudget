import type { Budget } from "@/types";
import { formatCurrency, clamp, safePercent } from "@/lib/utils";

interface Props {
  budgets: (Budget & { spent: number })[];
  currency?: string;
}

export function BudgetProgress({ budgets, currency = "INR" }: Props) {
  if (!budgets.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No budgets set for this month
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const pct = clamp(safePercent(budget.spent, budget.amount), 0, 100);
        const isOver = budget.spent > budget.amount;
        const remaining = budget.amount - budget.spent;

        return (
          <div key={budget.id}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: budget.category.color }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {budget.category.name}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${isOver ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                  {formatCurrency(budget.spent, currency)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  / {formatCurrency(budget.amount, currency)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                  isOver
                    ? "bg-red-500"
                    : pct >= 80
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${pct}%`, backgroundColor: isOver ? undefined : pct < 80 ? budget.category.color : undefined }}
              />
            </div>

            <div className="flex justify-between mt-1">
              <span className={`text-xs ${isOver ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {isOver ? `₹${Math.abs(remaining).toLocaleString("en-IN")} over budget` : `${pct}% used`}
              </span>
              <span className="text-xs text-gray-400">
                {!isOver && `₹${remaining.toLocaleString("en-IN")} left`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
