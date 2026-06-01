"use client";

import { useEffect, useState } from "react";
import { StatsCard }          from "@/components/dashboard/StatsCard";
import { InsightCard }        from "@/components/dashboard/InsightCard";
import { ExpensePieChart }    from "@/components/charts/ExpensePieChart";
import { MonthlyTrendChart }  from "@/components/charts/MonthlyTrendChart";
import { BudgetProgress }     from "@/components/charts/BudgetProgress";
import { TransactionList }    from "@/components/transactions/TransactionList";
import { Modal }              from "@/components/ui/Modal";
import { TransactionForm }    from "@/components/forms/TransactionForm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button }             from "@/components/ui/Button";
import { FAB }                from "@/components/ui/FAB";
import { SummaryDrawer }      from "@/components/dashboard/SummaryDrawer";
import type { DashboardData, Budget } from "@/types";
import {
  TrendingUp, TrendingDown, IndianRupee, PiggyBank,
  Plus, RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [budgets, setBudgets]   = useState<(Budget & { spent: number })[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [summaryType, setSummaryType] = useState<"INCOME" | "EXPENSE" | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const now = new Date();
      const [insightsRes, budgetsRes] = await Promise.all([
        fetch("/api/insights"),
        fetch(`/api/budgets?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
      ]);
      if (!insightsRes.ok) throw new Error("insights");
      const insightsData = await insightsRes.json();
      const budgetsData  = budgetsRes.ok ? await budgetsRes.json() : [];
      setData(insightsData);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (fetchError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data.</p>
      <Button variant="secondary" size="sm" onClick={fetchData}>
        <RefreshCw className="w-4 h-4" /> Retry
      </Button>
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, let&apos;s check your finances
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(new Date(), "MMMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowAddTxn(true)}>
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Income"
          value={data.totalIncome}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-900/30"
          onClick={() => setSummaryType("INCOME")}
          clickable
        />
        <StatsCard
          title="Total Expenses"
          value={data.totalExpenses}
          icon={TrendingDown}
          iconColor="text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          onClick={() => setSummaryType("EXPENSE")}
          clickable
        />
        <StatsCard
          title="Balance"
          value={data.balance}
          icon={IndianRupee}
          iconColor={data.balance >= 0 ? "text-primary-600" : "text-red-500"}
          iconBg={data.balance >= 0 ? "bg-primary-100 dark:bg-primary-900/30" : "bg-red-100 dark:bg-red-900/30"}
        />
        <StatsCard
          title="Savings Rate"
          value={data.savingsRate}
          currency="PCT"
          icon={PiggyBank}
          iconColor="text-purple-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          <ExpensePieChart data={data.categoryStats} />
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <MonthlyTrendChart data={data.monthlyStats} />
        </Card>
      </div>

      {/* Insights + Budget row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Smart Insights</CardTitle></CardHeader>
          {data.insights.length > 0 ? (
            <div className="space-y-3">
              {data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Add more transactions to see insights</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Budget Status</CardTitle>
            <a href="/budgets" className="text-sm text-primary-600 hover:underline">Manage →</a>
          </CardHeader>
          <BudgetProgress budgets={budgets} />
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <a href="/transactions" className="text-sm text-primary-600 hover:underline">View all →</a>
        </CardHeader>
        <TransactionList transactions={data.recentTransactions} onRefresh={fetchData} />
      </Card>

      {/* Mobile FAB */}
      <FAB onClick={() => setShowAddTxn(true)} />

      {/* Add transaction modal */}
      <Modal open={showAddTxn} onClose={() => setShowAddTxn(false)} title="Add Transaction">
        <TransactionForm
          onSuccess={() => { setShowAddTxn(false); fetchData(); }}
          onCancel={() => setShowAddTxn(false)}
        />
      </Modal>

      {/* Income / Expense summary drawer */}
      {summaryType && (
        <SummaryDrawer
          type={summaryType}
          total={summaryType === "INCOME" ? data.totalIncome : data.totalExpenses}
          onClose={() => setSummaryType(null)}
        />
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}
