import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function AdminPageHeader({
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

export function AdminKpiCard({
  label,
  value,
  sub,
  trend,
  trendUp,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        {trend && (
          <p className={`mt-1 text-xs font-semibold ${trendUp ? "text-emerald-600" : "text-red-600"}`}>
            {trend}
          </p>
        )}
      </div>
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-indigo-50 text-indigo-600">
          {icon}
        </div>
      )}
    </Card>
  );
}

export function AdminStatusBadge({ status }: { status: "Good" | "Warning" | "Critical" | "Active" | "Inactive" | string }) {
  const styles: Record<string, string> = {
    Good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Critical: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Inactive: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return (
    <span className={`inline-flex rounded-none px-2 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export function AdminBtnPrimary({
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
      className={`inline-flex items-center gap-2 rounded-none bg-indigo-600 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-indigo-500 ${className}`}
    >
      {children}
    </Link>
  );
}

export function AdminBtnOutline({
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

export function AdminCardTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}
