import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { formatNairaFromKobo, PLAN_MONTHLY_KOBO } from "@/lib/platform/pricing";
import { PageHeader, Card, StatusBadge, PlanBadge, formatDate, Avatar, platformBtnPrimary } from "@/components/platform/page-shell";
import type { Hospital } from "@/lib/tenant/types";

async function getHospitalsWithCounts() {
  const db = createAdminClient();
  if (!db) return { hospitals: [] as Hospital[], staffCounts: {} as Record<string, number> };

  const [{ data: hospitals }, { data: staffRows }] = await Promise.all([
    db.from("hospitals").select("*").order("created_at", { ascending: false }),
    db.from("staff_profiles")
      .select("hospital_id")
      .not("role", "in", '("platform_admin","platform_staff")')
      .not("hospital_id", "is", null),
  ]);

  const staffCounts: Record<string, number> = {};
  for (const s of staffRows ?? []) {
    if (s.hospital_id) staffCounts[s.hospital_id] = (staffCounts[s.hospital_id] ?? 0) + 1;
  }

  return { hospitals: (hospitals ?? []) as Hospital[], staffCounts };
}

async function getPendingApprovalsCount() {
  const db = createAdminClient();
  if (!db) return 0;
  const { count } = await db
    .from("hospital_signup_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export default async function TenantsPage() {
  await requirePlatformAccess();
  const [{ hospitals, staffCounts }, pendingApprovals] = await Promise.all([
    getHospitalsWithCounts(),
    getPendingApprovalsCount(),
  ]);

  const active    = hospitals.filter((h) => h.status === "active").length;
  const suspended = hospitals.filter((h) => h.status === "suspended").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="View tenant details and enter hospital portals. New hospitals are onboarded via Signup → Approvals."
        action={
          pendingApprovals > 0 ? (
            <Link
              href="/platform/approvals"
              className={platformBtnPrimary}
            >
              Review signups
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
                {pendingApprovals}
              </span>
            </Link>
          ) : undefined
        }
      />

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total tenants",  value: hospitals.length, color: "text-slate-800" },
          { label: "Active",         value: active,           color: "text-emerald-700" },
          { label: "Suspended",      value: suspended,        color: suspended > 0 ? "text-red-700" : "text-slate-400" },
          { label: "Provisioning",   value: hospitals.filter((h) => h.status === "provisioning").length, color: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main table */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-700">All Hospitals</h2>
          <p className="text-xs text-slate-400">Showing {hospitals.length} tenants</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Hospital Name", "Domain", "Plan", "Status", "Users", "MRR", "Joined On", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={h.name} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800">{h.name}</p>
                        {h.short_name && <p className="text-xs text-slate-400">{h.short_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{h.slug}</td>
                  <td className="px-5 py-3.5"><PlanBadge plan={h.plan} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={h.status} /></td>
                  <td className="px-5 py-3.5 text-slate-600">{staffCounts[h.id] ?? 0}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-700">
                    {h.status === "active" ? formatNairaFromKobo(PLAN_MONTHLY_KOBO[h.plan] ?? 0) : "—"}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">{formatDate(h.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/platform/hospitals/${h.id}`}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      View & enter portals
                    </Link>
                  </td>
                </tr>
              ))}
              {hospitals.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hospitals yet. They will appear here after signup approval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
