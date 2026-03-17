"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import {
  updateStaffStatus,
  setDepartmentHead,
  updateStaffRole,
  ROLE_KEY_LABELS,
  DEPT_ROLE_KEYS,
  DEPT_UNITS,
  type StaffDepartment,
  type StaffMember,
  type RoleKeyValue,
} from "@/lib/data/hr-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_ORDER: StaffDepartment[] = [
  "Doctors", "Nurses", "Pharmacy", "Lab", "Front Desk",
  "Accounts", "Store", "IT", "HR", "Administration",
];

const DEPT_META: Record<StaffDepartment, { icon: string; color: string; description: string }> = {
  Doctors:        { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "text-violet-600 bg-violet-50", description: "Consultants, GPs, and specialists providing clinical care." },
  Nurses:         { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", color: "text-pink-600 bg-pink-50", description: "Nursing staff across Ward, ICU, Emergency, and Outpatient." },
  Pharmacy:       { icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", color: "text-emerald-600 bg-emerald-50", description: "Pharmacists and pharmacy technicians managing medication." },
  Lab:            { icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", color: "text-sky-600 bg-sky-50", description: "Lab scientists and technicians running diagnostic tests." },
  "Front Desk":   { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "text-amber-600 bg-amber-50", description: "Receptionists and patient records officers." },
  Accounts:       { icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z", color: "text-teal-600 bg-teal-50", description: "Accountants, cashiers, and finance officers." },
  Store:          { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", color: "text-orange-600 bg-orange-50", description: "Store managers and keepers managing supplies." },
  IT:             { icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2", color: "text-cyan-600 bg-cyan-50", description: "IT support, systems admins, and network engineers." },
  HR:             { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-indigo-600 bg-indigo-50", description: "HR officers managing hospital workforce records." },
  Administration: { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "text-slate-600 bg-slate-50", description: "Administrative staff and department heads." },
};

const STATUS_STYLES: Record<string, string> = {
  Active:       "bg-emerald-50 text-emerald-700",
  "On Leave":   "bg-amber-50   text-amber-700",
  Suspended:    "bg-red-50     text-red-700 font-bold",
  Terminated:   "bg-slate-100  text-slate-500",
  Probation:    "bg-violet-50  text-violet-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepartmentStaffingPage() {
  const { staff, getDeptHead } = useHRStore();

  const [activeDept, setActiveDept] = useState<StaffDepartment>("Doctors");
  const [toast,      setToast]      = useState<ToastData | null>(null);

  // ── Status update modal ────────────────────────────────────────────────────
  const [statusModal,  setStatusModal]  = useState<StaffMember | null>(null);
  const [newStatus,    setNewStatus]    = useState<string>("");
  const [statusNote,   setStatusNote]   = useState("");

  // ── HOD assignment modal ───────────────────────────────────────────────────
  const [hodModalOpen,    setHodModalOpen]    = useState(false);
  const [hodSelectedId,   setHodSelectedId]   = useState("");
  const [hodConfirmOpen,  setHodConfirmOpen]  = useState(false);

  // ── Role edit modal ────────────────────────────────────────────────────────
  const [roleModal,   setRoleModal]   = useState<StaffMember | null>(null);
  const [editRoleKey, setEditRoleKey] = useState<RoleKeyValue>("doctor");
  const [editJobTitle,setEditJobTitle]= useState("");

  const deptStaff  = staff.filter((s) => s.department === activeDept);
  const meta       = DEPT_META[activeDept];
  const currentHod = getDeptHead(activeDept);
  const departmentRows = [DEPT_ORDER.slice(0, 5), DEPT_ORDER.slice(5, 10)];

  // ─────────────────────────────────────────────────────────────────────────

  function handleStatusUpdate() {
    if (!statusModal || !newStatus) return;
    updateStaffStatus(statusModal.id, newStatus as StaffMember["status"], statusNote);
    setToast({ message: `${statusModal.name}'s status updated to ${newStatus}.`, type: "success" });
    setStatusModal(null); setStatusNote("");
  }

  function openHodModal() {
    // Pre-select current HOD if one exists
    setHodSelectedId(currentHod?.staffId ?? "");
    setHodModalOpen(true);
  }

  function handleHodConfirm() {
    const selectedStaff = deptStaff.find((s) => s.id === hodSelectedId);
    if (!selectedStaff) return;
    setDepartmentHead(activeDept, hodSelectedId, "HR Manager");
    setToast({
      message: `${selectedStaff.name} assigned as HOD for ${activeDept}. HOD permissions applied.`,
      type: "success",
    });
    setHodModalOpen(false);
    setHodConfirmOpen(false);
    setHodSelectedId("");
  }

  function openRoleEdit(s: StaffMember) {
    setRoleModal(s);
    setEditRoleKey(s.roleKey ?? DEPT_ROLE_KEYS[s.department][0]);
    setEditJobTitle(s.role);
  }

  function handleRoleSave() {
    if (!roleModal) return;
    updateStaffRole(roleModal.id, editRoleKey, editJobTitle || undefined);
    setToast({ message: `${roleModal.name}'s role updated.`, type: "success" });
    setRoleModal(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Staffing"
        description="View and manage staff headcount across all departments. Assign HODs, update roles, and monitor compliance."
      />

      {/* Department picker */}
      <div className="space-y-3">
        {departmentRows.map((row, rowIndex) => (
          <div key={`dept-row-${rowIndex}`} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {row.map((dept) => {
              const members = staff.filter((s) => s.department === dept);
              const active  = members.filter((s) => s.status === "Active").length;
              const meta    = DEPT_META[dept];
              const isActive = activeDept === dept;
              return (
                <button key={dept} onClick={() => setActiveDept(dept)}
                  className={`flex min-h-[108px] w-full flex-col justify-between rounded-xl border-2 p-3 text-left transition ${isActive ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${meta?.color ?? "bg-slate-100 text-slate-600"}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                  </div>
                  <p className="text-xs font-bold leading-tight text-slate-900">{dept}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{active}/{members.length} active</p>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        {/* Staff table */}
        <div className="min-w-0">
          <Card className="h-full overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta?.color ?? "bg-slate-100 text-slate-600"}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d={meta?.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeDept} Staff</h3>
                  <p className="text-xs text-slate-400">{meta?.description}</p>
                </div>
              </div>
              <Link href={`${INTERNAL_PREFIX}/hr/onboarding`}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                + Onboard New Staff
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Staff ID", "Name", "System Role", "Unit", "Contract", "Access", "Status", "Actions"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptStaff.map((s) => {
                    const isHod = s.id === currentHod?.staffId;
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 ${s.status === "Suspended" ? "bg-red-50/20" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="whitespace-nowrap font-semibold text-slate-900">{s.name}</p>
                            {isHod && (
                              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700">HOD</span>
                            )}
                          </div>
                          {s.role && (
                            <p className="mt-0.5 text-[10px] text-slate-400">{s.role}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.roleKey ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {ROLE_KEY_LABELS[s.roleKey]}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{s.unit ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.contractType === "Permanent" ? "bg-emerald-50 text-emerald-700" : s.contractType === "Contract" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {s.contractType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.systemAccessCreated
                            ? <span className="text-xs font-bold text-emerald-600">✓ Active</span>
                            : <span className="text-xs font-bold text-amber-600">Pending IT</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => openRoleEdit(s)}>Role</Button>
                            <Button size="sm" variant="ghost"   onClick={() => { setStatusModal(s); setNewStatus(s.status); }}>Status</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {deptStaff.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-400">No staff in {activeDept} yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-24">
          {/* HOD card */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Head of Dept</h3>
              <Button size="sm" variant="outline" onClick={openHodModal}>
                {currentHod ? "Change" : "Assign"}
              </Button>
            </div>

            {currentHod ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-200 text-lg font-bold text-violet-800">
                    {currentHod.staffName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-violet-900">{currentHod.staffName}</p>
                    <p className="text-xs text-violet-600">{currentHod.roleLabel}</p>
                    <p className="text-[10px] text-violet-400 mt-0.5">Since {currentHod.assignedOn}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-violet-100/60 px-2.5 py-2 text-[11px] text-violet-700">
                  <p className="font-semibold mb-0.5">HOD Permissions include:</p>
                  <p>· Create &amp; edit department rota</p>
                  <p>· Approve leave requests</p>
                  <p>· View department reports</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center">
                <p className="text-xs font-semibold text-slate-500">No HOD assigned</p>
                <p className="mt-1 text-[11px] text-slate-400">Click Assign to set a head for {activeDept}.</p>
              </div>
            )}
          </Card>

          {/* Dept summary */}
          <Card className="p-5">
            <h3 className="mb-3 font-bold text-slate-900">Dept Summary</h3>
            {["Active", "On Leave", "Probation", "Suspended", "Terminated"].map((st) => {
              const count = deptStaff.filter((s) => s.status === st).length;
              if (count === 0 && st !== "Active") return null;
              return (
                <div key={st} className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
                  <span className="text-xs text-slate-600">{st}</span>
                  <span className={`text-sm font-bold ${st === "Active" ? "text-emerald-700" : st === "Suspended" ? "text-red-700" : "text-slate-700"}`}>
                    {count}
                  </span>
                </div>
              );
            })}

            {/* Units breakdown */}
            {DEPT_UNITS[activeDept] && (
              <>
                <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">By Unit</p>
                {DEPT_UNITS[activeDept]!.map((unit) => {
                  const count = deptStaff.filter((s) => s.unit === unit).length;
                  return (
                    <div key={unit} className="flex items-center justify-between py-1">
                      <span className="text-xs text-slate-600">{unit}</span>
                      <span className="text-xs font-semibold text-slate-700">{count}</span>
                    </div>
                  );
                })}
              </>
            )}
          </Card>

          {/* Licence alerts */}
          {deptStaff.filter((s) => s.licenseExpiry?.includes("2026")).length > 0 && (
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-bold text-amber-700">Licence Alerts</h3>
              {deptStaff.filter((s) => s.licenseExpiry?.includes("2026")).map((s) => (
                <div key={s.id} className="mb-2 text-xs">
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="text-amber-600">Expires: {s.licenseExpiry}</p>
                </div>
              ))}
            </Card>
          )}

          <Link href={`${INTERNAL_PREFIX}/hr/payroll`}
            className="block rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-center text-xs font-semibold text-teal-800 transition hover:bg-teal-100">
            Payroll for {activeDept} →
          </Link>
        </div>
      </div>

      {/* ── HOD Assignment Modal ─────────────────────────────────────────── */}
      <Modal open={hodModalOpen} onClose={() => { setHodModalOpen(false); setHodSelectedId(""); }}
        title={`Assign Head of Department — ${activeDept}`}>
        <div className="space-y-4">
          {currentHod && (
            <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
              <span className="font-bold">Current HOD:</span>
              <span>{currentHod.staffName}</span>
              <span className="text-violet-400">— selecting a new HOD will demote them</span>
            </div>
          )}

          <p className="text-sm text-slate-600">
            Select an active staff member from <strong>{activeDept}</strong> to become the Head of Department.
            They will automatically receive HOD permissions: rota management, leave approvals, and department reports.
          </p>

          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {deptStaff
              .filter((s) => s.status === "Active" || s.status === "Probation")
              .map((s) => {
                const isCurrentHod = s.id === currentHod?.staffId;
                const isSelected   = s.id === hodSelectedId;
                return (
                  <button key={s.id} onClick={() => setHodSelectedId(s.id)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 ${isSelected ? "bg-violet-50" : ""}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        {isCurrentHod && (
                          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700">HOD</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {s.roleKey ? ROLE_KEY_LABELS[s.roleKey] : s.role}
                        {s.unit && ` · ${s.unit}`}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-sm font-bold text-violet-600">✓</span>
                    )}
                  </button>
                );
              })}
            {deptStaff.filter((s) => s.status === "Active" || s.status === "Probation").length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No active staff in {activeDept}.</p>
            )}
          </div>

          {hodSelectedId && hodSelectedId !== currentHod?.staffId && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>{deptStaff.find((s) => s.id === hodSelectedId)?.name}</strong> will be assigned as HOD.
              {currentHod && <> <strong>{currentHod.staffName}</strong> will be demoted to their previous role.</>}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => { setHodModalOpen(false); setHodSelectedId(""); }}>Cancel</Button>
          <Button size="md" disabled={!hodSelectedId || hodSelectedId === currentHod?.staffId} onClick={handleHodConfirm}>
            Confirm HOD Assignment
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Role Edit Modal ──────────────────────────────────────────────── */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)}
        title={`Edit Role — ${roleModal?.name}`}>
        {roleModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Department</span><strong>{roleModal.department}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Current System Role</span>
                <span>{roleModal.roleKey ? ROLE_KEY_LABELS[roleModal.roleKey] : "—"}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">System Role (RBAC)</label>
              <select value={editRoleKey} onChange={(e) => setEditRoleKey(e.target.value as RoleKeyValue)} className={inputCls}>
                {DEPT_ROLE_KEYS[roleModal.department].map((k) => (
                  <option key={k} value={k}>{ROLE_KEY_LABELS[k]}</option>
                ))}
              </select>
              {editRoleKey === "hod" && (
                <p className="mt-1 text-[11px] font-semibold text-violet-600">
                  Assigning HOD role here updates this staff member's system permissions.
                  To formally track the HOD assignment, use the "Assign HOD" button in the sidebar.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Job Title (display)</label>
              <input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)}
                placeholder="e.g. Senior Doctor, Charge Nurse" className={inputCls} />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setRoleModal(null)}>Cancel</Button>
          <Button size="md" onClick={handleRoleSave}>Save Role</Button>
        </ModalFooter>
      </Modal>

      {/* ── Status Update Modal ──────────────────────────────────────────── */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)}
        title={`Update Status — ${statusModal?.name}`}>
        {statusModal && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Department</span><strong>{statusModal.department}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Role</span><span>{statusModal.role}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Current Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[statusModal.status]}`}>{statusModal.status}</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">New Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={inputCls}>
                {["Active", "On Leave", "Probation", "Suspended", "Terminated"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Reason for status change…" className={inputCls} />
            </div>
            {newStatus === "Terminated" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                Termination will trigger IT account revocation and the offboarding process.
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setStatusModal(null)}>Cancel</Button>
          <Button size="md" onClick={handleStatusUpdate}>Update Status</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
