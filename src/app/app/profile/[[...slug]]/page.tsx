"use client";

import Link from "next/link";
import { useHMSSession } from "@/modules/rbac/hooks";
import { logoutStaffAction } from "@/server/actions/auth/logout";

const DEPT_LABELS: Record<string, string> = {
  frontdesk: "Front Desk",
  doctors: "Doctors",
  nurses: "Nurses Bay",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
  accounts: "Accounts",
  store: "Store",
  admin: "Administration",
  hr: "Human Resources",
  it: "Information Technology",
  non_clinical: "Non-Clinical",
};

const ROLE_LABELS: Record<string, string> = {
  hod: "Head of Department",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  lab_scientist: "Lab Scientist",
  lab_technician: "Lab Technician",
  accountant: "Accountant",
  storekeeper: "Storekeeper",
  front_desk_officer: "Front Desk Officer",
  hr_manager: "HR Manager",
  hr_staff: "HR Officer",
  it_officer: "IT Officer",
  admin: "Administrator",
  non_clinical_staff: "Non-Clinical Staff",
  viewer: "Viewer",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export default function AppProfilePage() {
  const session = useHMSSession();

  const name      = session?.full_name ?? "Staff Member";
  const email     = session?.email ?? "—";
  const dept      = session?.department ?? "";
  const role      = session?.role ?? "";
  const staffId   = session?.staff_id ?? "";
  const initials  = getInitials(name);
  const deptLabel = DEPT_LABELS[dept] ?? dept;
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-24">
      {/* Avatar + name */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)]/10 text-2xl font-bold text-[var(--accent)]">
          {initials}
        </div>
        <h1 className="mt-3 text-lg font-bold text-slate-900">{name}</h1>
        <p className="text-sm text-slate-500">{email}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {deptLabel}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Account Details</h2>
        <div className="divide-y divide-slate-100 text-sm">
          {[
            { label: "Full Name",  value: name },
            { label: "Email",      value: email },
            { label: "Department", value: deptLabel },
            { label: "Role",       value: roleLabel },
            { label: "Staff ID",   value: staffId || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5">
              <span className="text-slate-500">{label}</span>
              <span className="font-medium text-slate-900 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Quick Access</h2>
        <div className="space-y-1">
          {[
            { href: "/staff/profile", label: "My Staff Profile & Payslips" },
            { href: "/staff/rota",    label: "My Rota / Shifts" },
            { href: "/staff/leave",   label: "Leave Requests" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span>{label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-red-400">Session</h2>
        <form action={logoutStaffAction}>
          <button
            type="submit"
            className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 active:opacity-80"
          >
            Sign Out of Work Portal
          </button>
        </form>
      </div>
    </div>
  );
}
