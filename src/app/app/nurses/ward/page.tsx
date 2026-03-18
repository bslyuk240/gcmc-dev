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
import { updateWardPatient, addNursingProcedure, type WardPatient } from "@/lib/data/nurses-store";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-amber-50 text-amber-700",
  Stable: "bg-emerald-50 text-emerald-700",
};

const PROCEDURE_TYPES = ["Injection", "Dressing", "IV Access", "Catheter", "Observation", "Wound Care", "Blood Draw", "Procedure", "Other"] as const;
const PROCEDURE_PRICES: Record<string, number> = {
  Injection: 25, Dressing: 20, "IV Access": 30, Catheter: 60, Observation: 15,
  "Wound Care": 40, "Blood Draw": 15, Procedure: 50, Other: 20,
};
const NURSES: string[] = [];

export default function NursesWardPage() {
  const { getByUnit, procedures } = useNursesStore();
  const wardPatients = getByUnit("Ward").filter((p) => p.status === "Active");
  const wardProcedures = procedures.filter((p) => p.unit === "Ward");

  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [procTarget, setProcTarget] = useState<WardPatient | null>(null);
  const [dischargeTarget, setDischargeTarget] = useState<WardPatient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Vitals form
  const [bp, setBp] = useState(""); const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState(""); const [spo2, setSpo2] = useState("");
  const [vitalsNurse, setVitalsNurse] = useState(NURSES[0]);

  // Procedure form
  const [procType, setProcType] = useState<typeof PROCEDURE_TYPES[number]>("Injection");
  const [procDesc, setProcDesc] = useState("");
  const [procNurse, setProcNurse] = useState(NURSES[0]);

  function handleRecordVitals() {
    if (!vitalsTarget || !bp || !pulse) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    updateWardPatient(vitalsTarget.id, {
      vitals: { bp, pulse, temp, spo2, recordedAt: `${now} AM`, recordedBy: vitalsNurse },
      lastVitalsAt: `${now} · Mar 15`,
    });
    setToast({ message: `Vitals recorded for ${vitalsTarget.patientName}.`, type: "success" });
    setVitalsTarget(null);
    setBp(""); setPulse(""); setTemp(""); setSpo2("");
  }

  function handleAddProcedure() {
    if (!procTarget) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    addNursingProcedure({
      id: `NP-${Date.now()}`,
      patientName: procTarget.patientName,
      patientId: procTarget.patientId,
      unit: "Ward",
      procedureType: procType,
      description: procDesc || `${procType} — ${procTarget.patientName}`,
      performedBy: procNurse,
      performedAt: `${now} · Mar 15, 2026`,
      amount: PROCEDURE_PRICES[procType],
      billStatus: "Pending",
    });
    setToast({ message: `${procType} recorded for ${procTarget.patientName}. Charge sent to Accounts.`, type: "success" });
    setProcTarget(null);
    setProcDesc("");
  }

  function handleDischarge() {
    if (!dischargeTarget) return;
    updateWardPatient(dischargeTarget.id, { status: "Discharged" });
    setToast({ message: `${dischargeTarget.patientName} discharged from Ward.`, type: "info" });
    setDischargeTarget(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader title="Ward / Inpatient Unit" description="Admitted patient care, bed monitoring, medication administration, and nursing observations." />

      {/* Unit stats */}
      <div className="flex gap-3">
        {[
          { label: "Admitted Patients", value: wardPatients.length, color: "text-emerald-700" },
          { label: "On Watch", value: wardPatients.filter((p) => p.priority === "Watch").length, color: "text-amber-600" },
          { label: "Meds Scheduled", value: wardPatients.reduce((s, p) => s + (p.medsScheduled ?? 0), 0), color: "text-violet-700" },
          { label: "Procedures Today", value: wardProcedures.length, color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Patients table */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Ward Patients</h3>
          <Link href={`${INTERNAL_PREFIX}/nurses/medication-administration`} className="text-sm font-semibold text-accent hover:underline">
            Medication Administration →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Bed", "Patient", "Diagnosis", "Nurse", "Last Vitals", "Priority", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wardPatients.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${p.priority === "Critical" ? "bg-red-50/20" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{p.bed}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{p.patientName}</p>
                    <p className="text-xs text-slate-400">{p.patientId} · {p.admittedAt}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px]">{p.diagnosis}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.assignedNurse}</td>
                  <td className="px-4 py-3">
                    {p.vitals ? (
                      <div className="text-xs">
                        <p className="font-medium text-slate-700">BP: {p.vitals.bp} · HR: {p.vitals.pulse}</p>
                        <p className="text-slate-400">T: {p.vitals.temp}°C · SpO2: {p.vitals.spo2}</p>
                        <p className="text-slate-400">{p.vitals.recordedAt}</p>
                      </div>
                    ) : <span className="text-xs text-amber-600 font-semibold">Not recorded</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => { setVitalsTarget(p); setBp(""); setPulse(""); setTemp(""); setSpo2(""); setVitalsNurse(NURSES[0]); }}>
                        Vitals
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setProcTarget(p); setProcDesc(""); setProcType("Injection"); setProcNurse(NURSES[0]); }}>
                        Procedure
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDischargeTarget(p)}>Discharge</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {wardPatients.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No admitted patients in Ward.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent ward procedures */}
      {wardProcedures.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Ward Procedures Today</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {wardProcedures.map((proc) => (
              <div key={proc.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${proc.billStatus === "Pending" ? "bg-amber-400" : "bg-emerald-400"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{proc.patientName} — {proc.procedureType}</p>
                  <p className="text-xs text-slate-400">{proc.description} · {proc.performedBy} · {proc.performedAt}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-900">₦{proc.amount}</p>
                  <span className={`text-xs ${proc.billStatus === "Pending" ? "text-amber-600" : "text-emerald-700"}`}>{proc.billStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Record Vitals Modal */}
      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title={`Record Vitals — ${vitalsTarget?.patientName}`}>
        {vitalsTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p><span className="text-slate-500">Bed:</span> <strong>{vitalsTarget.bed}</strong> · <span className="text-slate-500">Diagnosis:</span> {vitalsTarget.diagnosis}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Blood Pressure (mmHg)</label>
                <input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 120/80" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Pulse (bpm)</label>
                <input value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="e.g. 78" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Temperature (°C)</label>
                <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 36.8" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">SpO2 (%)</label>
                <input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="e.g. 98%" className={inputCls} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Recorded By</label>
              <select value={vitalsNurse} onChange={(e) => setVitalsNurse(e.target.value)} className={inputCls}>
                {NURSES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setVitalsTarget(null)}>Cancel</Button>
          <Button size="md" disabled={!bp || !pulse} onClick={handleRecordVitals}>Save Vitals</Button>
        </ModalFooter>
      </Modal>

      {/* Procedure Modal */}
      <Modal open={!!procTarget} onClose={() => setProcTarget(null)} title={`Record Procedure — ${procTarget?.patientName}`}>
        {procTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p><span className="text-slate-500">Patient:</span> <strong>{procTarget.patientName}</strong> · <span className="text-slate-500">Bed:</span> {procTarget.bed}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Procedure Type</label>
              <select value={procType} onChange={(e) => setProcType(e.target.value as typeof PROCEDURE_TYPES[number])} className={inputCls}>
                {PROCEDURE_TYPES.map((t) => <option key={t}>{t} (₦{PROCEDURE_PRICES[t]})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <input value={procDesc} onChange={(e) => setProcDesc(e.target.value)} placeholder="Brief description..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Performed By</label>
              <select value={procNurse} onChange={(e) => setProcNurse(e.target.value)} className={inputCls}>
                {NURSES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
              ✓ A charge of <strong>₦{PROCEDURE_PRICES[procType]}</strong> will be sent to Accounts automatically.
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setProcTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleAddProcedure}>Record &amp; Bill to Accounts</Button>
        </ModalFooter>
      </Modal>

      {/* Discharge Modal */}
      <Modal open={!!dischargeTarget} onClose={() => setDischargeTarget(null)} title="Discharge Patient">
        {dischargeTarget && (
          <p className="text-sm text-slate-700">Discharge <strong>{dischargeTarget.patientName}</strong> from Bed <strong>{dischargeTarget.bed}</strong>? This will mark them as discharged from the ward.</p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setDischargeTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleDischarge}>Confirm Discharge</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
