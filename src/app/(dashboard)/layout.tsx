"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/transactions": "Transactions",
  "/budgets":      "Budgets",
  "/analytics":    "Analytics",
  "/goals":        "Goals",
  "/settings":     "Settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toasts, toast, removeToast }      = useToast();
  const pathname = usePathname();
  const title    = PAGE_TITLES[pathname] ?? "FinBudget";

  // ── Check if first-time user (no transactions yet) ──────────────────────
  useEffect(() => {
    const alreadySeen = localStorage.getItem("onboarding_complete");
    if (alreadySeen) return;

    // Only show on dashboard page
    if (pathname !== "/dashboard") return;

    fetch("/api/transactions?limit=1")
      .then(r => r.json())
      .then(data => {
        if ((data.total ?? 0) === 0) {
          setShowOnboarding(true);
        } else {
          // Has transactions — mark as complete so we never show it again
          localStorage.setItem("onboarding_complete", "1");
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-process recurring transactions on every dashboard visit ─────────
  useEffect(() => {
    if (pathname !== "/dashboard") return;

    fetch("/api/recurring/process", { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.created > 0) {
          // Store result so dashboard page can show the banner after re-render
          sessionStorage.setItem("recurring_posted", JSON.stringify(data));
          toast(
            `🔄 ${data.created} recurring transaction${data.created > 1 ? "s" : ""} auto-posted`,
            "info"
          );
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("onboarding_complete", "1");
    setShowOnboarding(false);
    toast("🎉 Setup complete! Your dashboard is ready.", "success");
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Onboarding wizard — shown only for brand-new users */}
      {showOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
