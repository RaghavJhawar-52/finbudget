import type { Insight } from "@/types";
import {
  TrendingUp, TrendingDown, PieChart, AlertCircle,
  AlertTriangle, Info, CheckCircle, AlertOctagon, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  "trending-up":   TrendingUp,
  "trending-down": TrendingDown,
  "pie-chart":     PieChart,
  "alert-circle":  AlertCircle,
  "alert-triangle":AlertTriangle,
  "info":          Info,
  "piggy-bank":    Target,
  "alert-octagon": AlertOctagon,
};

const STYLES: Record<Insight["type"], { bg: string; text: string; border: string; icon: string }> = {
  warning: {
    bg:     "bg-yellow-50 dark:bg-yellow-900/20",
    text:   "text-yellow-800 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    icon:   "text-yellow-600 dark:text-yellow-400",
  },
  info: {
    bg:     "bg-blue-50 dark:bg-blue-900/20",
    text:   "text-blue-800 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon:   "text-blue-600 dark:text-blue-400",
  },
  success: {
    bg:     "bg-green-50 dark:bg-green-900/20",
    text:   "text-green-800 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    icon:   "text-green-600 dark:text-green-400",
  },
  danger: {
    bg:     "bg-red-50 dark:bg-red-900/20",
    text:   "text-red-800 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    icon:   "text-red-600 dark:text-red-400",
  },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = ICON_MAP[insight.icon] ?? Info;
  const styles = STYLES[insight.type];

  return (
    <div className={cn("flex gap-3 p-4 rounded-xl border", styles.bg, styles.border)}>
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", styles.icon)} />
      <div>
        <p className={cn("text-sm font-semibold", styles.text)}>{insight.title}</p>
        <p className={cn("text-xs mt-0.5 leading-relaxed", styles.text, "opacity-80")}>{insight.description}</p>
      </div>
    </div>
  );
}
