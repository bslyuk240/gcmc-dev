import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { UnitManager } from "@/components/non-clinical/unit-manager";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function NonClinicalPortalPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Non-Clinical Staff"
        description="Support staff — security, maintenance, catering, housekeeping, and porters."
      />

      {/* ── Units section ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Unit Management</h2>
          <Link
            href={`${INTERNAL_PREFIX}/non_clinical/rota`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Unit Rota →
          </Link>
        </div>
        <UnitManager />
      </section>

      {/* ── Staff portal quick links ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Staff Portal</h2>
        <div className="rounded-xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-700">
          Non-clinical staff access their personal schedule, leave, and payslips through the{" "}
          <Link href="/staff/dashboard" className="font-semibold underline underline-offset-2">
            Staff Self-Service Portal
          </Link>
          . There is no clinical management dashboard for this category.
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/staff/dashboard",   label: "Staff Dashboard",  desc: "Personal overview and quick actions.",          icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", bg: "bg-lime-50",    ic: "text-lime-600"   },
            { href: "/staff/my-rota",     label: "My Rota",          desc: "View shift schedule and upcoming duties.",      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",                                                                               bg: "bg-sky-50",     ic: "text-sky-600"    },
            { href: "/staff/leave",       label: "Leave Requests",   desc: "Apply for leave and track request status.",     icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",          bg: "bg-amber-50",   ic: "text-amber-600"  },
            { href: "/staff/payslips",    label: "Payslips",         desc: "Download monthly payslips.",                    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z",                                     bg: "bg-emerald-50", ic: "text-emerald-600"},
            { href: "/staff/attendance",  label: "Attendance",       desc: "View attendance records and clock history.",    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", bg: "bg-violet-50", ic: "text-violet-600" },
            { href: `${INTERNAL_PREFIX}/non_clinical/chat`, label: "Chat to IT", desc: "Report technical issues.",          icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",      bg: "bg-cyan-50",    ic: "text-cyan-600"   },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-lime-300 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                <svg className={`h-4.5 w-4.5 ${item.ic}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HR note */}
      <p className="text-xs text-slate-400">
        HR manages payroll and leave for non-clinical staff through the standard{" "}
        <Link href="/app/hr/payroll" className="text-[var(--accent)] hover:underline">Payroll</Link>
        {" "}and{" "}
        <Link href="/app/hr/leave-management" className="text-[var(--accent)] hover:underline">Leave Management</Link>
        {" "}workflows.
      </p>
    </div>
  );
}
