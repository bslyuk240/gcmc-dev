"use client";

import { useState } from "react";
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
  type OnboardingRecord, type OffboardingRecord,
} from "@/lib/data/hr-store";

const DEPARTMENTS = ["Doctors", "Nurses", "Pharmacy", "Lab", "Front Desk", "Accounts", "Store", "IT", "HR", "Administration"];
const CONTRACT_TYPES = ["Permanent", "Contract", "Locum", "Intern"];

const ONB_STATUS_STYLES: Record<string, string> = {
  Initiated: "bg-slate-100 text-slate-600",
  "IT Pending": "bg-sky-50 text-sky-700 font-bold",
  "IT Done": "bg-violet-50 text-violet-700",
  Orientation: "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const OFF_STATUS_STYLES: Record<string, string> = {
  Initiated: "bg-slate-100 text-slate-600",
  "IT Revoke Pending": "bg-red-50 text-red-700 font-bold",
  "IT Revoked": "bg-amber-50 text-amber-700",
  Clearance: "bg-sky-50 text-sky-700",
  Completed: "bg-emerald-50 text-emerald-700",
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
  const [nhName, setNhName] = useState(""); const [nhDept, setNhDept] = useState("Doctors");
  const [nhRole, setNhRole] = useState(""); const [nhContract, setNhContract] = useState("Permanent");
  const [nhEmail, setNhEmail] = useState(""); const [nhPhone, setNhPhone] = useState("");
  const [nhSalary, setNhSalary] = useState(""); const [nhStart, setNhStart] = useState("Mar 15, 2026");

  // Exit form
  const [exitStaffId, setExitStaffId] = useState(""); const [exitReason, setExitReason] = useState<"Resignation" | "Retirement" | "Termination" | "Contract End">("Resignation");
  const [exitDate, setExitDate] = useState("Mar 31, 2026");

  function handleNewHire() {
    if (!nhName || !nhRole) return;
    const id = `EMP-${Date.now().toString().slice(-5)}`;
    const itReqId = `IT-ONB-${Date.now().toString().slice(-4)}`;
    addStaffMember({
      id, name: nhName, department: nhDept as any, role: nhRole,
      contractType: nhContract as any, email: nhEmail || `${nhName.toLowerCase().replace(/ /g, ".")}@gcmc.local`,
      phone: nhPhone, joinDate: nhStart, status: "Probation",
      salary: parseInt(nhSalary || "3000"), systemAccessCreated: false,
    });
    addOnboarding({
      id: `ONB-${Date.now().toString().slice(-5)}`, staffId: id,
      staffName: nhName, department: nhDept as any, role: nhRole,
      startDate: nhStart, status: "IT Pending", itRequestId: itReqId,
      itAccountCreated: false, orientationCompleted: false,
      credentialsVerified: false, contractSigned: true,
      initiatedBy: "HR Manager", initiatedAt: "Mar 15, 2026",
    });
    setToast({ message: `${nhName} onboarding started — IT access request ${itReqId} raised.`, type: "success" });
    setShowNewHire(false);
    setNhName(""); setNhRole(""); setNhEmail(""); setNhPhone(""); setNhSalary("");
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
      initiatedBy: "HR Manager", initiatedAt: "Mar 15, 2026",
    });
    setToast({ message: `Exit initiated for ${member.name} — IT revocation request ${itRevokeId} raised.`, type: "info" });
    setShowExit(false);
    setExitStaffId("");
  }

  function handleOnbStep(rec: OnboardingRecord, step: "itAccountCreated" | "credentialsVerified" | "orientationCompleted") {
    const updates: Partial<OnboardingRecord> = { [step]: true };
    const allDone = (step === "orientationCompleted")
      || (step === "itAccountCreated" && rec.credentialsVerified && rec.orientationCompleted)
      || (step === "credentialsVerified" && rec.itAccountCreated && rec.orientationCompleted);
    if (step === "itAccountCreated") {
      updateStaffSystemAccess(rec.staffId, true);
      updates.status = "IT Done";
    }
    if (allDone || step === "orientationCompleted") updates.status = "Completed";
    updateOnboardingStep(rec.id, updates);
    setToast({ message: `${step === "itAccountCreated" ? "IT account created" : step === "credentialsVerified" ? "Credentials verified" : "Orientation completed"} for ${rec.staffName}.`, type: "success" });
    setShowStepModal(null);
  }

  function handleOffStep(rec: OffboardingRecord, step: "itAccessRevoked" | "equipmentReturned" | "exitInterviewDone") {
    const updates: Partial<OffboardingRecord> = { [step]: true };
    if (step === "itAccessRevoked") updates.status = "IT Revoked";
    const willComplete = (step === "exitInterviewDone") && rec.itAccessRevoked && rec.equipmentReturned;
    if (willComplete) updates.status = "Completed";
    updateOffboardingStep(rec.id, updates);
    setToast({ message: `${step === "itAccessRevoked" ? "IT access revoked" : step === "equipmentReturned" ? "Equipment returned" : "Exit interview done"} for ${rec.staffName}.`, type: "success" });
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

                  {/* Progress steps */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "contractSigned", label: "Contract Signed", done: o.contractSigned },
                      { key: "credentialsVerified", label: "Credentials Verified", done: o.credentialsVerified },
                      { key: "itAccountCreated", label: "IT Account", done: o.itAccountCreated },
                      { key: "orientationCompleted", label: "Orientation", done: o.orientationCompleted },
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
                      { label: "IT Access Revoked", done: o.itAccessRevoked },
                      { label: "Equipment Returned", done: o.equipmentReturned },
                      { label: "Exit Interview", done: o.exitInterviewDone },
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
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label><input value={nhName} onChange={(e) => setNhName(e.target.value)} placeholder="Dr. / Nurse / Staff..." className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Department *</label>
              <select value={nhDept} onChange={(e) => setNhDept(e.target.value)} className={inputCls}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label><input value={nhRole} onChange={(e) => setNhRole(e.target.value)} placeholder="e.g. Staff Nurse" className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Contract Type</label>
              <select value={nhContract} onChange={(e) => setNhContract(e.target.value)} className={inputCls}>
                {CONTRACT_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Email</label><input value={nhEmail} onChange={(e) => setNhEmail(e.target.value)} placeholder="auto-generated if empty" className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label><input value={nhPhone} onChange={(e) => setNhPhone(e.target.value)} placeholder="+233..." className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label><input value={nhStart} onChange={(e) => setNhStart(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Salary (₦)</label><input type="number" value={nhSalary} onChange={(e) => setNhSalary(e.target.value)} placeholder="e.g. 5000" className={inputCls} /></div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            An IT access request will automatically be raised when this onboarding is submitted.
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowNewHire(false)}>Cancel</Button>
          <Button size="md" onClick={handleNewHire} disabled={!nhName || !nhRole}>Start Onboarding</Button>
        </ModalFooter>
      </Modal>

      {/* Exit Modal */}
      <Modal open={showExit} onClose={() => setShowExit(false)} title="Initiate Staff Exit">
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Staff Name or ID *</label>
            <input value={exitStaffId} onChange={(e) => setExitStaffId(e.target.value)} placeholder="Search by name or ID..." className={inputCls} />
            <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
              {staff.filter((s) => s.status !== "Terminated" && exitStaffId && (s.name.toLowerCase().includes(exitStaffId.toLowerCase()) || s.id.includes(exitStaffId))).map((s) => (
                <button key={s.id} onClick={() => setExitStaffId(s.name)}
                  className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-700">
                  {s.name} — {s.department} · {s.role}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Exit Date</label><input value={exitDate} onChange={(e) => setExitDate(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
              <select value={exitReason} onChange={(e) => setExitReason(e.target.value as any)} className={inputCls}>
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
              { key: "itAccountCreated" as const, label: "Mark IT Account Created", done: showStepModal.itAccountCreated, note: "This will confirm system access was provisioned by IT." },
              { key: "credentialsVerified" as const, label: "Mark Credentials Verified", done: showStepModal.credentialsVerified, note: "Licence/certification documents reviewed by HR." },
              { key: "orientationCompleted" as const, label: "Mark Orientation Complete", done: showStepModal.orientationCompleted, note: "New hire attended hospital orientation session." },
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
              { key: "itAccessRevoked" as const, label: "Confirm IT Access Revoked", done: showOffModal.itAccessRevoked, note: "IT has deactivated all system logins and access." },
              { key: "equipmentReturned" as const, label: "Confirm Equipment Returned", done: showOffModal.equipmentReturned, note: "Laptop, badge, and hospital equipment returned." },
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
