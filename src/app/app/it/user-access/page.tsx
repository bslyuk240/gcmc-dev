"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { sendPasswordResetAction } from "@/server/actions/it/send-password-reset";
import { fetchStaffMembers } from "@/lib/supabase/db";
import type { StaffMember } from "@/lib/data/hr-store";

type UserStatus = "Active" | "Suspended" | "Inactive";

const ROLES = ["Admin", "Doctor", "Nurse", "Pharmacist", "Front Desk", "Accountant", "Store Keeper", "IT Officer", "HR Officer"];
const DEPARTMENTS = ["Admin", "Doctors", "Nurses", "Pharmacy", "Front Desk", "Accounts", "Store", "IT", "HR"];

const STATUS_STYLES: Record<UserStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Suspended: "bg-red-50 text-red-700",
  Inactive: "bg-slate-100 text-slate-500",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: UserStatus;
  lastLogin: string;
};

function staffToUserRecord(s: StaffMember): UserRecord {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    department: s.department,
    status: s.status === "Active" ? "Active" : s.status === "Terminated" ? "Inactive" : "Inactive",
    lastLogin: "—",
  };
}

export default function ITUserAccessPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [manageUser, setManageUser] = useState<UserRecord | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Invite form
  const [inviteName, setInviteName] = useState(""); const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(""); const [inviteDept, setInviteDept] = useState("");

  // Manage form
  const [editRole, setEditRole] = useState(""); const [editStatus, setEditStatus] = useState<UserStatus>("Active");

  useEffect(() => {
    fetchStaffMembers().then((staff) => {
      setUsers(staff.map(staffToUserRecord));
      setLoading(false);
    });
  }, []);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const user: UserRecord = {
      id: `USR-${Date.now()}`,
      name: inviteName, email: inviteEmail, role: inviteRole,
      department: inviteDept, status: "Active", lastLogin: "Never",
    };
    setUsers((prev) => [...prev, user]);
    setToast({ message: `Invitation sent to ${inviteEmail}.`, type: "success" });
    setShowInvite(false);
    setInviteName(""); setInviteEmail(""); setInviteRole(""); setInviteDept("");
  }

  function openManage(user: UserRecord) {
    setManageUser(user); setEditRole(user.role); setEditStatus(user.status);
  }

  function handleSaveManage() {
    if (!manageUser) return;
    setUsers((prev) => prev.map((u) => u.id === manageUser.id ? { ...u, role: editRole, status: editStatus } : u));
    setToast({ message: `${manageUser.name}'s access updated.`, type: "success" });
    setManageUser(null);
  }

  async function handleResetPassword() {
    if (!manageUser) return;
    const result = await sendPasswordResetAction(manageUser.email);
    if (result.success) {
      setToast({ message: `Password reset link sent to ${manageUser.email}.`, type: "success" });
    } else {
      setToast({ message: result.error ?? "Failed to send reset link.", type: "error" });
    }
  }

  function handleDeactivate() {
    if (!manageUser) return;
    setUsers((prev) => prev.map((u) => u.id === manageUser.id ? { ...u, status: "Inactive" } : u));
    setToast({ message: `${manageUser.name}'s account deactivated.`, type: "info" });
    setManageUser(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="User Access Management"
        description="Staff accounts, roles, and access control."
        action={<Button onClick={() => setShowInvite(true)}>+ Invite User</Button>}
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="font-bold text-slate-900">All Users <span className="text-sm font-normal text-slate-400">({users.length})</span></h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-8 text-center sm:px-5 sm:py-10">
            <p className="text-sm font-medium text-slate-500">No records yet.</p>
            <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 p-3 md:hidden">
            {users.map((row) => (
              <Card key={row.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[row.status]}`}>{row.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <MobileMeta label="Role" value={row.role} />
                  <MobileMeta label="Department" value={row.department} />
                  <MobileMeta label="Last Login" value={row.lastLogin} />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => openManage(row)}>Manage</Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Name", "Email", "Role", "Department", "Status", "Last Login", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-5 py-3 text-slate-500">{row.email}</td>
                    <td className="px-5 py-3 text-slate-600">{row.role}</td>
                    <td className="px-5 py-3 text-slate-600">{row.department}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>{row.status}</span></td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{row.lastLogin}</td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant="outline" onClick={() => openManage(row)}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {/* Invite user modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite New User">
        <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input required value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Staff full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@gcmc.local" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
              <select required value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={inputCls}>
                <option value="">Select role…</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
              <select required value={inviteDept} onChange={(e) => setInviteDept(e.target.value)} className={inputCls}>
                <option value="">Select dept…</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowInvite(false)}>Cancel</Button>
          <Button size="md" type="submit" form="invite-form">Send Invitation</Button>
        </ModalFooter>
      </Modal>

      {/* Manage user modal */}
      {manageUser && (
        <Modal open={true} onClose={() => setManageUser(null)} title={`Manage — ${manageUser.name}`}>
            <div className="space-y-3 text-sm sm:space-y-4">
            <p className="text-slate-500">{manageUser.email} · {manageUser.department}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className={inputCls}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as UserStatus)} className={inputCls}>
                <option>Active</option>
                <option>Suspended</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <button type="button" onClick={handleResetPassword} className="text-sm font-medium text-[var(--accent)] hover:underline">
                Send Password Reset Link →
              </button>
            </div>
            <div>
              <button type="button" onClick={handleDeactivate} className="text-sm font-medium text-red-600 hover:underline">
                Deactivate Account →
              </button>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setManageUser(null)}>Cancel</Button>
            <Button size="md" onClick={handleSaveManage}>Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
