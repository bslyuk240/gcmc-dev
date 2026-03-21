"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import {
  addOnboarding, updateOnboardingStep,
  addOffboarding, updateOffboardingStep,
  addStaffMember, updateStaffSystemAccess,
  type OnboardingRecord, type OffboardingRecord, type StaffDepartment, type ContractType,
} from "@/lib/data/hr-store";
import { createStaffAccountAction } from "@/server/actions/hr/create-staff-account";
import { fetchNonClinicalUnits } from "@/lib/supabase/db";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type { RoleKey } from "@/lib/auth/session";
import { DEFAULT_DOCTOR_SPECIALTIES } from "@/lib/utils/doctor-routing";

// Display name → DB key
const DEPT_OPTIONS: { label: string; value: DBDepartmentKey }[] = [
  { label: "Doctors",            value: "doctors"      },
  { label: "Nurses",             value: "nurses"       },
  { label: "Pharmacy",           value: "pharmacy"     },
  { label: "Lab",                value: "lab"          },
  { label: "Front Desk",         value: "frontdesk"    },
  { label: "Accounts",           value: "accounts"     },
  { label: "Store",              value: "store"        },
  { label: "HR",                 value: "hr"           },
  { label: "IT",                 value: "it"           },
  { label: "Admin",              value: "admin"        },
  { label: "Non-Clinical Staff", value: "non_clinical" },
  { label: "NHIS",               value: "nhis"         },
];

const ROLE_OPTIONS: { label: string; value: RoleKey }[] = [
  { label: "Admin",                value: "admin"              },
  { label: "Head of Department",   value: "hod"                },
  { label: "HR Manager",           value: "hr_manager"         },
  { label: "HR Staff",             value: "hr_staff"           },
  { label: "Doctor",               value: "doctor"             },
  { label: "Nurse",                value: "nurse"              },
  { label: "Pharmacist",           value: "pharmacist"         },
  { label: "Pharmacy Assistant",   value: "pharmacy_assistant" },
  { label: "Lab Scientist",        value: "lab_scientist"      },
  { label: "Accountant",           value: "accountant"         },
  { label: "Front Desk Staff",     value: "front_desk_staff"   },
  { label: "Store Keeper",         value: "store_keeper"       },
  { label: "IT Staff",             value: "it_staff"           },
  { label: "Non-Clinical Staff",   value: "non_clinical_staff" },
  { label: "NHIS Officer",         value: "nhis_officer"       },
  { label: "NHIS Manager",         value: "nhis_manager"       },
  { label: "Viewer",               value: "viewer"             },
];

/** Roles that make sense for non-clinical staff */
const NC_ROLE_OPTIONS: { label: string; value: RoleKey }[] = [
  { label: "Non-Clinical Staff", value: "non_clinical_staff" },
  { label: "Head of Department", value: "hod"                },
  { label: "Viewer",             value: "viewer"             },
];

const CONTRACT_TYPES = ["Permanent", "Contract", "Locum", "Intern"];

const ONB_STATUS_STYLES: Record<string, string> = {
  Initiated:    "bg-slate-100 text-slate-600",
  "IT Pending": "bg-sky-50 text-sky-700 font-bold",
  "IT Done":    "bg-violet-50 text-violet-700",
  Orientation:  "bg-amber-50 text-amber-700",
  Completed:    "bg-emerald-50 text-emerald-700",
};

const OFF_STATUS_STYLES: Record<string, string> = {
  Initiated:            "bg-slate-100 text-slate-600",
  "IT Revoke Pending":  "bg-red-50 text-red-700 font-bold",
  "IT Revoked":         "bg-amber-50 text-amber-700",
  Clearance:            "bg-sky-50 text-sky-700",
  Completed:            "bg-emerald-50 text-emerald-700",
};

export default function OnboardingPage() {
  const { onboarding, offboarding, staff } = useHRStore();
  const [tab, setTab] = useState<"onboarding" | "offboarding">("onboarding");
  const [showNewHire, setShowNewHire] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showStepModal, setShowStepModal] = useState<OnboardingRecord | null>(null);
  const [showOffModal, setShowOffModal] = useState<OffboardingRecord | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New hire form
  const [nhName,     setNhName]     = useState("");
  const [nhDept,     setNhDept]     = useState<DBDepartmentKey>("doctors");
  const [nhRole,     setNhRole]     = useState<RoleKey>("doctor");
  const [nhUnit,     setNhUnit]     = useState("");
  const [nhSpecialty,setNhSpecialty]= useState("");
  const [nhContract, setNhContract] = useState("Permanent");
  const [nhEmail,    setNhEmail]    = useState("");
  const [nhPhone,    setNhPhone]    = useState("");
  const [nhSalary,   setNhSalary]   = useState("");
  const [nhStart,    setNhStart]    = useState("");

  // Non-clinical units (loaded when non_clinical dept is selected)
  const [ncUnits, setNcUnits] = useState<{ id: string; name: string }[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    if (nhDept === "non_clinical") {
      setLoadingUnits(true);
      fetchNonClinicalUnits().then((units) => {
        setNcUnits(units);
        if (units.length > 0 && !nhUnit) setNhUnit(units[0].name);
        setLoadingUnits(false);
      });
      // Default role to non_clinical_staff
      setNhRole("non_clinical_staff");
    } else {
      setNhUnit("");
    }
    if (nhDept !== "doctors") {
      setNhSpecialty("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nhDept]);

  // Credentials modal
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [creating, setCreating] = useState(false);

  // Exit form
  const [exitStaffId, setExitStaffId] = useState("");
  const [exitReason,  setExitReason]  = useState<"Resignation" | "Retirement" | "Termination" | "Contract End">("Resignation");
  const [exitDate,    setExitDate]    = useState("");

  async function handleNewHire() {
    if (!nhName || !nhEmail) return;
    if (nhDept === "doctors" && !nhSpecialty.trim()) {
      setToast({ message: "Doctor specialty is required for registration.", type: "error" });
      return;
    }
    setCreating(true);

    // 1. Create Supabase Auth user + staff_profiles row
    const result = await createStaffAccountAction({
      full_name:  nhName,
      email:      nhEmail,
      department: nhDept,
      role:       nhRole,
      ...(nhDept === "non_clinical" && nhUnit ? { unit_name: nhUnit } : {}),
      ...(nhDept === "doctors" && nhSpecialty.trim() ? { specialty: nhSpecialty.trim() } : {}),
    });

    if (!result.success) {
      setToast({ message: `Account creation failed: ${result.error}`, type: "error" });
      setCreating(false);
      return;
    }

    // 2. Add to local HR workflow store
    const id       = `EMP-${Date.now().toString().slice(-5)}`;
    const itReqId  = `IT-ONB-${Date.now().toString().slice(-4)}`;
    const deptLabel = (DEPT_OPTIONS.find((d) => d.value === nhDept)?.label ?? "Doctors") as StaffDepartment;
    const roleLabel = ROLE_OPTIONS.find((r) => r.value === nhRole)?.label ?? nhRole;

    addStaffMember({
      id, name: nhName, department: deptLabel, role: roleLabel,
      contractType: nhContract as ContractType, email: nhEmail,
      phone: nhPhone, joinDate: nhStart || new Date().toLocaleDateString("en-GB"),
      status: "Probation", salary: parseInt(nhSalary || "0"),
      systemAccessCreated: true,
      ...(nhSpecialty.trim() ? { specialty: nhSpecialty.trim() } : {}),
      ...(nhUnit ? { unit: nhUnit } : {}),
    });

    addOnboarding({
      id: `ONB-${Date.now().toString().slice(-5)}`, staffId: id,
      staffName: nhName, department: deptLabel, role: roleLabel,
      startDate: nhStart || new Date().toLocaleDateString("en-GB"),
      status: "IT Done", itRequestId: itReqId,
      itAccountCreated: true, orientationCompleted: false,
      credentialsVerified: false, contractSigned: true,
      initiatedBy: "HR Manager", initiatedAt: new Date().toLocaleDateString("en-GB"),
    });

    setCreating(false);
    setShowNewHire(false);
    setNhName(""); setNhEmail(""); setNhPhone(""); setNhSalary(""); setNhStart(""); setNhUnit(""); setNhSpecialty("");

    // 3. Show credentials to HR (once only)
    setCreatedCreds({ email: nhEmail, password: result.tempPassword });
  }

  function handleExit() {
    if (!exitStaffId) return;
    const member = staff.find((s) => s.id === exitStaffId || s.name === exitStaffId);
    if (!member) { setToast({ message: "Staff member not found.", type: "info" }); return; }
    const itRevokeId = `IT-OFF-${Date.now().toString().slice(-4)}`;
    addOffboarding({
      id: `OFF-${Date.now().toString().slice(-5)}`, staffId: member.id,
      staffName: member.name, department: member.department, role: member.role,
      exitDate, reason: exitReason, status: "IT Revoke Pending",
      itRevokeRequestId: itRevokeId, itAccessRevoked: false,
      equipmentReturned: false, exitInterviewDone: false,
      initiatedBy: "HR Manager", initiatedAt: new Date().toLocaleDateString("en-GB"),
    });
    setToast({ message: `Exit initiated for ${member.name} — IT revocation request ${itRevokeId} raised.`, type: "info" });
    setShowExit(false);
    setExitStaffId("");
  }

  function handleOnbStep(rec: OnboardingRecord, step: "itAccountCreated" | "credentialsVerified" | "orientationCompleted") {
    const updates: Partial<OnboardingRecord> = { [step]: true };
    const allDone = (step === "orientationCompleted")
      || (step === "itAccountCreated"    && rec.credentialsVerified && rec.orientationCompleted)
      || (step === "credentialsVerified" && rec.itAccountCreated    && rec.orientationCompleted);
    if (step === "itAccountCreated") {
      updateStaffSystemAccess(rec.staffId, true);
      updates.status = "IT Done";
    }
    if (allDone) updates.status = "Completed";
    updateOnboardingStep(rec.id, updates);
    setToast({
      message: step === "itAccountCreated"
        ? `IT account created for ${rec.staffName}.`
        : step === "credentialsVerified"
          ? `Credentials verified for ${rec.staffName}.`
          : `Orientation completed for ${rec.staffName}.`,
      type: "success",
    });
    setShowStepModal(null);
  }

  function handleOffStep(rec: OffboardingRecord, step: "itAccessRevoked" | "equipmentReturned" | "exitInterviewDone") {
    const updates: Partial<OffboardingRecord> = { [step]: true };
    if (step === "itAccessRevoked") updates.status = "IT Revoked";
    const willComplete = (step === "exitInterviewDone") && rec.itAccessRevoked && rec.equipmentReturned;
    if (willComplete) updates.status = "Completed";
    updateOffboardingStep(rec.id, updates);
    setToast({
      message: step === "itAccessRevoked"
        ? `IT access revoked for ${rec.staffName}.`
        : step === "equipmentReturned"
          ? `Equipment returned by ${rec.staffName}.`
          : `Exit interview done for ${rec.staffName}.`,
      type: "success",
    });
    setShowOffModal(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Onboarding & Exit" description="Manage new hire onboarding (IT access, credentials, orientation) and staff exit workflows (IT revocation, clearance)." />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowNewHire(true)}>+ New Hire</Button>
          <Button size="sm" variant="outline" onClick={() => setShowExit(true)}>Initiate Exit</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["onboarding", "offboarding"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold capitalize border-b-2 transition ${tab === t ? "border-violet-500 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t === "onboarding" ? "New Hire Onboarding" : "Exit / Offboarding"}
          </button>
        ))}
      </div>

      {tab === "onboarding" && (
        <div className="space-y-4">
          {onboarding.map((o) => (
            <Card key={o.id} className={`p-5 ${o.status === "IT Pending" ? "border-sky-200 border-2" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-slate-900">{o.staffName}</p>
                    <span className="text-xs text-slate-400">·</span>
                    <p className="text-sm text-slate-600">{o.role}</p>
                    <span className="rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-xs font-semibold">{o.department}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Start: {o.startDate} · Initiated by: {o.initiatedBy}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "contractSigned",       label: "Contract Signed",    done: o.contractSigned       },
                      { key: "credentialsVerified",  label: "Credentials Verified", done: o.credentialsVerified },
                      { key: "itAccountCreated",     label: "IT Account",         done: o.itAccountCreated     },
                      { key: "orientationCompleted", label: "Orientation",         done: o.orientationCompleted },
                    ].map((step) => (
                      <div key={step.key} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        <span>{step.done ? "✓" : "○"}</span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                  {o.itRequestId && !o.itAccountCreated && (
                    <p className="text-xs text-sky-700 font-semibold mt-2">IT Request: {o.itRequestId} — awaiting IT confirmation</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ONB_STATUS_STYLES[o.status]}`}>{o.status}</span>
                  {o.status !== "Completed" && (
                    <Button size="sm" variant="outline" onClick={() => setShowStepModal(o)}>Update Steps</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {onboarding.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
              No active onboarding records. Click <strong>+ New Hire</strong> to begin.
            </div>
          )}
        </div>
      )}

      {tab === "offboarding" && (
        <div className="space-y-4">
          {offboarding.map((o) => (
            <Card key={o.id} className={`p-5 ${o.status === "IT Revoke Pending" ? "border-red-200 border-2" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-slate-900">{o.staffName}</p>
                    <span className="text-xs text-slate-400">·</span>
                    <p className="text-sm text-slate-600">{o.role}</p>
                    <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-xs font-semibold">{o.reason}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{o.department} · Exit date: {o.exitDate}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "IT Access Revoked", done: o.itAccessRevoked  },
                      { label: "Equipment Returned", done: o.equipmentReturned },
                      { label: "Exit Interview",     done: o.exitInterviewDone },
                    ].map((step) => (
                      <div key={step.label} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        <span>{step.done ? "✓" : "○"}</span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                  {o.itRevokeRequestId && !o.itAccessRevoked && (
                    <p className="text-xs text-red-700 font-semibold mt-2">IT Revoke Request: {o.itRevokeRequestId} — pending IT action</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${OFF_STATUS_STYLES[o.status]}`}>{o.status}</span>
                  {o.status !== "Completed" && (
                    <Button size="sm" variant="outline" onClick={() => setShowOffModal(o)}>Update Steps</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {offboarding.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
              No exit workflows in progress.
            </div>
          )}
        </div>
      )}

      {/* New Hire Modal */}
      <Modal open={showNewHire} onClose={() => setShowNewHire(false)} title="New Hire Onboarding">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input value={nhName} onChange={(e) => setNhName(e.target.value)} placeholder="e.g. Dr. Amara Osei" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Work Email *</label>
              <input type="email" value={nhEmail} onChange={(e) => setNhEmail(e.target.value)} placeholder="name@gcmc.local" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input value={nhPhone} onChange={(e) => setNhPhone(e.target.value)} placeholder="+234..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department *</label>
              <select value={nhDept} onChange={(e) => setNhDept(e.target.value as DBDepartmentKey)} className={inputCls}>
                {DEPT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">System Role *</label>
              <select value={nhRole} onChange={(e) => setNhRole(e.target.value as RoleKey)} className={inputCls}>
                {(nhDept === "non_clinical" ? NC_ROLE_OPTIONS : ROLE_OPTIONS).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {nhDept === "doctors" && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor Specialty *</label>
                <select value={nhSpecialty} onChange={(e) => setNhSpecialty(e.target.value)} className={inputCls}>
                  <option value="">- Select doctor specialty -</option>
                  {DEFAULT_DOCTOR_SPECIALTIES.map((specialty) => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
            )}
            {nhDept === "non_clinical" && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit *</label>
                {loadingUnits ? (
                  <div className={`${inputCls} text-slate-400`}>Loading units…</div>
                ) : (
                  <select value={nhUnit} onChange={(e) => setNhUnit(e.target.value)} className={inputCls}>
                    {ncUnits.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                    {ncUnits.length === 0 && (
                      <option value="" disabled>No units available — add one in the Non-Clinical Units page</option>
                    )}
                  </select>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contract Type</label>
              <select value={nhContract} onChange={(e) => setNhContract(e.target.value)} className={inputCls}>
                {CONTRACT_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input type="date" value={nhStart} onChange={(e) => setNhStart(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Salary (₦)</label>
              <input type="number" value={nhSalary} onChange={(e) => setNhSalary(e.target.value)} placeholder="e.g. 150000" className={inputCls} />
            </div>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
            A login account will be created in Supabase automatically. A temporary password will be shown once — share it with the new hire immediately.
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowNewHire(false)}>Cancel</Button>
          <Button
            size="md"
            onClick={handleNewHire}
            disabled={!nhName || !nhEmail || (nhDept === "non_clinical" && !nhUnit) || (nhDept === "doctors" && !nhSpecialty) || creating}
          >
            {creating ? "Creating account…" : "Create Account & Start Onboarding"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Credentials Modal — shown once after account creation */}
      <Modal open={!!createdCreds} onClose={() => setCreatedCreds(null)} title="Account Created">
        {createdCreds && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
              Login account created successfully. Share these credentials with the new hire — this is the only time the password will be shown.
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Email</p>
                <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-mono text-slate-900 select-all">{createdCreds.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Temporary Password</p>
                <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-mono text-slate-900 select-all">{createdCreds.password}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">The staff member should change their password after first login.</p>
          </div>
        )}
        <ModalFooter>
          <Button size="md" onClick={() => setCreatedCreds(null)}>Done — I have noted the credentials</Button>
        </ModalFooter>
      </Modal>

      {/* Exit Modal */}
      <Modal open={showExit} onClose={() => setShowExit(false)} title="Initiate Staff Exit">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Name or ID *</label>
            <input value={exitStaffId} onChange={(e) => setExitStaffId(e.target.value)} placeholder="Search by name or ID..." className={inputCls} />
            <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
              {staff.filter((s) =>
                s.status !== "Terminated" && exitStaffId &&
                (s.name.toLowerCase().includes(exitStaffId.toLowerCase()) || s.id.includes(exitStaffId))
              ).map((s) => (
                <button key={s.id} onClick={() => setExitStaffId(s.name)}
                  className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-700">
                  {s.name} — {s.department} · {s.role}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Exit Date</label>
              <input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
              <select value={exitReason} onChange={(e) => setExitReason(e.target.value as OffboardingRecord["reason"])} className={inputCls}>
                {["Resignation", "Retirement", "Termination", "Contract End"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            An IT access revocation request will automatically be raised.
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowExit(false)}>Cancel</Button>
          <Button size="md" onClick={handleExit}>Initiate Exit</Button>
        </ModalFooter>
      </Modal>

      {/* Onboarding Steps Modal */}
      <Modal open={!!showStepModal} onClose={() => setShowStepModal(null)} title={`Onboarding Steps — ${showStepModal?.staffName}`}>
        {showStepModal && (
          <div className="space-y-3">
            {[
              { key: "itAccountCreated"    as const, label: "Mark IT Account Created",   done: showStepModal.itAccountCreated,    note: "Confirm system access was provisioned." },
              { key: "credentialsVerified" as const, label: "Mark Credentials Verified", done: showStepModal.credentialsVerified, note: "Licence/certification documents reviewed by HR." },
              { key: "orientationCompleted" as const, label: "Mark Orientation Complete", done: showStepModal.orientationCompleted, note: "New hire attended hospital orientation." },
            ].map((step) => (
              <div key={step.key} className={`flex items-center justify-between rounded-lg p-3 ${step.done ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}>
                <div>
                  <p className={`text-sm font-semibold ${step.done ? "text-emerald-800" : "text-slate-700"}`}>{step.done ? "✓ " : ""}{step.label}</p>
                  <p className="text-xs text-slate-400">{step.note}</p>
                </div>
                {!step.done && (
                  <Button size="sm" onClick={() => handleOnbStep(showStepModal, step.key)}>Mark Done</Button>
                )}
              </div>
            ))}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowStepModal(null)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Offboarding Steps Modal */}
      <Modal open={!!showOffModal} onClose={() => setShowOffModal(null)} title={`Exit Steps — ${showOffModal?.staffName}`}>
        {showOffModal && (
          <div className="space-y-3">
            {[
              { key: "itAccessRevoked"   as const, label: "Confirm IT Access Revoked",  done: showOffModal.itAccessRevoked,   note: "IT has deactivated all system logins." },
              { key: "equipmentReturned" as const, label: "Confirm Equipment Returned", done: showOffModal.equipmentReturned, note: "Laptop, badge, and equipment returned." },
              { key: "exitInterviewDone" as const, label: "Confirm Exit Interview Done", done: showOffModal.exitInterviewDone, note: "Exit interview completed with HR." },
            ].map((step) => (
              <div key={step.key} className={`flex items-center justify-between rounded-lg p-3 ${step.done ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}>
                <div>
                  <p className={`text-sm font-semibold ${step.done ? "text-emerald-800" : "text-slate-700"}`}>{step.done ? "✓ " : ""}{step.label}</p>
                  <p className="text-xs text-slate-400">{step.note}</p>
                </div>
                {!step.done && (
                  <Button size="sm" onClick={() => handleOffStep(showOffModal, step.key)}>Confirm</Button>
                )}
              </div>
            ))}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowOffModal(null)}>Close</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
