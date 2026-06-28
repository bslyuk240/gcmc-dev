"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { sendPasswordResetAction } from "@/server/actions/it/send-password-reset";
import type { ITStaffRecord } from "@/lib/it/types";
import type { RoleKey } from "@/lib/auth/session-types";

const ROLE_OPTIONS: { value: RoleKey; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "front_desk_staff", label: "Front Desk" },
  { value: "accountant", label: "Accountant" },
  { value: "store_keeper", label: "Store Keeper" },
  { value: "it_staff", label: "IT Officer" },
  { value: "hr_staff", label: "HR Staff" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "viewer", label: "Viewer" },
];

const STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-slate-100 text-slate-500",
};

export default function ITUserAccessPage() {
  const [users, setUsers] = useState<ITStaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manageUser, setManageUser] = useState<ITStaffRecord | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [editRole, setEditRole] = useState<RoleKey>("viewer");
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/it/staff");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.staff ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openManage(user: ITStaffRecord) {
    setManageUser(user);
    setEditRole(user.role as RoleKey);
    setEditActive(user.isActive);
  }

  async function handleSaveManage() {
    if (!manageUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/it/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: manageUser.id,
          role: editRole,
          isActive: editActive,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update access.");
      setToast({ message: `${manageUser.name}'s access updated.`, type: "success" });
      setManageUser(null);
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Could not update access.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!manageUser) return;
    const result = await sendPasswordResetAction(manageUser.email, manageUser.id);
    setToast({
      message: result.success ? `Password reset link sent to ${manageUser.email}.` : (result.error ?? "Failed to send reset link."),
      type: result.success ? "success" : "error",
    });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="User Access"
        description="Reset passwords and manage active status for hospital staff accounts. New staff onboarding is handled by HR."
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="font-bold text-slate-900">Hospital Staff Accounts <span className="text-sm font-normal text-slate-400">({users.length})</span></h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No staff accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Name", "Email", "Role", "Department", "Status", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-5 py-3 text-slate-500">{row.email}</td>
                    <td className="px-5 py-3 text-slate-600">{row.role.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-slate-600">{row.department}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>{row.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant="outline" onClick={() => openManage(row)}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {manageUser && (
        <Modal open={true} onClose={() => setManageUser(null)} title={`Manage — ${manageUser.name}`}>
          <div className="space-y-4 text-sm">
            <p className="text-slate-500">{manageUser.email} · {manageUser.department}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value as RoleKey)} className={inputCls}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Account Status</label>
              <select value={editActive ? "active" : "inactive"} onChange={(e) => setEditActive(e.target.value === "active")} className={inputCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button type="button" onClick={() => void handleResetPassword()} className="text-sm font-medium text-[var(--accent)] hover:underline">
              Send password reset link →
            </button>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setManageUser(null)}>Cancel</Button>
            <Button size="md" disabled={saving} onClick={() => void handleSaveManage()}>{saving ? "Saving…" : "Save Changes"}</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
