"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MessageSquare, AlertTriangle, CheckCircle2, Sparkles, Edit2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { parseSms, type ParsedSms } from "@/lib/smsParser";
import type { Category, Transaction } from "@/types";

interface Props {
  onClose:   () => void;
  onSuccess: () => void;
}

type Step = "paste" | "review" | "done";

interface DuplicateInfo {
  id:          string;
  description: string;
  amount:      number;
  date:        string;
  category:    { name: string } | null;
}

const EXAMPLES = [
  "Rs.5000.00 debited from a/c **1234 on 22-04-26. Info: SWIGGY FOOD. Avl Bal: Rs.12345.00",
  "ICICI Bank Acct XX1234 debited Rs.1,500.00 on 22-Apr-26 UPI:FLIPKART",
  "Your A/C XXXXX1234 is Credited with Rs.50000.00 on 22/04/2026 by NEFT.",
];

export function SmsPasteModal({ onClose, onSuccess }: Props) {
  const [step,       setStep]       = useState<Step>("paste");
  const [smsText,    setSmsText]    = useState("");
  const [parsed,     setParsed]     = useState<ParsedSms | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [duplicate,  setDuplicate]  = useState<DuplicateInfo | null>(null);
  const [dupChecked, setDupChecked] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [checking,   setChecking]   = useState(false);
  const [saveError,  setSaveError]  = useState("");

  // Editable fields (may differ from parsed)
  const [amount,      setAmount]      = useState("");
  const [type,        setType]        = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [description, setDescription] = useState("");
  const [date,        setDate]        = useState("");
  const [categoryId,  setCategoryId]  = useState("");
  const [notes,       setNotes]       = useState("");

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  // Auto-parse on paste / type (debounced 400ms)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!smsText.trim()) { setParsed(null); return; }
      const result = parseSms(smsText);
      setParsed(result);
    }, 400);
    return () => clearTimeout(t);
  }, [smsText]);

  const applyParsed = useCallback((p: ParsedSms) => {
    setAmount(String(p.amount));
    setType(p.type);
    setDescription(p.description);
    setDate(p.date);
    setCategoryId("");
    setNotes("");
    setDuplicate(null);
    setDupChecked(false);
    setSaveError("");
    setStep("review");
  }, []);

  const handleProceed = () => {
    if (!parsed) return;
    applyParsed(parsed);
  };

  const checkDuplicate = async (): Promise<DuplicateInfo | null> => {
    setChecking(true);
    try {
      const res  = await fetch("/api/transactions/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), type, date }),
      });
      const data = await res.json();
      return data.duplicate ?? null;
    } catch { return null; }
    finally   { setChecking(false); }
  };

  const handleSave = async (forceAdd = false) => {
    setSaveError("");

    // First check for duplicate (unless user already acknowledged it)
    if (!forceAdd && !dupChecked) {
      const dup = await checkDuplicate();
      setDupChecked(true);
      if (dup) {
        setDuplicate(dup);
        return; // stop — show warning, wait for user decision
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:      parseFloat(amount),
          type,
          description: description.trim() || "Bank Transaction",
          date,
          categoryId:  categoryId || null,
          notes:       notes.trim() || null,
          isRecurring: false,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Failed to save. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`;

  const confidenceColor = parsed?.confidence === "high"   ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                        : parsed?.confidence === "medium" ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        :                                   "text-gray-500 bg-gray-50 dark:bg-gray-800";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh]">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Add from SMS</h2>
              <p className="text-xs text-gray-400">Paste a bank alert to auto-fill</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════ Step 1: Paste ════════════════════════════════════════ */}
          {step === "paste" && (
            <div className="px-5 py-4 space-y-4">
              <textarea
                autoFocus
                rows={5}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 p-3.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={"Paste your bank SMS here…\n\nExample:\nRs.5000.00 debited from a/c **1234 on 22-04-26. Info: SWIGGY FOOD."}
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
              />

              {/* Live preview card */}
              {parsed ? (
                <div className={cn("rounded-2xl border-2 p-4 transition-all",
                  parsed.confidence === "high"   ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                  : parsed.confidence === "medium" ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                  :                                   "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                )}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Detected</span>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide", confidenceColor)}>
                      {parsed.confidence} confidence · {parsed.bank}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Amount</p>
                      <p className={cn("text-xl font-bold tabular-nums",
                        parsed.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>{fmt(parsed.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Type</p>
                      <span className={cn("text-xs font-semibold px-2 py-1 rounded-full",
                        parsed.type === "INCOME" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                                  : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      )}>{parsed.type}</span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Description</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{parsed.description}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{parsed.date}</p>
                    </div>
                  </div>
                </div>
              ) : smsText.length > 5 ? (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  Could not detect a bank transaction. Make sure it contains an amount like Rs.500 or INR 500.
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Works with SMS from:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["HDFC", "ICICI", "SBI", "Axis", "Kotak", "UPI alerts"].map(b => (
                      <span key={b} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{b}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Example: <span className="italic">{EXAMPLES[0]}</span></p>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!parsed}
                onClick={handleProceed}
              >
                <Edit2 className="w-4 h-4" /> Review & Add
              </Button>
            </div>
          )}

          {/* ════ Step 2: Review & Edit ════════════════════════════════ */}
          {step === "review" && (
            <div className="px-5 py-4 space-y-4">

              {/* Amount + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    className="input-base w-full"
                    value={amount}
                    min="0.01"
                    step="0.01"
                    onChange={e => { setAmount(e.target.value); setDupChecked(false); setDuplicate(null); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                  <div className="relative">
                    <select
                      className="input-base w-full appearance-none"
                      value={type}
                      onChange={e => { setType(e.target.value as "INCOME" | "EXPENSE"); setDupChecked(false); setDuplicate(null); }}
                    >
                      <option value="EXPENSE">Expense</option>
                      <option value="INCOME">Income</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  className="input-base w-full"
                  value={description}
                  maxLength={120}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  className="input-base w-full"
                  value={date}
                  onChange={e => { setDate(e.target.value); setDupChecked(false); setDuplicate(null); }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                <div className="relative">
                  <select
                    className="input-base w-full appearance-none"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes <span className="text-gray-300">(optional)</span></label>
                <input
                  type="text"
                  className="input-base w-full"
                  placeholder="Any extra details…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* ── Duplicate warning ──────────────────────────────────── */}
              {duplicate && (
                <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Possible duplicate detected</p>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                    A transaction with the same amount and type already exists within ±1 day:
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{duplicate.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(duplicate.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {duplicate.category && <> · {duplicate.category.name}</>}
                        </p>
                      </div>
                      <span className={cn("flex-shrink-0 text-sm font-bold",
                        type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>₹{duplicate.amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setDuplicate(null); setStep("paste"); setSmsText(""); }}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleSave(true)} loading={saving}>
                      Add Anyway
                    </Button>
                  </div>
                </div>
              )}

              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}

              {/* Action buttons */}
              {!duplicate && (
                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" onClick={() => setStep("paste")} disabled={saving}>
                    ← Back
                  </Button>
                  <Button className="flex-1" onClick={() => handleSave(false)} loading={saving || checking} disabled={saving || checking || !amount || !description}>
                    {checking ? "Checking…" : "Add Transaction"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════ Step 3: Done ═════════════════════════════════════════ */}
          {step === "done" && (
            <div className="px-5 py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">Transaction Added!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ₹{parseFloat(amount).toLocaleString("en-IN")} {type === "INCOME" ? "income" : "expense"} — {description}
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="secondary" onClick={() => { setStep("paste"); setSmsText(""); setParsed(null); setDuplicate(null); setDupChecked(false); }}>
                  Add Another
                </Button>
                <Button onClick={() => { onSuccess(); onClose(); }}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
