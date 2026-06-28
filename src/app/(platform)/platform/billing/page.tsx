import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { listPlatformInvoicesAction, getPlatformBillingSummaryAction } from "@/server/actions/platform/invoices";
import { formatNairaFromKobo, PLAN_MONTHLY_KOBO } from "@/lib/platform/pricing";
import { listPlatformHospitalsAction } from "@/server/actions/platform/hospitals";
import { PageHeader, StatusBadge, PlanBadge, formatDate } from "@/components/platform/page-shell";
import { BillingTabs } from "./billing-tabs";

export default async function BillingPage() {
  await requirePlatformAccess();

  const [invoicesResult, summaryResult, hospitalsResult] = await Promise.all([
    listPlatformInvoicesAction(),
    getPlatformBillingSummaryAction(),
    listPlatformHospitalsAction(),
  ]);

  const invoices = invoicesResult.success ? invoicesResult.data : [];
  const summary  = summaryResult.success ? summaryResult.data : null;
  const hospitals = hospitalsResult.success ? hospitalsResult.data : [];

  const activeHospitals = hospitals.filter((h) => h.status === "active");
  const estimatedMrr = activeHospitals.reduce((s, h) => s + (PLAN_MONTHLY_KOBO[h.plan] ?? 0), 0);

  // Build subscriptions view from hospitals (since hospital_subscriptions may be empty initially)
  const subscriptions = hospitals.map((h) => ({
    id: h.id,
    hospital_name: h.name,
    hospital_slug: h.slug,
    plan: h.plan,
    status: h.status === "active" ? "active" : h.status === "suspended" ? "suspended" : "trial",
    billing_cycle: "monthly" as const,
    mrr: h.status === "active" ? PLAN_MONTHLY_KOBO[h.plan] ?? 0 : 0,
    created_at: h.created_at,
  }));

  const kpis = [
    { label: "Total MRR",            value: formatNairaFromKobo(estimatedMrr),                      sub: `${activeHospitals.length} active tenants`,       subTone: "text-indigo-600" },
    { label: "Active Subscriptions",  value: activeHospitals.length,                                 sub: `${hospitals.length} total tenants`,               subTone: "text-emerald-600" },
    { label: "Outstanding Invoices",  value: summary?.outstanding_count ?? 0,                        sub: summary ? formatNairaFromKobo(summary.outstanding_kobo) : "—", subTone: "text-amber-600" },
    { label: "Churn Rate",            value: hospitals.length > 0 ? `${Math.round((hospitals.filter(h=>h.status==="suspended").length/hospitals.length)*100)}%` : "0%", sub: `${hospitals.filter(h=>h.status==="suspended").length} suspended`, subTone: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions & Billing"
        subtitle="Monitor tenant subscriptions and Paystack payments."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{k.value}</p>
            <p className={`mt-0.5 text-xs font-medium ${k.subTone}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <BillingTabs
        subscriptions={subscriptions}
        invoices={invoices}
      />
    </div>
  );
}
