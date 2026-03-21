"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import {
  addStaffMember,
  replaceStaffMember,
  updateStaffStatus,
  ROLE_KEY_LABELS,
  DEPT_ROLE_KEYS,
  DEPT_UNITS,
  type StaffMember,
  type StaffDepartment,
  type RoleKeyValue,
} from "@/lib/data/hr-store";
import { formatStaffDisplayId } from "@/lib/staff-id";
import { insertStaffMember } from "@/lib/supabase/db";
import { DEFAULT_DOCTOR_SPECIALTIES } from "@/lib/utils/doctor-routing";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS: StaffDepartment[] = [
  "Doctors", "Nurses", "Pharmacy", "Lab", "Front Desk",
  "Accounts", "Store", "IT", "HR", "NHIS", "Administration", "Non-Clinical Staff",
];

const DEPT_COLORS: Record<string, string> = {
  Doctors: "bg-violet-50 text-violet-700", Nurses: "bg-pink-50 text-pink-700",
  Pharmacy: "bg-emerald-50 text-emerald-700", Lab: "bg-sky-50 text-sky-700",
  "Front Desk": "bg-amber-50 text-amber-700", Accounts: "bg-teal-50 text-teal-700",
  Store: "bg-orange-50 text-orange-700", IT: "bg-cyan-50 text-cyan-700",
  HR: "bg-indigo-50 text-indigo-700", Administration: "bg-slate-100 text-slate-700",
  NHIS: "bg-cyan-50 text-cyan-700",
  "Non-Clinical Staff": "bg-lime-50 text-lime-700",
};

const ROLE_KEY_COLORS: Partial<Record<RoleKeyValue, string>> = {
  hod:                "bg-violet-100 text-violet-800",
  admin:              "bg-rose-100   text-rose-800",
  hr_manager:         "bg-indigo-100 text-indigo-800",
  doctor:             "bg-violet-50  text-violet-700",
  nurse:              "bg-pink-50    text-pink-700",
  pharmacist:         "bg-emerald-50 text-emerald-700",
  pharmacy_assistant: "bg-emerald-50 text-emerald-600",
  lab_scientist:      "bg-sky-50     text-sky-700",
  accountant:         "bg-teal-50    text-teal-700",
  front_desk_staff:   "bg-amber-50   text-amber-700",
  store_keeper:       "bg-orange-50  text-orange-700",
  it_staff:           "bg-cyan-50    text-cyan-700",
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  "On Leave": "bg-amber-50 text-amber-700",
  Suspended: "bg-red-50 text-red-700",
  Terminated: "bg-slate-100 text-slate-400",
  Probation: "bg-violet-50 text-violet-700",
};

function createLocalStaffId() {
  return globalThis.crypto.randomUUID();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDirectoryPage() {
  const { staff } = useHRStore();

  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast,        setToast]        = useState<ToastData | null>(null);

  // ── View / Edit modal ──────────────────────────────────────────────────────
  const [viewStaff,  setViewStaff]  = useState<StaffMember | null>(null);
  const [editMode,   setEditMode]   = useState(false);

  // Edit form fields
  const [editDept,    setEditDept]    = useState<StaffDepartment>("Doctors");
  const [editRoleKey, setEditRoleKey] = useState<RoleKeyValue>("doctor");
  const [editJobTitle,setEditJobTitle]= useState("");
  const [editUnit,    setEditUnit]    = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");

  // ── Add modal ──────────────────────────────────────────────────────────────
  const [showAdd,    setShowAdd]    = useState(false);
  const [addName,    setAddName]    = useState("");
  const [addDept,    setAddDept]    = useState<StaffDepartment>("Doctors");
  const [addRoleKey, setAddRoleKey] = useState<RoleKeyValue>("doctor");
  const [addJobTitle,setAddJobTitle]= useState("");
  const [addUnit,    setAddUnit]    = useState("");
  const [addSpecialty, setAddSpecialty] = useState("");
  const [addEmail,   setAddEmail]   = useState("");
  const [addPhone,   setAddPhone]   = useState("");
  const [addSalary,  setAddSalary]  = useState("");

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const displayStaffId = formatStaffDisplayId({ id: s.id, name: s.name, department: s.department }).toLowerCase();
    const matchSearch  = !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || displayStaffId.includes(q) || (s.roleKey ?? "").includes(q);
    const matchDept    = deptFilter   === "All" || s.department === deptFilter;
    const matchStatus  = statusFilter === "All" || s.status     === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "?";
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openView(s: StaffMember) {
    setViewStaff(s);
    setEditMode(false);
    setEditDept(s.department);
    setEditRoleKey(s.roleKey ?? (DEPT_ROLE_KEYS[s.department][0]));
    setEditJobTitle(s.role);
    setEditUnit(s.unit ?? "");
    setEditSpecialty(s.specialty ?? "");
  }

  async function handleSaveEdit() {
    if (!viewStaff) return;
    if (editDept === "Doctors" && !editSpecialty.trim()) {
      showToast("Doctor specialty is required.", "error");
      return;
    }
    const updatedStaff: StaffMember = {
      ...viewStaff,
      department: editDept,
      unit: editDept === "Doctors" ? (editUnit || undefined) : (editUnit || undefined),
      roleKey: editRoleKey,
      role: editJobTitle || ROLE_KEY_LABELS[editRoleKey],
      specialty: editDept === "Doctors" ? editSpecialty.trim() : undefined,
    };
    try {
      await insertStaffMember(updatedStaff);
      replaceStaffMember(updatedStaff);
      showToast(`${viewStaff.name}'s role and assignment updated.`, "success");
      setViewStaff(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Staff profile update failed.";
      showToast(`Could not save ${viewStaff.name}'s profile: ${message}`, "error");
    }
  }

  function handleAdd() {
    if (!addName) return;
    if (addDept === "Doctors" && !addSpecialty.trim()) {
      showToast("Doctor specialty is required.", "error");
      return;
    }
    const id = createLocalStaffId();
    addStaffMember({
      id, name: addName,
      department: addDept,
      unit: addUnit || undefined,
      specialty: addDept === "Doctors" ? addSpecialty.trim() : undefined,
      role: addJobTitle || ROLE_KEY_LABELS[addRoleKey],
      roleKey: addRoleKey,
      contractType: "Permanent",
      email: addEmail || `${addName.toLowerCase().replace(/\s+/g, ".")}@gcmc.local`,
      phone: addPhone,
      joinDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      status: "Active",
      salary: parseInt(addSalary || "3000"),
      systemAccessCreated: false,
    });
    showToast(`${addName} added to ${addDept}. Raise onboarding in HR → Onboarding.`, "success");
    setShowAdd(false);
    setAddName(""); setAddDept("Doctors"); setAddRoleKey("doctor");
    setAddJobTitle(""); setAddUnit(""); setAddSpecialty(""); setAddEmail(""); setAddPhone(""); setAddSalary("");
  }

  function handleSuspendToggle() {
    if (!viewStaff) return;
    const newStatus = viewStaff.status === "Suspended" ? "Active" : "Suspended";
    updateStaffStatus(viewStaff.id, newStatus);
    showToast(`${viewStaff.name} ${newStatus === "Suspended" ? "suspended" : "reinstated"}.`, "info");
    setViewStaff(null);
  }

  function showToast(message: string, type: ToastData["type"]) {
    setToast({ message, type });
  }

  // When dept changes in add form, reset role key to dept default
  function handleAddDeptChange(dept: StaffDepartment) {
    setAddDept(dept);
    setAddRoleKey(DEPT_ROLE_KEYS[dept][0]);
    setAddUnit("");
    if (dept !== "Doctors") setAddSpecialty("");
  }

  function handleEditDeptChange(dept: StaffDepartment) {
    setEditDept(dept);
    setEditRoleKey(DEPT_ROLE_KEYS[dept][0]);
    setEditUnit("");
    if (dept !== "Doctors") setEditSpecialty("");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff Directory</h1>
          <p className="text-sm text-slate-500">
            All hospital staff across every department —{" "}
            {staff.filter((s) => s.status === "Active").length} active of {staff.length} total.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Staff</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, role, ID, or role key…"
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-violet-400"
        />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400">
          <option>All</option>
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400">
          {["All", "Active", "On Leave", "Probation", "Suspended", "Terminated"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                  {["Staff", "Staff ID Number", "Department", "Role", "Unit", "Contract", "Access", "Status", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50 ${s.status === "Suspended" ? "bg-red-50/20" : s.status === "Terminated" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                        {getInitials(s.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">{s.email}</p>
                        {s.roleKey === "hod" && (
                          <span className="mt-0.5 inline-block rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">HOD</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {formatStaffDisplayId({ id: s.id, name: s.name, department: s.department })}
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DEPT_COLORS[s.department] ?? "bg-slate-100 text-slate-600"}`}>
                      {s.department}
                    </span>
                  </td>

                  {/* Role — shows RBAC key badge + job title below */}
                  <td className="px-4 py-3">
                    {s.roleKey ? (
                      <>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_KEY_COLORS[s.roleKey] ?? "bg-slate-100 text-slate-600"}`}>
                          {ROLE_KEY_LABELS[s.roleKey]}
                        </span>
                        <p className="mt-0.5 text-[10px] text-slate-400">{s.role}</p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">{s.role}</span>
                    )}
                  </td>

                  {/* Unit */}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.unit ?? <span className="text-slate-300">—</span>}
                  </td>

                  {/* Contract */}
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${s.contractType === "Permanent" ? "text-emerald-700" : "text-amber-700"}`}>
                      {s.contractType}
                    </span>
                  </td>

                  {/* System Access */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${s.systemAccessCreated ? "text-emerald-600" : "text-amber-600"}`}>
                      {s.systemAccessCreated ? "✓ Active" : "Pending IT"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => openView(s)}>View</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                    No staff found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── View / Edit Profile Modal ─────────────────────────────────────── */}
      <Modal open={!!viewStaff} onClose={() => { setViewStaff(null); setEditMode(false); }}
        title={editMode ? `Edit Assignment — ${viewStaff?.name}` : (viewStaff?.name ?? "")}>
        {viewStaff && !editMode && (
          <div className="space-y-3">
            {/* Avatar row */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-xl font-bold text-violet-700">
                {viewStaff.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900">{viewStaff.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {viewStaff.roleKey && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_KEY_COLORS[viewStaff.roleKey] ?? "bg-slate-100 text-slate-600"}`}>
                      {ROLE_KEY_LABELS[viewStaff.roleKey]}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{viewStaff.role}</span>
                </div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[viewStaff.status]}`}>
                  {viewStaff.status}
                </span>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Staff ID",       value: viewStaff.id },
                  { label: "Department",     value: viewStaff.department },
                  { label: "Unit",           value: viewStaff.unit || "—" },
                  { label: "Specialty",      value: viewStaff.specialty || "—" },
                  { label: "Contract",       value: viewStaff.contractType },
                  { label: "Email",          value: viewStaff.email },
                  { label: "Phone",          value: viewStaff.phone || "—" },
                { label: "Joined",         value: viewStaff.joinDate },
                { label: "Salary",         value: `₦${viewStaff.salary.toLocaleString()}` },
                { label: "Licence",        value: viewStaff.licenseNumber || "—" },
                { label: "Licence Expiry", value: viewStaff.licenseExpiry || "—" },
                { label: "System Access",  value: viewStaff.systemAccessCreated ? "Active" : "Pending IT" },
              ].map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{row.label}</p>
                  <p className="font-semibold text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>

            {viewStaff.notes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <strong>HR Note:</strong> {viewStaff.notes}
              </div>
            )}
          </div>
        )}

        {viewStaff && editMode && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Update the RBAC system role, department, or unit assignment for{" "}
              <strong>{viewStaff.name}</strong>.
            </p>

            {/* Department */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Department</label>
              <select value={editDept} onChange={(e) => handleEditDeptChange(e.target.value as StaffDepartment)} className={inputCls}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* System Role */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">System Role (RBAC)</label>
              <select value={editRoleKey} onChange={(e) => setEditRoleKey(e.target.value as RoleKeyValue)} className={inputCls}>
                {DEPT_ROLE_KEYS[editDept].map((k) => (
                  <option key={k} value={k}>{ROLE_KEY_LABELS[k]}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                This determines what the staff member can access in the system.
                {editRoleKey === "hod" && (
                  <span className="ml-1 font-semibold text-violet-600">
                    HOD permissions grant: rota management, leave approvals, and department reports.
                  </span>
                )}
              </p>
            </div>

            {/* Job Title */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Job Title (display)</label>
              <input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)}
                placeholder="e.g. Senior Doctor, Charge Nurse" className={inputCls} />
            </div>

            {/* Unit */}
            {DEPT_UNITS[editDept] && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Unit Assignment</label>
                <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className={inputCls}>
                  <option value="">— No specific unit —</option>
                  {DEPT_UNITS[editDept]!.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            )}

            {editDept === "Doctors" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Doctor Specialty</label>
                <select value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} className={inputCls}>
                  <option value="">— Select specialty —</option>
                  {DEFAULT_DOCTOR_SPECIALTIES.map((specialty) => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          {!editMode ? (
            <>
              <Button variant="ghost" size="md" onClick={() => { setViewStaff(null); setEditMode(false); }}>Close</Button>
              <Button variant="outline" size="md" onClick={() => setEditMode(true)}>Edit Role & Assignment</Button>
              {viewStaff && viewStaff.status !== "Terminated" && (
                <Button size="md"
                  className={viewStaff.status === "Suspended" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                  onClick={handleSuspendToggle}>
                  {viewStaff.status === "Suspended" ? "Reinstate" : "Suspend"}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => setEditMode(false)}>Back</Button>
              <Button size="md" onClick={handleSaveEdit}>Save Changes</Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* ── Add Staff Modal ───────────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Staff Member">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name *</label>
              <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" className={inputCls} />
            </div>

            {/* Department */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Department *</label>
              <select value={addDept} onChange={(e) => handleAddDeptChange(e.target.value as StaffDepartment)} className={inputCls}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* System Role */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">System Role (RBAC) *</label>
              <select value={addRoleKey} onChange={(e) => setAddRoleKey(e.target.value as RoleKeyValue)} className={inputCls}>
                {DEPT_ROLE_KEYS[addDept].map((k) => (
                  <option key={k} value={k}>{ROLE_KEY_LABELS[k]}</option>
                ))}
              </select>
            </div>

            {/* Job Title */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Job Title</label>
              <input value={addJobTitle} onChange={(e) => setAddJobTitle(e.target.value)}
                placeholder={ROLE_KEY_LABELS[addRoleKey]} className={inputCls} />
            </div>

            {/* Unit — only if dept has units */}
            {DEPT_UNITS[addDept] ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Unit</label>
                <select value={addUnit} onChange={(e) => setAddUnit(e.target.value)} className={inputCls}>
                  <option value="">— No specific unit —</option>
                  {DEPT_UNITS[addDept]!.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            ) : <div />}

            {addDept === "Doctors" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Doctor Specialty *</label>
                <select value={addSpecialty} onChange={(e) => setAddSpecialty(e.target.value)} className={inputCls}>
                  <option value="">— Select specialty —</option>
                  {DEFAULT_DOCTOR_SPECIALTIES.map((specialty) => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
              <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="auto-generated if blank" className={inputCls} />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
              <input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="+233…" className={inputCls} />
            </div>

            {/* Salary */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Monthly Salary (₦)</label>
              <input type="number" value={addSalary} onChange={(e) => setAddSalary(e.target.value)} placeholder="3000" className={inputCls} />
            </div>
          </div>

          {addRoleKey === "hod" && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
              <strong>HOD Role Selected:</strong> This staff member will have Head of Department permissions (rota, leave approvals, department reports). You can also assign HOD formally from the Department Staffing page.
            </div>
          )}
          <p className="text-xs text-slate-400">
            Full onboarding (IT access, credentials, orientation) managed in <strong>HR → Onboarding & Exit</strong>.
          </p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="md" onClick={handleAdd} disabled={!addName}>Add Staff</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
