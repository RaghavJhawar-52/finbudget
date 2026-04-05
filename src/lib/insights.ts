import type { Insight, CategoryStats, BudgetAlert } from "@/types";

interface InsightInput {
  currentMonthExpenses: number;
  prevMonthExpenses: number;
  categoryStats: CategoryStats[];
  budgetAlerts: BudgetAlert[];
  savingsRate: number;
  totalIncome: number;
}

/**
 * Generate AI-style spending insights from financial data.
 * Pure logic — no external API needed.
 */
export function generateInsights(data: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const {
    currentMonthExpenses,
    prevMonthExpenses,
    categoryStats,
    budgetAlerts,
    savingsRate,
    totalIncome,
  } = data;

  // 1. Month-over-month spending change
  if (prevMonthExpenses > 0 && currentMonthExpenses > 0) {
    const change = ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100;
    if (change > 20) {
      insights.push({
        type: "warning",
        icon: "trending-up",
        title: "Spending spike detected",
        description: `You spent ${Math.round(change)}% more this month compared to last month. Consider reviewing your expenses.`,
      });
    } else if (change < -10) {
      insights.push({
        type: "success",
        icon: "trending-down",
        title: "Great spending control!",
        description: `You spent ${Math.abs(Math.round(change))}% less than last month. Keep it up!`,
      });
    }
  }

  // 2. Top spending category
  if (categoryStats.length > 0) {
    const top = categoryStats[0];
    if (top.percentage > 40) {
      insights.push({
        type: "info",
        icon: "pie-chart",
        title: `${top.name} dominates your spending`,
        description: `${top.percentage}% of your expenses this month went to ${top.name}. Consider if this aligns with your priorities.`,
      });
    }
  }

  // 3. Budget exceeded alerts
  const exceeded = budgetAlerts.filter((b) => b.percentage >= 100);
  if (exceeded.length > 0) {
    exceeded.forEach((alert) => {
      insights.push({
        type: "danger",
        icon: "alert-circle",
        title: `Budget exceeded: ${alert.categoryName}`,
        description: `You've spent ${alert.percentage}% of your ${alert.categoryName} budget (₹${alert.spent.toLocaleString("en-IN")} of ₹${alert.budgeted.toLocaleString("en-IN")}).`,
      });
    });
  }

  // 4. Close to budget limit
  const nearLimit = budgetAlerts.filter(
    (b) => b.percentage >= 80 && b.percentage < 100
  );
  if (nearLimit.length > 0) {
    nearLimit.slice(0, 2).forEach((alert) => {
      insights.push({
        type: "warning",
        icon: "alert-triangle",
        title: `Approaching limit: ${alert.categoryName}`,
        description: `You've used ${alert.percentage}% of your ${alert.categoryName} budget. Only ₹${(alert.budgeted - alert.spent).toLocaleString("en-IN")} remaining.`,
      });
    });
  }

  // 5. Savings rate insight
  if (totalIncome > 0) {
    if (savingsRate >= 30) {
      insights.push({
        type: "success",
        icon: "piggy-bank",
        title: "Excellent savings rate!",
        description: `You're saving ${Math.round(savingsRate)}% of your income this month. Financial experts recommend 20%+ — you're crushing it!`,
      });
    } else if (savingsRate < 10 && savingsRate >= 0) {
      insights.push({
        type: "warning",
        icon: "piggy-bank",
        title: "Low savings rate",
        description: `You're saving only ${Math.round(savingsRate)}% of your income. Try to target at least 20% for long-term financial health.`,
      });
    } else if (savingsRate < 0) {
      insights.push({
        type: "danger",
        icon: "alert-octagon",
        title: "Spending more than you earn",
        description: `Your expenses exceed your income this month. Review your spending to avoid debt.`,
      });
    }
  }

  // 6. No income recorded
  if (totalIncome === 0) {
    insights.push({
      type: "info",
      icon: "info",
      title: "No income recorded",
      description: "Add your income transactions to get a complete picture of your finances.",
    });
  }

  return insights.slice(0, 5); // Show max 5 insights
}
