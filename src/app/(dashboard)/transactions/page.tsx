"use client";

import { useState, useEffect, useCallback } from "react";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImportModal } from "@/components/import/ImportModal";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import type { Transaction, Category } from "@/types";
import { Plus, Search, Download, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FAB } from "@/components/ui/FAB";
import { format } from "date-fns";

const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [exporting, setExporting]       = useState(false);
  const { toasts, toast, removeToast }  = useToast();

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]     = useState("");
  const [type, setType]         = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1); }, [type, category, from, to]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)   params.set("search", search);
    if (type)     params.set("type", type);
    if (category) params.set("category", category);
    if (from)     params.set("from", from);
    if (to)       params.set("to", to);
    params.set("page",  String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res  = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [search, type, category, from, to, page]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
  }, []);

  const clearFilters = () => {
    setSearchInput(""); setSearch(""); setType(""); setCategory(""); setFrom(""); setTo(""); setPage(1);
  };

  const hasFilters = searchInput || search || type || category || from || to;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `finbudget-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleImported = (count: number) => {
    setShowImport(false);
    setPage(1);
    fetchTransactions();
    toast(`✅ ${count} transaction${count !== 1 ? "s" : ""} imported successfully!`, "success");
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Transactions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} transactions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting} disabled={exporting}>
            {!exporting && <Download className="w-4 h-4" />} {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input-base pl-9"
              placeholder="Search transactions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <select className="input-base" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>

          <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input type="date" className="input-base" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div className="flex gap-2 mt-3">
          <input type="date" className="input-base flex-1" value={to} onChange={(e) => setTo(e.target.value)} />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {/* List */}
      <Card>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-14 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">🧾</div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              {hasFilters ? "Try clearing your filters" : "Add your first transaction or import a bank statement"}
            </p>
            {!hasFilters && (
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                  <Upload className="w-4 h-4" /> Import Bank Statement
                </Button>
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4" /> Add Transaction
                </Button>
              </div>
            )}
          </div>
        ) : (
          <TransactionList transactions={transactions} onRefresh={fetchTransactions} />
        )}
      </Card>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-20 text-center">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <FAB onClick={() => setShowAdd(true)} />

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <TransactionForm
          onSuccess={() => { setShowAdd(false); fetchTransactions(); }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
