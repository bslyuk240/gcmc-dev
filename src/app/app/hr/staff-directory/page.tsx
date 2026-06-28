"use client";

import { useEffect, useState } from "react";
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
import {
  createHrStaffDocument,
  fetchHrStaffDocuments,
  fetchStaffDocumentDownloadUrl,
} from "@/lib/hr/client";
import { insertStaffMember } from "@/lib/supabase/db";
import { DEFAULT_DOCTOR_SPECIALTIES } from "@/lib/utils/doctor-routing";
import type { StaffDocument } from "@/modules/staff-portal/types";

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

const DOCUMENT_CATEGORIES = ["Contract", "Certificate", "Letter", "Policy", "Training", "Other"];

const DOCUMENT_STATUS_STYLES: Record<StaffDocument["status"], string> = {
  Valid: "text-emerald-600",
  "Expiring Soon": "font-semibold text-amber-600",
  Expired: "font-semibold text-red-600",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

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
  const [editPhone, setEditPhone] = useState("");
  const [editHomeAddress, setEditHomeAddress] = useState("");
  const [staffDocuments, setStaffDocuments] = useState<StaffDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsSaving, setDocumentsSaving] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Contract");
  const [docIssuedOn, setDocIssuedOn] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFileInputKey, setDocFileInputKey] = useState(0);

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
  const [addHomeAddress, setAddHomeAddress] = useState("");

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const displayStaffId = formatStaffDisplayId({ id: s.id, name: s.name, department: s.department }).toLowerCase();
    const matchSearch  = !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || displayStaffId.includes(q) || (s.roleKey ?? "").includes(q);
    const matchDept    = deptFilter   === "All" || s.department === deptFilter;
    const matchStatus  = statusFilter === "All" || s.status     === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  useEffect(() => {
    if (!viewStaff) {
      setStaffDocuments([]);
      return;
    }

    let cancelled = false;
    setDocumentsLoading(true);
    fetchHrStaffDocuments(viewStaff.id)
      .then((documents) => {
        if (!cancelled) setStaffDocuments(documents);
      })
      .catch((error) => {
        if (!cancelled) {
          setStaffDocuments([]);
          showToast(error instanceof Error ? error.message : "Could not load staff documents.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewStaff]);

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
    setEditPhone(s.phone ?? "");
    setEditHomeAddress(s.homeAddress ?? "");
    resetDocumentForm();
  }

  function resetDocumentForm() {
    setDocTitle("");
    setDocCategory("Contract");
    setDocIssuedOn("");
    setDocExpiryDate("");
    setDocNotes("");
    setDocFile(null);
    setDocFileInputKey((key) => key + 1);
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
      phone: editPhone,
      homeAddress: editHomeAddress || undefined,
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
        homeAddress: addHomeAddress || undefined,
        joinDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        status: "Active",
        salary: parseInt(addSalary || "3000"),
        systemAccessCreated: false,
      });
    showToast(`${addName} added to ${addDept}. Raise onboarding in HR → Onboarding.`, "success");
    setShowAdd(false);
    setAddName(""); setAddDept("Doctors"); setAddRoleKey("doctor");
    setAddJobTitle(""); setAddUnit(""); setAddSpecialty(""); setAddEmail(""); setAddPhone(""); setAddSalary("");
    setAddHomeAddress("");
  }

  function handleSuspendToggle() {
    if (!viewStaff) return;
    const newStatus = viewStaff.status === "Suspended" ? "Active" : "Suspended";
    updateStaffStatus(viewStaff.id, newStatus);
    showToast(`${viewStaff.name} ${newStatus === "Suspended" ? "suspended" : "reinstated"}.`, "info");
    setViewStaff(null);
  }

  async function handleCreateDocument() {
    if (!viewStaff) return;
    if (!docTitle.trim()) {
      showToast("Document title is required.", "error");
      return;
    }

    setDocumentsSaving(true);
    try {
      const document = await createHrStaffDocument({
        staffId: viewStaff.id,
        title: docTitle.trim(),
        category: docCategory,
        issuedOn: docIssuedOn || undefined,
        expiryDate: docExpiryDate || undefined,
        notes: docNotes.trim() || undefined,
        file: docFile ?? undefined,
      });
      setStaffDocuments((current) => [document, ...current]);
      resetDocumentForm();
      showToast(`${document.title} published to ${viewStaff.name}'s staff portal.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not publish document.", "error");
    } finally {
      setDocumentsSaving(false);
    }
  }

  async function handleDownloadDocument(documentId: string) {
    setDownloadingDocumentId(documentId);
    try {
      const url = await fetchStaffDocumentDownloadUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not open document.", "error");
    } finally {
      setDownloadingDocumentId(null);
    }
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
          <h1 className="text-xl font-bold text-slate-900">Staff Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage all hospital staff members and their information.</p>
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

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((s) => (
          <Card
            key={s.id}
            className={`p-4 ${s.status === "Suspended" ? "border-red-200 bg-red-50/20" : s.status === "Terminated" ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                {getInitials(s.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{s.name}</p>
                    <p className="truncate text-xs text-slate-500">{s.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openView(s)}>
                    View
                  </Button>
                </div>
                {s.roleKey === "hod" && (
                  <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                    HOD
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <MobileMeta label="Staff ID" value={formatStaffDisplayId({ id: s.id, name: s.name, department: s.department })} />
              <MobileMeta label="Department" value={s.department} />
              <MobileMeta label="Role" value={s.roleKey ? `${ROLE_KEY_LABELS[s.roleKey]} · ${s.role}` : s.role} />
              <MobileMeta label="Unit" value={s.unit ?? "-"} />
              <MobileMeta label="Contract" value={s.contractType} />
              <MobileMeta label="Access" value={s.systemAccessCreated ? "Active" : "Pending IT"} />
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status]}`}>{s.status}</span>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-400">No staff found matching your filters.</Card>
        )}
      </div>

      {/* Table */}
      <Card className="hidden overflow-hidden p-0 md:block">
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
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {[
                  { label: "Staff ID",       value: viewStaff.id },
                  { label: "Department",     value: viewStaff.department },
                  { label: "Unit",           value: viewStaff.unit || "—" },
                  { label: "Specialty",      value: viewStaff.specialty || "—" },
                  { label: "Contract",       value: viewStaff.contractType },
                  { label: "Email",          value: viewStaff.email },
                  { label: "Phone",          value: viewStaff.phone || "—" },
                  { label: "Home Address",   value: viewStaff.homeAddress || "—" },
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

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {[
                  { label: "Bank", value: viewStaff.bankName || "—" },
                  { label: "Account", value: viewStaff.bankAccount || "—" },
                  { label: "Tax ID", value: viewStaff.taxId || "—" },
                  { label: "Pension No.", value: viewStaff.pensionNumber || "—" },
                  { label: "NHF No.", value: viewStaff.nhfNumber || "—" },
                  { label: "Emergency Contact", value: viewStaff.emergencyContactName || "—" },
                  { label: "Contact Phone", value: viewStaff.emergencyContactPhone || "—" },
                  { label: "Contact Relationship", value: viewStaff.emergencyContactRelationship || "—" },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{row.label}</p>
                    <p className="font-semibold text-slate-800">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Staff Documents</p>
                    <p className="text-xs text-slate-500">Publish contracts, certificates, letters, and policies to the staff portal.</p>
                  </div>
                  {documentsLoading && <span className="text-xs text-slate-400">Loading...</span>}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Document Title *</label>
                    <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Employment contract" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
                    <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className={inputCls}>
                      {DOCUMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">File</label>
                    <input
                      key={docFileInputKey}
                      type="file"
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Issued On</label>
                    <input type="date" value={docIssuedOn} onChange={(e) => setDocIssuedOn(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Expiry Date</label>
                    <input type="date" value={docExpiryDate} onChange={(e) => setDocExpiryDate(e.target.value)} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">HR Notes</label>
                    <textarea
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      rows={2}
                      placeholder="Optional internal context for this document"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={handleCreateDocument} disabled={documentsSaving || !docTitle.trim()}>
                    {documentsSaving ? "Publishing..." : "Publish Document"}
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  {staffDocuments.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">{doc.title}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{doc.category}</span>
                          <span className={`text-xs ${DOCUMENT_STATUS_STYLES[doc.status]}`}>{doc.status}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {doc.issuedOn ? `Issued ${doc.issuedOn}` : "Issued date not set"}
                          {doc.expiryDate ? ` - Expires ${doc.expiryDate}` : ""}
                          {doc.fileName ? ` - ${doc.fileName}` : ""}
                        </p>
                      </div>
                      {doc.storagePath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDownloadDocument(doc.id)}
                          disabled={downloadingDocumentId === doc.id}
                        >
                          {downloadingDocumentId === doc.id ? "Opening..." : "Download"}
                        </Button>
                      )}
                    </div>
                  ))}
                  {!documentsLoading && staffDocuments.length === 0 && (
                    <div className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                      No HR documents have been published for this staff member.
                    </div>
                  )}
                </div>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                  <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Home Address</label>
                  <input value={editHomeAddress} onChange={(e) => setEditHomeAddress(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll & Emergency Details</p>
                <p className="text-xs text-slate-500">
                  Managed by Accounts HOD and used for payroll generation and staff records. HR can view the current values here but should not edit them.
                </p>
              </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            {/* Home Address */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Home Address</label>
              <input value={addHomeAddress} onChange={(e) => setAddHomeAddress(e.target.value)} placeholder="Residential address" className={inputCls} />
            </div>

            {/* Salary */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Monthly Salary (₦)</label>
              <input type="number" value={addSalary} onChange={(e) => setAddSalary(e.target.value)} placeholder="3000" className={inputCls} />
            </div>

            <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll & Emergency Details</p>
              <p className="text-xs text-slate-500">
                Managed by Accounts HOD for payroll details and emergency visibility. Use the Accounts staff banking page to update these fields.
              </p>
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
