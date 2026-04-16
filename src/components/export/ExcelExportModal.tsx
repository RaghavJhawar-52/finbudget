"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, FileSpreadsheet, Download } from "lucide-react";
import { format } from "date-fns";

interface Props {
  onClose: () => void;
}

export function ExcelExportModal({ onClose }: Props) {
  const today     = format(new Date(), "yyyy-MM-dd");
  const firstDay  = format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd");

  const [from,      setFrom]      = useState(firstDay);
  const [to,        setTo]        = useState(today);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const handleExport = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to",   to);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/export/excel?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob    = await res.blob();
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href        = url;
      a.download    = `finbudget-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Export Excel Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generates a detailed Excel workbook with 4 sheets: Summary, All Transactions, Monthly Analysis, and Category Breakdown.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction Type
              </label>
              <select
                className="input-base w-full"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All (Income + Expense)</option>
                <option value="INCOME">Income only</option>
                <option value="EXPENSE">Expense only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From
                </label>
                <input
                  type="date"
                  className="input-base w-full"
                  value={from}
                  max={to || today}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To
                </label>
                <input
                  type="date"
                  className="input-base w-full"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sheet preview */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
            {[
              { tab: "1", color: "bg-blue-500",   label: "Summary",            desc: "KPIs and quick stats" },
              { tab: "2", color: "bg-green-500",  label: "All Transactions",   desc: "Color-coded full list with filters" },
              { tab: "3", color: "bg-amber-400",  label: "Monthly Analysis",   desc: "Month-by-month income vs expenses" },
              { tab: "4", color: "bg-purple-500", label: "Category Breakdown", desc: "Spending by category" },
            ].map(({ tab, color, label, desc }) => (
              <div key={tab} className="flex items-center gap-3 px-3 py-2.5">
                <span className={`flex-shrink-0 w-6 h-6 rounded ${color} flex items-center justify-center text-white text-xs font-bold`}>
                  {tab}
                </span>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExport} loading={loading} disabled={loading}>
            {!loading && <Download className="w-4 h-4" />}
            {loading ? "Generating…" : "Download Excel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
