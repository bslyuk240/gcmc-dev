"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import { syncNhisFromSupabase } from "@/lib/data/nhis-store";
import type { HmoClaim, HmoRegistration } from "@/lib/data/nhis-store";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  paid: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NhisDashboardPage() {
  const { schemes, enrollments, claims, hmoRegistrations, hydrated } = useNhisStore();

  useEffect(() => {
    syncNhisFromSupabase();
  }, []);

  // Metrics
  const activeEnrollments = enrollments.filter((e) => e.isActive);
  const activeClaims = claims.filter((c) => c.status !== "paid" && c.status !== "rejected");
  const pendingSubmission = claims.filter((c) => c.status === "draft");
  const hmoReceivables = claims
    .filter((c) => c.status === "submitted" || c.status === "approved" || c.status === "partial")
    .reduce((sum, c) => sum + c.hmoAmount, 0);
  const pendingHmoRegistrations = hmoRegistrations.filter(
    (registration: HmoRegistration) => !enrollments.some((enrollment) => enrollment.patientId === registration.patientId),
  );

  const statusCounts: Record<string, number> = {
    draft: 0, submitted: 0, approved: 0, rejected: 0, paid: 0, partial: 0,
  };
  for (const c of claims) {
    if (c.status in statusCounts) statusCounts[c.status]++;
  }

  const recentClaims = [...claims].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  // Per scheme breakdown
  const schemeBreakdown = schemes.map((s) => {
    const schemeEnrollments = enrollments.filter((e) => e.schemeId === s.id && e.isActive);
    const schemeClaims = claims.filter(
      (c) => c.schemeId === s.id && (c.status === "submitted" || c.status === "approved" || c.status === "partial"),
    );
    const pendingAmount = schemeClaims.reduce((sum, c) => sum + c.hmoAmount, 0);
    return { scheme: s, enrolledCount: schemeEnrollments.length, pendingAmount };
  }).filter((x) => x.scheme.isActive);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <PageHeader title="NHIS / HMO Dashboard" description="HMO scheme management and claims overview." />
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NHIS / HMO Dashboard"
        description="HMO scheme management, patient enrollments, and claims overview."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Enrolled Patients",
            value: activeEnrollments.length,
            sub: `${schemes.filter((s) => s.isActive).length} active schemes`,
            color: "text-blue-700",
          },
          {
            label: "Pending HMO Enrollment",
            value: pendingHmoRegistrations.length,
            sub: "Front Desk HMO-flagged registrations",
            color: "text-violet-700",
          },
          {
            label: "Active Claims",
            value: activeClaims.length,
            sub: `${pendingSubmission.length} drafts pending submission`,
            color: "text-slate-900",
          },
          {
            label: "Pending Submission",
            value: pendingSubmission.length,
            sub: "Draft claims not yet sent to HMO",
            color: "text-amber-600",
          },
          {
            label: "HMO Receivables",
            value: fmt(hmoReceivables),
            sub: "Submitted + approved unpaid",
            color: "text-emerald-700",
          },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      {pendingHmoRegistrations.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Front Desk HMO Registrations</h3>
            <p className="text-xs text-slate-500">Patients marked as HMO at registration but not yet enrolled in NHIS.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Patient", "Patient ID", "Scheme", "Registered", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingHmoRegistrations.slice(0, 10).map((registration: HmoRegistration) => {
                  const schemeName = schemes.find((scheme) => scheme.id === registration.primaryHmoSchemeId)?.name ?? "—";
                  return (
                    <tr key={registration.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{registration.patientName}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{registration.patientId}</td>
                      <td className="px-5 py-3 text-slate-600">{schemeName}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatDate(registration.registeredAt)}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          Pending Enrollment
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Claims by status */}
      <Card className="p-5">
        <h3 className="mb-4 font-bold text-slate-900">Claims by Status</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${STATUS_STYLES[status]}`}>
              <span className="capitalize">{status}</span>
              <span className="ml-2 text-base font-bold">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Claims */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Recent Claims</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Claim No.", "Patient", "Scheme", "Services", "HMO Amount", "Status", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No claims yet.</td>
                </tr>
              ) : (
                recentClaims.map((c: HmoClaim) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{c.claimNumber || "—"}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{c.patientName}</td>
                    <td className="px-5 py-3 text-slate-600">{c.schemeName}</td>
                    <td className="px-5 py-3 text-slate-600">{c.services.length} item{c.services.length !== 1 ? "s" : ""}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{fmt(c.hmoAmount)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[c.status]}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Scheme Breakdown */}
      {schemeBreakdown.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Scheme Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Scheme", "Type", "Enrolled Patients", "Pending Receivables"].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schemeBreakdown.map(({ scheme, enrolledCount, pendingAmount }) => (
                  <tr key={scheme.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{scheme.name}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-semibold capitalize">
                        {scheme.type === "fee_for_service" ? "Fee-for-Service" : "Capitation"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">{enrolledCount}</td>
                    <td className="px-5 py-3 font-bold text-emerald-700">{fmt(pendingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
