"use client";

import { cn } from "@/lib/utils/cn";

export type StatusVariant =
  | "success"
  | "warning"
  | "destructive"
  | "neutral"
  | "info";

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  destructive: "bg-[var(--destructive-soft)] text-[var(--destructive)]",
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-[var(--accent-soft)] text-[var(--accent-foreground)]",
};

export function StatusBadge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
