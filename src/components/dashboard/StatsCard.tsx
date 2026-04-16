"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, ChevronRight } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface Props {
  title: string;
  value: number;
  currency?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: { value: number; label: string };
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

/** Format a live animated number as currency or percentage */
function formatLive(value: number, currency: string): string {
  if (currency === "PCT") return `${Math.round(value)}%`;

  // Use compact Indian formatting for large numbers
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const symbol = currency === "INR" ? "₹" : "$";

  if (abs >= 10_00_000) {
    return `${sign}${symbol}${(abs / 10_00_000).toFixed(1)}L`;
  }
  if (abs >= 1_000) {
    // e.g. ₹85,000
    return `${sign}${symbol}${Math.round(abs).toLocaleString("en-IN")}`;
  }
  return `${sign}${symbol}${Math.round(abs)}`;
}

export function StatsCard({
  title,
  value,
  currency = "INR",
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  className,
  onClick,
  clickable,
}: Props) {
  const animated = useCountUp(value, 900);

  return (
    <div
      className={cn(
        "card p-5",
        clickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-95",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
            {formatLive(animated, currency)}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-500"
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              {trend.label}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
              iconBg
            )}
          >
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
          {clickable && (
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          )}
        </div>
      </div>
    </div>
  );
}
