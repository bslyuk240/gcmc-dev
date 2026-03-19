"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { addWardPatient, updateWardPatient, addNursingProcedure, type WardPatient } from "@/lib/data/nurses-store";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700 font-semibold",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-50 text-emerald-700",
};

export default function NursesEmergencyPage() {
  const { getByUnit, procedures } = useNursesStore();
  const erPatients = getByUnit("Emergency").filter((p) => p.status === "Active");
  const erProcedures = procedures.filter((p) => p.unit === "Emergency");

  const [newPatientModal, setNewPatientModal] = useState(false);
  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [transferTarget, setTransferTarget] = useState<WardPatient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New patient form
  const [name, setName] = useState(""); const [pid, setPid] = useState("");
  const [diagnosis, setDiagnosis] = useState(""); const [priority, setPriority] = useState<WardPatient["priority"]>("High");
  const [doctor, setDoctor] = useState(""); const [nurse, setNurse] = useState("");

  // Vitals
  const [bp, setBp] = useState(""); const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState(""); const [spo2, setSpo2] = useState("");

  function handleAdmitPatient() {
    if (!name || !diagnosis) return;
    addWardPatient({
      id: `WP-ER-${Date.now()}`, patientName: name, patientId: pid || `PT-ER-${Date.now()}`,
      unit: "Emergency", bed: `ER-${erPatients.length + 1}`, diagnosis,
      admittedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      assignedNurse: nurse || "Unassigned", priority,
      status: "Active", doctorInCharge: doctor || undefined,
    });
    setToast({ message: `${name} admitted to Emergency Unit.`, type: "success" });
    setNewPatientModal(false);
    setName(""); setPid(""); setDiagnosis(""); setPriority("High");
  }

  function handleRecordVitals() {
    if (!vitalsTarget || !bp) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    updateWardPatient(vitalsTarget.id, {
      vitals: { bp, pulse, temp, spo2, recordedAt: `${now}`, recordedBy: "Nurse (You)" },
      lastVitalsAt: `${now} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    });
    setToast({ message: `Emergency vitals recorded for ${vitalsTarget.patientName}.`, type: "success" });
    setVitalsTarget(null);
    setBp(""); setPulse(""); setTemp(""); setSpo2("");
  }

  function handleTransfer(target: string) {
    if (!transferTarget) return;
    updateWardPatient(transferTarget.id, {
      unit: target as WardPatient["unit"],
      bed: target === "ICU" ? `ICU-${Math.floor(Math.random() * 4) + 3}` : `${Math.floor(Math.random() * 2) + 5}${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
    });
    setToast({ message: `${transferTarget.patientName} transferred to ${target}.`, type: "info" });
    setTransferTarget(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Unit"
        description="Urgent triage, emergency stabilisation, and rapid coordination with Doctors, Lab, and Pharmacy."
        action={<Button onClick={() => setNewPatientModal(true)}>+ Admit Emergency Patient</Button>}
      />

      {/* Alert bar for critical patients */}
      {erPatients.filter((p) => p.priority === "Critical").length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-red-800">
            CRITICAL: {erPatients.filter((p) => p.priority === "Critical").map((p) => p.patientName).join(", ")} — immediate medical attention required
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3">
        {[
          { label: "Active ER Patients", value: erPatients.length, color: "text-amber-600" },
          { label: "Critical", value: erPatients.filter((p) => p.priority === "Critical").length, color: "text-red-700" },
          { label: "High Priority", value: erPatients.filter((p) => p.priority === "High").length, color: "text-amber-700" },
          { label: "Procedures", value: erProcedures.length, color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ER Patients */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Emergency Patients</h3>
          <div className="flex gap-2">
            <Link href={`${INTERNAL_PREFIX}/lab/test-requests`} className="text-xs font-semibold text-sky-700 border border-sky-200 rounded-lg px-2.5 py-1 hover:bg-sky-50">Lab Tests →</Link>
            <Link href={`${INTERNAL_PREFIX}/pharmacy/inventory`} className="text-xs font-semibold text-violet-700 border border-violet-200 rounded-lg px-2.5 py-1 hover:bg-violet-50">Pharmacy →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Bed", "Patient", "Presenting Complaint", "Doctor", "Vitals", "Priority", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {erPatients.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${p.priority === "Critical" ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-amber-700">{p.bed}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{p.patientName}</p>
                    <p className="text-xs text-slate-400">{p.patientId} · Arrived {p.admittedAt}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">{p.diagnosis}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.doctorInCharge ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.vitals ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium">BP: {p.vitals.bp} · HR: {p.vitals.pulse}</p>
                        <p className="text-slate-400">T: {p.vitals.temp}°C · SpO2: {p.vitals.spo2}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-red-600">⚠ No vitals</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => { setVitalsTarget(p); setBp(""); setPulse(""); setTemp(""); setSpo2(""); }}>
                        Vitals
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setTransferTarget(p)}>Transfer</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {erPatients.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No active emergency patients. Use the button above to admit one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Department coordination reminder */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Urgent Lab Tests", sub: "Order STAT/Urgent tests for ER patients", href: `${INTERNAL_PREFIX}/lab/test-requests`, color: "border-sky-200 bg-sky-50", textColor: "text-sky-800" },
          { label: "Urgent Medications", sub: "Request emergency meds from Pharmacy", href: `${INTERNAL_PREFIX}/nurses/medication-administration`, color: "border-violet-200 bg-violet-50", textColor: "text-violet-800" },
          { label: "Escalate to Doctor", sub: "Consultations queue for urgent review", href: `${INTERNAL_PREFIX}/doctors/queue`, color: "border-amber-200 bg-amber-50", textColor: "text-amber-800" },
        ].map((a) => (
          <Link key={a.label} href={a.href}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${a.color} hover:shadow-sm transition`}>
            <div>
              <p className={`text-sm font-bold ${a.textColor}`}>{a.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{a.sub}</p>
            </div>
            <svg className={`h-4 w-4 ${a.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Admit Patient Modal */}
      <Modal open={newPatientModal} onClose={() => setNewPatientModal(false)} title="Admit Emergency Patient">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Patient ID</label>
              <input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="PT-XXXX (optional)" className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Presenting Complaint / Diagnosis *</label>
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Chest pain, dyspnoea" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as WardPatient["priority"])} className={inputCls}>
                {["Critical", "High", "Watch", "Stable"].map((p) => <option key={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Nurse</label>
              <input value={nurse} onChange={(e) => setNurse(e.target.value)} placeholder="e.g. Nurse Grace" className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Doctor in Charge</label>
            <input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="e.g. Dr. Mensah" className={inputCls} /></div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setNewPatientModal(false)}>Cancel</Button>
          <Button size="md" disabled={!name || !diagnosis} onClick={handleAdmitPatient}>Admit Patient</Button>
        </ModalFooter>
      </Modal>

      {/* Vitals Modal */}
      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title={`Record Vitals — ${vitalsTarget?.patientName}`}>
        {vitalsTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              ⚠ Emergency patient — record vitals immediately and notify doctor if abnormal.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Blood Pressure</label>
                <input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 145/95" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Pulse (bpm)</label>
                <input value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="e.g. 110" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Temperature (°C)</label>
                <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 39.5" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">SpO2 (%)</label>
                <input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="e.g. 94%" className={inputCls} /></div>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setVitalsTarget(null)}>Cancel</Button>
          <Button size="md" disabled={!bp} onClick={handleRecordVitals}>Save Emergency Vitals</Button>
        </ModalFooter>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title={`Transfer — ${transferTarget?.patientName}`}>
        {transferTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">Transfer <strong>{transferTarget.patientName}</strong> from Emergency to:</p>
            <div className="grid grid-cols-2 gap-3">
              {["Ward", "ICU"].map((unit) => (
                <button key={unit} onClick={() => handleTransfer(unit)}
                  className={`rounded-xl border-2 px-4 py-4 text-center font-bold transition hover:shadow-md ${unit === "ICU" ? "border-red-300 bg-red-50 text-red-700 hover:border-red-400" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400"}`}>
                  {unit === "ICU" ? "ICU" : "Ward / Inpatient"}
                </button>
              ))}
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setTransferTarget(null)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
