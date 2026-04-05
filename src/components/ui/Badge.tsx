import { cn } from "@/lib/utils";

interface BadgeProps {
  color?: string;    // hex color (used as background with opacity)
  variant?: "default" | "income" | "expense" | "warning" | "success";
  className?: string;
  children: React.ReactNode;
}

export function Badge({ color, variant = "default", className, children }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    income:  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    expense: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    warning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  };

  if (color) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", className)}
        style={{ backgroundColor: color + "20", color }}
      >
        {children}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
