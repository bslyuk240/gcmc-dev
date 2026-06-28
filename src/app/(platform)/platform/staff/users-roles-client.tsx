"use client";

import { useState } from "react";
import { Card, StatusBadge, formatDate, Avatar, platformBtnPrimary } from "@/components/platform/page-shell";
import { createPlatformStaffAction } from "@/server/actions/platform/staff";
import type { StaffWithTenant } from "@/server/actions/platform/all-staff";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", doctor: "Doctor", nurse: "Nurse",
  pharmacist: "Pharmacist", lab_scientist: "Lab Scientist",
  radiographer: "Radiographer", front_desk_staff: "Front Desk",
  records_officer: "Records Officer", hr: "HR", finance: "Finance",
  it_support: "IT Support", security: "Security", porter: "Porter",
  cleaner: "Cleaner", dietitian: "Dietitian",
  platform_admin: "Platform Admin", platform_staff: "Platform Staff",
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

const TABS = ["Users", "Platform Staff", "Roles & Permissions"] as const;

type PlatformStaffRow = { id: string; full_name: string | null; email: string | null; role: string; is_active: boolean | null; created_at: string };

export function UsersRolesClient({
  hospitalStaff,
  totalHospitalStaff,
  platformStaff,
  roleKeys,
}: {
  hospitalStaff: StaffWithTenant[];
  totalHospitalStaff: number;
  platformStaff: PlatformStaffRow[];
  roleKeys: string[];
}) {
  const [tab, setTab] = useState<typeof TABS[number]>("Users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create platform staff
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"platform_admin" | "platform_staff">("platform_staff");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [staffList, setStaffList] = useState(platformStaff);

  const filtered = hospitalStaff.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.full_name ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateError(null); setTempPwd(null);
    const result = await createPlatformStaffAction({ full_name: newName, email: newEmail, role: newRole });
    setCreating(false);
    if (!result.success) { setCreateError(result.error); return; }
    setTempPwd(result.data.tempPassword);
    setNewName(""); setNewEmail("");
    setStaffList((prev) => [...prev, { id: crypto.randomUUID(), full_name: newName, email: newEmail, role: newRole, is_active: true, created_at: new Date().toISOString() }]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* All hospital staff */}
        {tab === "Users" && (
          <>
            <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-3">
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400">
                <option value="all">All Roles</option>
                {roleKeys.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
              </select>
              <span className="self-center text-xs text-slate-400">{totalHospitalStaff.toLocaleString()} total users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["User Name", "Email", "Role", "Tenant", "Status", "Last Active"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.full_name ?? s.email ?? "?"} size="sm" />
                          <span className="font-semibold text-slate-800">{s.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{s.email ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{s.hospital_name ?? "—"}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={s.is_active !== false ? "active" : "inactive"} /></td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Platform staff */}
        {tab === "Platform Staff" && (
          <div className="p-5 space-y-6">
            {createError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{createError}</div>}
            {tempPwd && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Account created — share this password:</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 select-all">{tempPwd}</p>
                <button type="button" onClick={() => setTempPwd(null)} className="mt-2 text-xs text-emerald-600 hover:underline">Dismiss</button>
              </div>
            )}

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {staffList.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name ?? s.email ?? "?"} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.full_name ?? "—"}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.role === "platform_admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABELS[s.role] ?? s.role}
                    </span>
                    {s.is_active === false && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Inactive</span>}
                  </div>
                </div>
              ))}
              {staffList.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No platform staff yet.</p>}
            </div>

            <form onSubmit={handleCreateStaff} className="rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Add Platform Staff</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="block text-xs font-medium text-slate-600">Full name</label><input required value={newName} onChange={(e)=>setNewName(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-600">Email</label><input required type="email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-slate-600">Role</label>
                  <select value={newRole} onChange={(e)=>setNewRole(e.target.value as typeof newRole)} className={inputClass}>
                    <option value="platform_staff">Platform Staff (restricted)</option>
                    <option value="platform_admin">Super Admin (full access)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={creating} className={`w-full ${platformBtnPrimary}`}>
                    {creating ? "Creating…" : "Add Staff Member"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Roles & Permissions */}
        {tab === "Roles & Permissions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Role", "Type", "Description", "Permissions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { role: "platform_admin", type: "Platform", desc: "Full platform access, all tenants", perms: "All" },
                  { role: "platform_staff", type: "Platform", desc: "View hospitals, approvals", perms: "Read-only" },
                  { role: "admin",          type: "Tenant",   desc: "Hospital administrator", perms: "Tenant-wide" },
                  { role: "doctor",         type: "Tenant",   desc: "Clinical staff — doctors", perms: "Clinical" },
                  { role: "nurse",          type: "Tenant",   desc: "Clinical staff — nurses", perms: "Clinical" },
                  { role: "pharmacist",     type: "Tenant",   desc: "Pharmacy department", perms: "Pharmacy" },
                  { role: "front_desk_staff", type: "Tenant", desc: "Reception & appointments", perms: "Front Desk" },
                  { role: "hr",             type: "Tenant",   desc: "HR department", perms: "HR" },
                  { role: "finance",        type: "Tenant",   desc: "Accounts & billing", perms: "Finance" },
                ].map((r) => (
                  <tr key={r.role} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">{r.role}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.type === "Platform" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{r.type}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{r.desc}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.perms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
