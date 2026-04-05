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
import type { DashboardData, Budget } from "@/types";
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank,
  Plus, RefreshCw, RepeatIcon,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [budgets, setBudgets]   = useState<(Budget & { spent: number })[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAddTxn, setShowAddTxn] = useState(false);

  // Recurring status banner
  const [recurringPosted, setRecurringPosted] = useState<number>(0);
  const [recurringNames, setRecurringNames]   = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [insightsRes, budgetsRes] = await Promise.all([
      fetch("/api/insights"),
      fetch(`/api/budgets?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`),
    ]);
    const insightsData = await insightsRes.json();
    const budgetsData  = await budgetsRes.json();
    setData(insightsData);
    setBudgets(budgetsData);
    setLoading(false);
  };

  useEffect(() => {
    // Fetch dashboard data; check recurring result from layout (stored in sessionStorage)
    fetchData();

    const raw = sessionStorage.getItem("recurring_posted");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { created: number; transactions: { description: string }[] };
        if (parsed.created > 0) {
          setRecurringPosted(parsed.created);
          setRecurringNames(parsed.transactions.map((t: { description: string }) => t.description));
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem("recurring_posted");
    }
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data)   return null;

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

      {/* Recurring auto-post banner */}
      {recurringPosted > 0 && (
        <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700 rounded-2xl px-5 py-3.5 animate-slide-up">
          <RepeatIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
              {recurringPosted} recurring transaction{recurringPosted > 1 ? "s" : ""} auto-posted
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
              {recurringNames.slice(0, 3).join(" · ")}
              {recurringNames.length > 3 && ` · +${recurringNames.length - 3} more`}
            </p>
          </div>
          <button
            onClick={() => setRecurringPosted(0)}
            className="text-indigo-400 hover:text-indigo-600 text-xs flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Income"
          value={data.totalIncome}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-900/30"
        />
        <StatsCard
          title="Total Expenses"
          value={data.totalExpenses}
          icon={TrendingDown}
          iconColor="text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
        />
        <StatsCard
          title="Balance"
          value={data.balance}
          icon={DollarSign}
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
