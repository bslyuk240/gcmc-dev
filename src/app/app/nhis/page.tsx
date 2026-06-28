"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import { fetchHmoPreauthorizations } from "@/lib/nhis/client";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
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

function MobileMeta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export default function NhisDashboardPage() {
  const { schemes, enrollments, claims, hmoRegistrations, hydrated } = useNhisStore();
  const [pendingPreauths, setPendingPreauths] = useState(0);

  useEffect(() => {
    syncNhisFromSupabase();
    void fetchHmoPreauthorizations({ status: "pending" })
      .then((rows) => setPendingPreauths(rows.length))
      .catch(() => setPendingPreauths(0));
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
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
            label: "Pending Pre-auth",
            value: pendingPreauths,
            sub: "Admission & procedure requests",
            color: pendingPreauths > 0 ? "text-amber-600" : "text-slate-600",
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
          <Card key={s.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{s.label}</p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{s.sub}</p>
          </Card>
        ))}
      </div>

      {pendingPreauths > 0 ? (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            <strong>{pendingPreauths}</strong> pre-authorization request(s) awaiting review.{" "}
            <Link href={`${INTERNAL_PREFIX}/nhis/preauth`} className="font-semibold underline">
              Open pre-auth queue
            </Link>
          </p>
        </Card>
      ) : null}

      {pendingHmoRegistrations.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Front Desk HMO Registrations</h3>
                <p className="text-xs text-slate-500">Patients marked as HMO at registration but not yet enrolled in NHIS.</p>
              </div>
              <div className="grid gap-3 p-4 md:hidden">
                {pendingHmoRegistrations.slice(0, 10).map((registration: HmoRegistration) => {
                  const schemeName = schemes.find((scheme) => scheme.id === registration.primaryHmoSchemeId)?.name ?? "—";
                  return (
                    <div key={registration.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{registration.patientName}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">{registration.patientDisplayId}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                          Pending
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <MobileMeta label="Scheme" value={schemeName} />
                        <MobileMeta label="Registered" value={formatDate(registration.registeredAt)} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{registration.patientDisplayId}</td>
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
      <Card className="p-4 sm:p-5">
        <h3 className="mb-4 font-bold text-slate-900">Claims by Status</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className={`rounded-lg px-3 py-2 text-xs font-semibold sm:px-4 sm:py-2.5 sm:text-sm ${STATUS_STYLES[status]}`}>
              <span className="capitalize">{status}</span>
              <span className="ml-2 text-sm font-bold sm:text-base">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Claims */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Recent Claims</h3>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {recentClaims.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              No claims yet.
            </div>
          ) : (
            recentClaims.map((c: HmoClaim) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{c.patientName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">{c.claimNumber || "—"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[c.status]}`}>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <MobileMeta label="Scheme" value={c.schemeName} />
                  <MobileMeta label="Amount" value={fmt(c.hmoAmount)} />
                  <MobileMeta label="Services" value={`${c.services.length} item${c.services.length !== 1 ? "s" : ""}`} />
                  <MobileMeta label="Date" value={formatDate(c.createdAt)} />
                </div>
              </div>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
          <div className="grid gap-3 p-4 md:hidden">
            {schemeBreakdown.map(({ scheme, enrolledCount, pendingAmount }) => (
              <div key={scheme.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{scheme.name}</p>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 capitalize">
                    {scheme.type === "fee_for_service" ? "Fee-for-Service" : "Capitation"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <MobileMeta label="Enrolled" value={enrolledCount} />
                  <MobileMeta label="Pending" value={fmt(pendingAmount)} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
