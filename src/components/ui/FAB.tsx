"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  onClick: () => void;
  className?: string;
}

/**
 * Floating Action Button — visible only on mobile (hidden lg+).
 * Sits fixed bottom-right, opens the Add Transaction modal.
 */
export function FAB({ onClick, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Add transaction"
      className={cn(
        // Only show on mobile — desktop has the header button
        "lg:hidden",
        "fixed bottom-6 right-6 z-30",
        "w-14 h-14 rounded-full",
        "bg-primary-600 hover:bg-primary-700 active:bg-primary-800",
        "text-white shadow-xl shadow-primary-500/30",
        "flex items-center justify-center",
        "transition-all duration-200 active:scale-90 hover:scale-105",
        // Pulse ring to draw attention on first load
        "animate-pulse-once",
        className
      )}
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
}
