"use client";

import { useState, useEffect } from "react";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { DashboardData } from "@/types";
import { formatCurrency, safePercent } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function AnalyticsPage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setFetchError(false);
    fetch("/api/insights")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setData(d); })
      .catch(() => { setFetchError(true); })
      .finally(() => { setLoading(false); });
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      {[1,2,3].map((i) => <div key={i} className="h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
    </div>
  );

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-gray-500 dark:text-gray-400">Failed to load analytics data.</p>
      <Button variant="secondary" size="sm" onClick={loadData}>Retry</Button>
    </div>
  );

  if (!data) return null;

  const topCategory = data.categoryStats[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Income",    value: data.totalIncome,   color: "text-green-600" },
          { label: "Total Expenses",  value: data.totalExpenses, color: "text-red-500" },
          { label: "Net Balance",     value: data.balance,       color: data.balance >= 0 ? "text-primary-600" : "text-red-500" },
          { label: "Savings Rate",    value: data.savingsRate,   color: "text-purple-600", pct: true },
        ].map(({ label, value, color, pct }) => (
          <Card key={label} padding="sm" className="text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>
              {pct ? `${Math.round(value)}%` : formatCurrency(value)}
            </p>
          </Card>
        ))}
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses — Last 6 Months</CardTitle>
        </CardHeader>
        <MonthlyTrendChart data={data.monthlyStats} />
      </Card>

      {/* Spending breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <ExpensePieChart data={data.categoryStats} />
        </Card>

        {/* Category bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          {data.categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.categoryStats.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Spent"]}
                  contentStyle={{ borderRadius: "12px", fontSize: "13px", border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {data.categoryStats.slice(0, 8).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No expense data</div>
          )}
        </Card>
      </div>

      {/* Category detail table */}
      {data.categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Breakdown</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-2 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Amount</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Share</th>
                  <th className="py-2 px-2 text-gray-500 font-medium text-left">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryStats.map((cat) => (
                  <tr key={cat.categoryId} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(cat.amount)}
                    </td>
                    <td className="py-3 text-right text-gray-500">{cat.percentage}%</td>
                    <td className="py-3 px-2">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full w-24">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
