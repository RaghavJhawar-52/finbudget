import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsights } from "@/lib/insights";
import { getLastNMonths, getMonthRange } from "@/lib/utils";

// GET /api/insights — dashboard data + insights
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now    = new Date();
  const { start: monthStart, end: monthEnd } = getMonthRange(now);

  // Current month transactions
  const currentTransactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
    include: { category: true },
  });

  // Previous month transactions (for comparison)
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { start: prevStart, end: prevEnd } = getMonthRange(prevDate);
  const prevTransactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: prevStart, lte: prevEnd }, type: "EXPENSE" },
  });

  const totalIncome   = currentTransactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = currentTransactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const prevMonthExp  = prevTransactions.reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Category breakdown
  const expensesByCategory = new Map<string, { amount: number; category: { name: string; color: string; icon: string } }>();
  for (const t of currentTransactions.filter((t) => t.type === "EXPENSE")) {
    const key  = t.categoryId ?? "uncategorized";
    const name = t.category?.name ?? "Uncategorized";
    const prev = expensesByCategory.get(key) ?? { amount: 0, category: { name, color: t.category?.color ?? "#94a3b8", icon: t.category?.icon ?? "tag" } };
    expensesByCategory.set(key, { ...prev, amount: prev.amount + t.amount });
  }

  const categoryStats = Array.from(expensesByCategory.entries())
    .map(([id, data]) => ({
      categoryId: id,
      name: data.category.name,
      color: data.category.color,
      icon: data.category.icon,
      amount: data.amount,
      percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly trend (last 6 months)
  const months = getLastNMonths(6);
  const monthlyStats = await Promise.all(
    months.map(async (date) => {
      const { start, end } = getMonthRange(date);
      const txns = await prisma.transaction.findMany({
        where: { userId, date: { gte: start, lte: end } },
      });
      return {
        month: date.toLocaleString("default", { month: "short", year: "2-digit" }),
        income:   txns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
        expenses: txns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
      };
    })
  );

  // Budget alerts
  const budgets = await prisma.budget.findMany({
    where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
    include: { category: true },
  });

  const budgetAlerts = await Promise.all(
    budgets.map(async (b) => {
      const agg = await prisma.transaction.aggregate({
        where: { userId, categoryId: b.categoryId, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      });
      const spent = agg._sum.amount ?? 0;
      return {
        categoryName: b.category.name,
        budgeted: b.amount,
        spent,
        percentage: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
        color: b.category.color,
      };
    })
  );

  const recentTransactions = currentTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const insights = generateInsights({
    currentMonthExpenses: totalExpenses,
    prevMonthExpenses: prevMonthExp,
    categoryStats,
    budgetAlerts,
    savingsRate,
    totalIncome,
  });

  return NextResponse.json({
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    categoryStats,
    monthlyStats,
    recentTransactions,
    insights,
    budgetAlerts,
  });
}
