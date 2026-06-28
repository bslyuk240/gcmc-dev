import { requirePlatformAdmin } from "@/lib/server/platformAccess";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_MONTHLY_KOBO } from "@/lib/platform/pricing";
import { PageHeader, KpiCard } from "@/components/platform/page-shell";
import { AnalyticsCharts } from "./analytics-charts";
import type { Hospital } from "@/lib/tenant/types";

async function getAnalyticsData() {
  const db = createAdminClient();
  if (!db) return { hospitals: [] as Hospital[], totalStaff: 0, activeStaff: 0 };

  const [{ data: hospitals }, { count: totalStaff }, { count: activeStaff }] = await Promise.all([
    db.from("hospitals").select("*").order("created_at", { ascending: true }),
    db.from("staff_profiles").select("id", { count: "exact", head: true }).not("role", "in", '("platform_admin","platform_staff")'),
    db.from("staff_profiles").select("id", { count: "exact", head: true }).not("role", "in", '("platform_admin","platform_staff")').eq("is_active", true),
  ]);

  return {
    hospitals: (hospitals ?? []) as Hospital[],
    totalStaff: totalStaff ?? 0,
    activeStaff: activeStaff ?? 0,
  };
}

export default async function AnalyticsPage() {
  await requirePlatformAdmin();
  const { hospitals, totalStaff, activeStaff } = await getAnalyticsData();

  const active = hospitals.filter((h) => h.status === "active");
  const estimatedMrr = active.reduce((s, h) => s + (PLAN_MONTHLY_KOBO[h.plan] ?? 0), 0);

  const planCounts = {
    starter:    hospitals.filter((h) => h.plan === "starter").length,
    standard:   hospitals.filter((h) => h.plan === "standard").length,
    enterprise: hospitals.filter((h) => h.plan === "enterprise").length,
  };

  const kpis = [
    {
      label: "Total Users", value: totalStaff.toLocaleString(),
      sub: "+0 this month", subTone: "text-indigo-600",
      iconBg: "bg-indigo-50",
      icon: <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    },
    {
      label: "Active Users", value: activeStaff.toLocaleString(),
      sub: `${totalStaff > 0 ? Math.round(activeStaff/totalStaff*100) : 0}% of total`, subTone: "text-emerald-600",
      iconBg: "bg-emerald-50",
      icon: <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
    {
      label: "New Signups", value: hospitals.length,
      sub: "total tenants", subTone: "text-slate-500",
      iconBg: "bg-amber-50",
      icon: <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>,
    },
    {
      label: "MRR", value: `₦${(estimatedMrr/100/1000).toFixed(0)}K`,
      sub: `+0% vs last month`, subTone: "text-violet-600",
      iconBg: "bg-violet-50",
      icon: <svg className="h-6 w-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Track platform growth, active users, revenue, and usage metrics." />

      <div className="grid gap-4 sm:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <AnalyticsCharts
        hospitals={hospitals.map((h) => ({ plan: h.plan, status: h.status, created_at: h.created_at }))}
        planCounts={planCounts}
        estimatedMrr={estimatedMrr}
        totalStaff={totalStaff}
      />
    </div>
  );
}
