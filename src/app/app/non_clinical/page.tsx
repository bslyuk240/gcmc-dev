import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function NonClinicalPortalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Non-Clinical Staff"
        description="Support staff — security, maintenance, catering, housekeeping, and porters."
      />

      {/* Info banner */}
      <div className="rounded-xl border border-lime-200 bg-lime-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-100">
            <svg
              className="h-5 w-5 text-lime-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-lime-900">Staff Portal is your workspace</p>
            <p className="mt-0.5 text-sm text-lime-700">
              Non-clinical staff manage their rota, leave requests, payslips, and personal
              documents through the <strong>Staff Self-Service Portal</strong>. There is no
              clinical management dashboard for this category.
            </p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/staff/dashboard"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-lime-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-50">
            <svg className="h-5 w-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Staff Dashboard</p>
            <p className="mt-0.5 text-xs text-slate-500">Your personal overview and quick actions.</p>
          </div>
        </Link>

        <Link
          href="/staff/my-rota"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-lime-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
            <svg className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">My Rota</p>
            <p className="mt-0.5 text-xs text-slate-500">View your shift schedule and upcoming duties.</p>
          </div>
        </Link>

        <Link
          href="/staff/leave"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-lime-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Leave Requests</p>
            <p className="mt-0.5 text-xs text-slate-500">Apply for leave and track your request status.</p>
          </div>
        </Link>

        <Link
          href="/staff/payslips"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-lime-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Payslips</p>
            <p className="mt-0.5 text-xs text-slate-500">Download monthly payslips and payment history.</p>
          </div>
        </Link>

        <Link
          href="/staff/attendance"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-lime-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <svg className="h-5 w-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Attendance</p>
            <p className="mt-0.5 text-xs text-slate-500">View your attendance records and clock history.</p>
          </div>
        </Link>

        <Link
          href="/app/non_clinical/chat"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
            <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Chat to IT</p>
            <p className="mt-0.5 text-xs text-slate-500">Report technical issues or request IT support.</p>
          </div>
        </Link>
      </div>

      {/* HR note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">HR note: </span>
        Non-clinical staff appear in the{" "}
        <Link href="/app/hr/staff-directory" className="font-semibold text-[var(--accent)] hover:underline">
          Staff Directory
        </Link>{" "}
        and{" "}
        <Link href="/app/hr/department-staffing" className="font-semibold text-[var(--accent)] hover:underline">
          Department Staffing
        </Link>{" "}
        pages under the <strong>Non-Clinical Staff</strong> category. Payroll and leave are
        managed through the standard HR payroll and leave management workflows.
      </div>
    </div>
  );
}
