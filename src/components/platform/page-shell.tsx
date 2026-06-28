import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
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
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  actionHref,
}: {
  title: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      {action && actionHref && (
        <Link href={actionHref} className="text-xs font-semibold text-indigo-600 hover:underline">
          {action}
        </Link>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  subTone = "text-slate-400",
  iconBg,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subTone?: string;
  iconBg: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className={`mt-0.5 text-xs font-medium ${subTone}`}>{sub}</p>}
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

export const STATUS_BADGE: Record<string, string> = {
  active:       "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  trial:        "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  suspended:    "bg-red-50 text-red-700 ring-1 ring-red-200",
  inactive:     "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  provisioning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  pending:      "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  expired:      "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  cancelled:    "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export const PLAN_BADGE: Record<string, string> = {
  enterprise: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  standard:   "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  starter:    "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PLAN_BADGE[plan] ?? "bg-slate-100 text-slate-600"}`}>
      {plan} plan
    </span>
  );
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const letters = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-700 ${cls}`}>
      {letters}
    </div>
  );
}

/** Shared form control styles for platform console pages */
export const platformInputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const platformBtnBase =
  "platform-btn inline-flex items-center justify-center gap-2 rounded-none transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none";

/** Primary action — square corners, slate fill, white label (fixes link inherit color) */
export const platformBtnPrimary = `${platformBtnBase} bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-slate-800`;

export const platformBtnPrimaryLg = `${platformBtnPrimary} px-5`;

export const platformBtnOutline = `${platformBtnBase} border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50`;

export const platformBtnOutlineSm = `${platformBtnBase} border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50`;

export const platformBtnMuted = `${platformBtnBase} border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50`;

export const platformBtnAccentOutline = `${platformBtnBase} border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100`;

export const platformBtnSuccess = `${platformBtnBase} bg-emerald-600 px-3 py-2 text-sm font-semibold !text-white hover:bg-emerald-500`;

export const platformBtnDestructive = `${platformBtnBase} bg-red-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-red-500`;

export const platformBtnDangerOutline = `${platformBtnBase} border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50`;

export const platformBtnGhostSm = `${platformBtnBase} border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700`;

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  sent: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
  void: "bg-slate-50 text-slate-400 ring-1 ring-slate-200",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${INVOICE_STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
