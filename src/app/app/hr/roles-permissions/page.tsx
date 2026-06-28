"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

type Module = "Patients" | "Billing" | "Consultations" | "Pharmacy" | "Lab" | "HR" | "Inventory" | "Reports" | "IT System" | "Admin Settings" | "Approvals" | "Audit Logs";

const ALL_MODULES: Module[] = ["Patients", "Billing", "Consultations", "Pharmacy", "Lab", "HR", "Inventory", "Reports", "IT System", "Admin Settings", "Approvals", "Audit Logs"];

type Role = { role: string; permissions: string; count: number; modules: Module[] };

const INITIAL: Role[] = [
  { role: "Admin", permissions: "Full access", count: 0, modules: [...ALL_MODULES] },
  { role: "Front Desk Staff", permissions: "Patients, Billing, Reports", count: 0, modules: ["Patients", "Billing", "Reports"] },
  { role: "Doctor", permissions: "Patients, Consultations, Pharmacy, Lab", count: 0, modules: ["Patients", "Consultations", "Pharmacy", "Lab"] },
  { role: "Nurse", permissions: "Patients, Consultations, Pharmacy", count: 0, modules: ["Patients", "Consultations", "Pharmacy"] },
  { role: "Pharmacist", permissions: "Pharmacy, Inventory", count: 0, modules: ["Pharmacy", "Inventory"] },
  { role: "Accountant", permissions: "Billing, Reports, Approvals", count: 0, modules: ["Billing", "Reports", "Approvals"] },
  { role: "Store Keeper", permissions: "Inventory, Reports", count: 0, modules: ["Inventory", "Reports"] },
  { role: "IT Officer", permissions: "IT System, Reports, Audit Logs", count: 0, modules: ["IT System", "Reports", "Audit Logs"] },
  { role: "HR Officer", permissions: "HR, Reports", count: 0, modules: ["HR", "Reports"] },
];

export default function HRRolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>(INITIAL);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editModules, setEditModules] = useState<Module[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);

  function openEdit(role: Role) {
    setEditRole(role);
    setEditModules([...role.modules]);
  }

  function toggleModule(mod: Module) {
    setEditModules((prev) => prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]);
  }

  function handleSave() {
    if (!editRole) return;
    const permissions = editModules.join(", ") || "No access";
    setRoles((prev) => prev.map((r) => r.role === editRole.role ? { ...r, modules: editModules, permissions } : r));
    setToast({ message: `Permissions for ${editRole.role} updated.`, type: "success" });
    setEditRole(null);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Hospital roles are managed in Administration. Use Staff Directory to assign roles to individuals."
      />

      <Card className="border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-900">
        Role-based access is configured under{" "}
        <a href="/app/admin/settings" className="font-semibold underline">
          Admin Settings
        </a>
        . This page shows a read-only overview; edits here are not persisted to the database.
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="font-bold text-slate-900">All Roles</h3>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {roles.map((row) => (
            <div key={row.role} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{row.role}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{row.count} staff assigned</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                  Edit
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {row.modules.slice(0, 6).map((m) => (
                  <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {m}
                  </span>
                ))}
                {row.modules.length > 6 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                    +{row.modules.length - 6} more
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">{row.permissions}</p>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Role", "Permissions / Modules", "Staff Count", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((row) => (
                <tr key={row.role} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.role}</td>
                  <td className="px-5 py-3 text-slate-600 max-w-[360px]">
                    <div className="flex flex-wrap gap-1">
                      {row.modules.slice(0, 6).map((m) => (
                        <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{m}</span>
                      ))}
                      {row.modules.length > 6 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">+{row.modules.length - 6} more</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.count}</td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit permissions modal */}
      {editRole && (
        <Modal open={true} onClose={() => setEditRole(null)} title={`Edit Permissions — ${editRole.role}`} className="max-w-xl">
          <p className="mb-4 text-sm text-slate-500">Select which modules this role can access.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_MODULES.map((mod) => (
              <label key={mod} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${editModules.includes(mod) ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <input
                  type="checkbox"
                  checked={editModules.includes(mod)}
                  onChange={() => toggleModule(mod)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--accent)]"
                />
                <span className={editModules.includes(mod) ? "font-semibold text-[var(--accent-foreground)]" : "text-slate-600"}>{mod}</span>
              </label>
            ))}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setEditRole(null)}>Cancel</Button>
            <Button size="md" onClick={handleSave}>Save Permissions</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
