import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function HrPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function HrKpiCard({
  label,
  value,
  sub,
  trend,
  trendUp,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  accent?: "green" | "red" | "amber" | "default";
}) {
  const valueColor =
    accent === "green" ? "text-emerald-700" :
    accent === "red" ? "text-red-600" :
    accent === "amber" ? "text-amber-600" :
    "text-slate-900";

  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      {trend && (
        <p className={`mt-1 text-xs font-semibold ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
          {trend}
        </p>
      )}
    </Card>
  );
}

export function HrStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Present: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Closed: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    Inactive: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Late: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Absent: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Excellent: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    Good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Average: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  return (
    <span className={`inline-flex rounded-none px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export function HrBtnPrimary({
  href,
  onClick,
  children,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const cls = `inline-flex items-center gap-2 rounded-none bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-violet-500 disabled:opacity-50 ${className}`;
  if (href) {
    return <Link href={href} className={cls}>{children}</Link>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function HrBtnOutline({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-none border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${className}`}
    >
      {children}
    </Link>
  );
}

export function HrCardTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}

export function HrTabs({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: readonly string[];
  active: string;
  onChange: (tab: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded-none px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            active === t ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {t}
          {counts?.[t] != null && counts[t]! > 0 && (
            <span className="ml-1.5 rounded-none bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
              {counts[t]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function HrAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const letters = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const cls = size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-none bg-violet-100 font-bold text-violet-700 ${cls}`}>
      {letters}
    </div>
  );
}
