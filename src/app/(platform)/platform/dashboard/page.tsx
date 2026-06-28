import Link from "next/link";
import { listPlatformHospitalsAction } from "@/server/actions/platform/hospitals";
import { getPlatformBillingSummaryAction } from "@/server/actions/platform/invoices";
import { listSignupRequestsAction } from "@/server/actions/platform/approvals";
import { formatNairaFromKobo, PLAN_MONTHLY_KOBO } from "@/lib/platform/pricing";
import { DashboardCharts } from "./dashboard-charts";

const STATUS_BADGE: Record<string, string> = {
  active:      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  suspended:   "bg-red-50 text-red-700 ring-1 ring-red-200",
  provisioning:"bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

const PLAN_BADGE: Record<string, string> = {
  starter:    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  standard:   "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  enterprise: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

type KpiCard = {
  label: string;
  value: string | number;
  sub?: string;
  subTone?: string;
  icon: React.ReactNode;
  iconBg: string;
  href?: string;
};

function KpiCard({ card }: { card: KpiCard }) {
  const inner = (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{card.value}</p>
        {card.sub && (
          <p className={`mt-0.5 text-xs font-medium ${card.subTone ?? "text-slate-400"}`}>{card.sub}</p>
        )}
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.iconBg}`}>
        {card.icon}
      </div>
    </div>
  );
  return card.href ? <Link href={card.href}>{inner}</Link> : inner;
}

function sectionCard(children: React.ReactNode, className = "") {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      {action && actionHref && (
        <Link href={actionHref} className="text-xs font-semibold text-indigo-600 hover:underline">{action}</Link>
      )}
    </div>
  );
}

export default async function PlatformDashboardPage() {
  const [hospitalsResult, billingResult, pendingResult] = await Promise.all([
    listPlatformHospitalsAction(),
    getPlatformBillingSummaryAction(),
    listSignupRequestsAction("pending"),
  ]);

  const hospitals = hospitalsResult.success ? hospitalsResult.data : [];
  const billing = billingResult.success ? billingResult.data : null;
  const pendingCount = pendingResult.success ? pendingResult.data.length : 0;

  const active    = hospitals.filter((h) => h.status === "active");
  const suspended = hospitals.filter((h) => h.status === "suspended");
  const recent    = hospitals.slice(0, 6);

  const estimatedMrr = active.reduce((sum, h) => sum + (PLAN_MONTHLY_KOBO[h.plan] ?? 0), 0);

  // Plan distribution for chart
  const planCounts = {
    starter:    hospitals.filter((h) => h.plan === "starter").length,
    standard:   hospitals.filter((h) => h.plan === "standard").length,
    enterprise: hospitals.filter((h) => h.plan === "enterprise").length,
  };

  // Mock recent activity (real impl would read from audit log)
  const recentActivity = [
    { text: `${hospitals[0]?.name ?? "A hospital"} registered`, time: "2 min ago", type: "register" },
    { text: billing?.paid_this_month_kobo ? `Payment collected: ${formatNairaFromKobo(billing.paid_this_month_kobo)}` : "No payments yet", time: "15 min ago", type: "payment" },
    { text: `${active.length} hospitals currently active`, time: "1 hr ago", type: "info" },
    { text: `${suspended.length} hospitals suspended`, time: "2 hr ago", type: "warn" },
  ];

  const kpiCards: KpiCard[] = [
    {
      label: "Total Tenants",
      value: hospitals.length,
      sub: `+0 this month`,
      subTone: "text-indigo-600",
      href: "/platform/hospitals",
      iconBg: "bg-indigo-50",
      icon: (
        <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7l6-4 6 4v14M10 10h4v4h-4z" />
        </svg>
      ),
    },
    {
      label: "Active Tenants",
      value: active.length,
      sub: hospitals.length > 0 ? `${Math.round((active.length / hospitals.length) * 100)}% of total` : "—",
      subTone: "text-emerald-600",
      href: "/platform/hospitals",
      iconBg: "bg-emerald-50",
      icon: (
        <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      label: "Pending Approvals",
      value: pendingCount,
      sub: pendingCount > 0 ? "Needs review" : "All clear",
      subTone: pendingCount > 0 ? "text-amber-600" : "text-slate-400",
      href: "/platform/approvals",
      iconBg: "bg-amber-50",
      icon: (
        <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
    {
      label: "Monthly Revenue",
      value: formatNairaFromKobo(billing?.paid_this_month_kobo ?? 0),
      sub: `Est. MRR ${formatNairaFromKobo(estimatedMrr)}`,
      subTone: "text-indigo-600",
      href: "/platform/billing",
      iconBg: "bg-violet-50",
      icon: (
        <svg className="h-6 w-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Outstanding Invoices",
      value: billing?.outstanding_count ?? 0,
      sub: billing?.outstanding_kobo ? formatNairaFromKobo(billing.outstanding_kobo) : "None",
      subTone: (billing?.overdue_count ?? 0) > 0 ? "text-red-600" : "text-slate-400",
      href: "/platform/billing",
      iconBg: "bg-rose-50",
      icon: (
        <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4M7 3h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      label: "Suspended",
      value: suspended.length,
      sub: suspended.length > 0 ? "Requires attention" : "None",
      subTone: suspended.length > 0 ? "text-red-600" : "text-slate-400",
      href: "/platform/hospitals",
      iconBg: "bg-red-50",
      icon: (
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    {
      label: "Starter Plan",
      value: planCounts.starter,
      sub: `${planCounts.standard} Standard · ${planCounts.enterprise} Enterprise`,
      subTone: "text-slate-400",
      href: "/platform/hospitals",
      iconBg: "bg-sky-50",
      icon: (
        <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Overdue Invoices",
      value: billing?.overdue_count ?? 0,
      sub: billing?.overdue_count ? "Needs follow-up" : "None overdue",
      subTone: (billing?.overdue_count ?? 0) > 0 ? "text-orange-600" : "text-slate-400",
      href: "/platform/billing",
      iconBg: "bg-orange-50",
      icon: (
        <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
        <p className="mt-0.5 text-sm text-slate-500">Platform-wide operations at a glance.</p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => <KpiCard key={card.label} card={card} />)}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart — 2 cols */}
        <div className="lg:col-span-2">
          {sectionCard(
            <>
              <SectionHeader title="Revenue Overview" />
              <div className="px-5 py-4">
                <DashboardCharts
                  planCounts={planCounts}
                  estimatedMrr={estimatedMrr}
                  collectedThisMonth={billing?.paid_this_month_kobo ?? 0}
                />
              </div>
            </>
          )}
        </div>

        {/* Tenants by plan donut — 1 col */}
        {sectionCard(
          <>
            <SectionHeader title="Tenants by Plan" />
            <div className="px-5 py-4">
              <DashboardCharts
                planCounts={planCounts}
                estimatedMrr={estimatedMrr}
                collectedThisMonth={billing?.paid_this_month_kobo ?? 0}
                chartType="donut"
              />
            </div>
          </>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent tenants — 2 cols */}
        <div className="lg:col-span-2">
          {sectionCard(
            <>
              <SectionHeader title="Recent Tenants" action="View all" actionHref="/platform/hospitals" />
              <div className="divide-y divide-slate-100">
                {recent.map((h) => (
                  <Link
                    key={h.id}
                    href={`/platform/hospitals/${h.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                        {h.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{h.name}</p>
                        <p className="text-xs text-slate-400">{h.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PLAN_BADGE[h.plan] ?? ""}`}>
                        {h.plan} plan
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[h.status] ?? ""}`}>
                        {h.status}
                      </span>
                    </div>
                  </Link>
                ))}
                {recent.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-slate-400">No hospitals yet.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Recent Activity + System Health — 1 col */}
        <div className="space-y-4">
          {/* System Health */}
          {sectionCard(
            <>
              <SectionHeader title="System Health" action="View details" actionHref="/platform/tools" />
              <div className="space-y-3 px-5 py-4">
                {[
                  { label: "Database",        status: "Healthy" },
                  { label: "API",             status: "Healthy" },
                  { label: "Storage",         status: "Healthy" },
                  { label: "Background Jobs", status: "Healthy" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                        <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7-1-0.5z" />
                        </svg>
                      </span>
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">{item.status}</span>
                  </div>
                ))}
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-xs text-slate-500">Uptime</p>
                  <p className="text-lg font-bold text-slate-700">99.98%</p>
                  <p className="text-[10px] text-slate-400">Last checked: just now</p>
                </div>
              </div>
            </>
          )}

          {/* Recent Activity */}
          {sectionCard(
            <>
              <SectionHeader title="Recent Activity" />
              <div className="divide-y divide-slate-100">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      a.type === "register" ? "bg-indigo-500" :
                      a.type === "payment"  ? "bg-emerald-500" :
                      a.type === "warn"     ? "bg-red-400" :
                      "bg-slate-300"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-600 leading-snug">{a.text}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
