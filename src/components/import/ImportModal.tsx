"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/types";
import {
  Upload, CheckCircle, AlertCircle, FileText,
  X, ChevronDown, ArrowRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportRow {
  id: string;
  rawDate: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
}

interface EditableRow extends ImportRow {
  selected: boolean;
  categoryId: string | null;
}

type Step = "upload" | "preview" | "done";

const KNOWN_BANKS = ["HDFC", "ICICI", "SBI", "Axis", "Kotak", "Other / Generic"];

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onImported: (count: number) => void;
}

export function ImportModal({ onClose, onImported }: Props) {
  const [step, setStep]           = useState<Step>("upload");
  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [bank, setBank]           = useState("Generic");
  const [parsing, setParsing]     = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows]           = useState<EditableRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
  }, []);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.(csv|txt)$/i)) {
      setParseError("Please upload a CSV file (.csv or .txt)");
      return;
    }
    setFile(f);
    setParseError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Parse ──────────────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res  = await fetch("/api/import/parse", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "Failed to parse file");
        return;
      }

      setBank(data.bank);
      setRows(
        (data.rows as ImportRow[]).map((r) => ({
          ...r,
          selected: true,
          categoryId: r.suggestedCategoryId,
        }))
      );
      setStep("preview");
    } catch {
      setParseError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;
    setImporting(true);

    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: selected.map((r) => ({
            date: r.date,
            description: r.description,
            amount: r.amount,
            type: r.type,
            categoryId: r.categoryId || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setParseError(data.error ?? "Import failed. Please try again.");
        return;
      }

      const data = await res.json();
      const count = data.imported ?? selected.length;
      setImportedCount(count);
      setStep("done");
      onImported(count);
    } catch {
      setParseError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const selected     = rows.filter((r) => r.selected);
  const totalIncome  = selected.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const totalExpense = selected.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden",
        step === "preview" ? "w-full max-w-5xl max-h-[90vh]" : "w-full max-w-lg"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import Bank Statement</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {step === "upload" && "Upload your bank's CSV export file"}
              {step === "preview" && `${rows.length} transactions detected from ${bank} Bank — review before importing`}
              {step === "done" && "Import complete!"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step 1: Upload ───────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="p-6 space-y-5">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                dragOver
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                  : file
                  ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              {file ? (
                <>
                  <FileText className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Drop your CSV file here</p>
                  <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                </>
              )}
            </div>

            {/* Bank selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Bank (auto-detected after upload, or select manually)
              </label>
              <div className="relative">
                <select
                  className="input-base pr-8 appearance-none"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                >
                  {KNOWN_BANKS.map((b) => <option key={b} value={b.split(" ")[0]}>{b}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* How-to hint */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">How to export from your bank:</p>
              <ul className="space-y-0.5 text-xs">
                <li>• <strong>HDFC:</strong> NetBanking → Accounts → Statement → Download as CSV</li>
                <li>• <strong>ICICI:</strong> iMobile / NetBanking → Statements → View / Download</li>
                <li>• <strong>SBI:</strong> YONO / NetBanking → Account Statement → Download Excel/CSV</li>
                <li>• <strong>Axis:</strong> NetBanking → Accounts → Statement → Export</li>
              </ul>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {parseError}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleParse}
              disabled={!file || parsing}
              loading={parsing}
            >
              {parsing ? "Analyzing file…" : <>Analyze Statement <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        )}

        {/* ── Step 2: Preview ──────────────────────────────────────────────── */}
        {step === "preview" && (
          <>
            {/* Summary bar */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={rows.every(r => r.selected)}
                  onChange={(e) => setRows(rows.map(r => ({ ...r, selected: e.target.checked })))}
                />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {selected.length} / {rows.length} selected
                </span>
              </label>
              <div className="flex gap-3 ml-auto">
                <span className="text-green-700 dark:text-green-400 font-medium">
                  ↑ Income: ₹{totalIncome.toLocaleString("en-IN")}
                </span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  ↓ Expense: ₹{totalExpense.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2.5 w-8"></th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400 w-28">Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-gray-600 dark:text-gray-400 w-28">Amount</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400 w-20">Type</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400 w-44">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        row.selected
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50 dark:bg-gray-800/50 opacity-50"
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded"
                          checked={row.selected}
                          onChange={(e) => setRows(rows.map(r =>
                            r.id === row.id ? { ...r, selected: e.target.checked } : r
                          ))}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white max-w-xs">
                        <p className="truncate">{row.description}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        <span className={row.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}>
                          ₹{row.amount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          row.type === "INCOME"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        )}>
                          {row.type === "INCOME" ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 w-full"
                          value={row.categoryId ?? ""}
                          onChange={(e) => setRows(rows.map(r =>
                            r.id === row.id ? { ...r, categoryId: e.target.value || null } : r
                          ))}
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep("upload")}>
                ← Back
              </Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={selected.length === 0 || importing}
              >
                Import {selected.length} transaction{selected.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 3: Done ─────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{importedCount} transactions imported!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your dashboard will now reflect the imported data.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={onClose}>View Transactions</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
