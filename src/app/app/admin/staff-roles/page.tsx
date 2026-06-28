"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdminPageHeader, AdminStatusBadge, AdminBtnPrimary } from "@/components/admin/admin-ui";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { ROLE_KEY_LABELS } from "@/lib/data/hr-store";
import { formatStaffDisplayId } from "@/lib/staff-id";

const TABS = ["All Staff", "Roles & Permissions"] as const;

const ROLE_ROWS = [
  { role: "Admin", permissions: "Full access", modules: ["All modules"] },
  { role: "Front Desk Staff", permissions: "Patients, Billing, Reports", modules: ["Patients", "Billing"] },
  { role: "Doctor", permissions: "Patients, Consultations, Pharmacy, Lab", modules: ["Consultations", "Lab"] },
  { role: "Nurse", permissions: "Patients, Consultations, Pharmacy", modules: ["Triage", "Medication"] },
  { role: "Pharmacist", permissions: "Pharmacy, Inventory", modules: ["Pharmacy", "Inventory"] },
  { role: "Accountant", permissions: "Billing, Reports, Approvals", modules: ["Billing", "Reports"] },
  { role: "Store Keeper", permissions: "Inventory, Reports", modules: ["Inventory"] },
  { role: "IT Officer", permissions: "IT System, Reports, Audit Logs", modules: ["IT", "Audit"] },
  { role: "HR Officer", permissions: "HR, Reports", modules: ["HR", "Leave"] },
];

export default function AdminStaffRolesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Staff");
  const [search, setSearch] = useState("");
  const { hrStaff } = useAdminStore();
  const { staff: hrStoreStaff } = useHRStore();

  type StaffRow = { id: string; name: string; department: string; role: string; status: string; email?: string };
  const staff: StaffRow[] = hrStaff.length > 0
    ? hrStaff.map((s) => ({ ...s, email: undefined }))
    : hrStoreStaff.map((s) => ({
        id: s.id,
        name: s.name,
        department: s.department,
        role: s.roleKey ?? s.role,
        status: s.status,
        email: s.email,
      }));
  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = (s.name ?? "").toLowerCase();
    const email = (s.email ?? "").toLowerCase();
    const dept = (s.department ?? "").toLowerCase();
    return name.includes(q) || email.includes(q) || dept.includes(q);
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff & Roles"
        subtitle="Manage hospital staff, roles, and access permissions."
        action={<AdminBtnPrimary href="/app/hr/staff-directory">+ Add Staff</AdminBtnPrimary>}
      />

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-none px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "All Staff" ? (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, email, or department…"
              className="min-w-[220px] flex-1 rounded-none border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
            />
            <span className="text-xs text-slate-400">{filtered.length} staff</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const name = s.name ?? "—";
                  const roleLabel = ROLE_KEY_LABELS[s.role as keyof typeof ROLE_KEY_LABELS] ?? s.role ?? "—";
                  const status = s.status ?? "Active";
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-800">{name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">
                        {formatStaffDisplayId({ id: s.id, name: s.name, department: s.department })}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{s.department ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{roleLabel}</td>
                      <td className="px-5 py-3">
                        <AdminStatusBadge status={status === "Active" ? "Active" : "Inactive"} />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                      No staff found.{" "}
                      <Link href="/app/hr/staff-directory" className="font-semibold text-indigo-600 hover:underline">
                        Add staff in HR directory →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">
              Role templates define module access. Edit permissions in{" "}
              <Link href="/app/hr/roles-permissions" className="font-semibold text-indigo-600 hover:underline">
                HR Roles & Permissions
              </Link>
              .
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Permissions</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Modules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROLE_ROWS.map((row) => (
                  <tr key={row.role} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{row.role}</td>
                    <td className="px-5 py-3 text-slate-600">{row.permissions}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.modules.map((m) => (
                          <span key={m} className="rounded-none bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
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
