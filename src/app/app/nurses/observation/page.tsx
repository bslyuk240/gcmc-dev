"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";

type ObsEntry = {
  id: string;
  patientId: string;
  patientName: string;
  unit: string;
  bed: string;
  observation: string;
  actionTaken: string;
  nurse: string;
  time: string;
  flag: "Normal" | "Concern" | "Urgent";
};

const FLAG_STYLES: Record<string, string> = {
  Normal: "bg-emerald-50 text-emerald-700",
  Concern: "bg-amber-50 text-amber-700",
  Urgent: "bg-red-50 text-red-700 font-bold",
};

const NURSES = ["Nurse Patricia", "Nurse Grace", "Nurse Sandra", "Nurse Tom", "Nurse Ama"];

const INITIAL_OBS: ObsEntry[] = [
  { id: "OBS-001", patientId: "PT-8236", patientName: "Kofi Mensah", unit: "ICU", bed: "ICU-1",
    observation: "SpO2 dropped to 89% at 09:00. Patient visibly distressed, accessory muscle use noted.",
    actionTaken: "O2 increased to 4L/min. Dr. Mensah notified. Suction performed. Patient now SpO2 92%.",
    nurse: "Nurse Sandra", time: "09:15 AM · Mar 15, 2026", flag: "Urgent" },
  { id: "OBS-002", patientId: "PT-8235", patientName: "Ama Owusu", unit: "Ward", bed: "3B",
    observation: "Post-op wound site clean, no signs of infection. Mild tenderness on palpation.",
    actionTaken: "Wound dressing changed. Tramadol 50mg IV given as charted for pain.",
    nurse: "Nurse Grace", time: "09:00 AM · Mar 15, 2026", flag: "Normal" },
  { id: "OBS-003", patientId: "PT-8231", patientName: "Yaw Darko", unit: "Ward", bed: "4B",
    observation: "Temperature 38.4°C, persistent cough, SpO2 94%. Patient complaining of chest tightness.",
    actionTaken: "Dr. Osei notified. Nebuliser ordered. IV antibiotics continued as charted.",
    nurse: "Nurse Patricia", time: "07:50 AM · Mar 15, 2026", flag: "Concern" },
];

export default function NursesObservationPage() {
  const { allPatients } = useNursesStore();
  const [obs, setObs] = useState<ObsEntry[]>(INITIAL_OBS);
  const [showAdd, setShowAdd] = useState(false);
  const [filterFlag, setFilterFlag] = useState<"All" | "Normal" | "Concern" | "Urgent">("All");
  const [toast, setToast] = useState<ToastData | null>(null);

  const [selPatient, setSelPatient] = useState("");
  const [observation, setObservation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [flag, setFlag] = useState<ObsEntry["flag"]>("Normal");
  const [obsNurse, setObsNurse] = useState(NURSES[0]);

  function handleAdd() {
    if (!selPatient || !observation) return;
    const patient = allPatients.find((p) => p.id === selPatient);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setObs([{
      id: `OBS-${Date.now()}`,
      patientId: patient?.patientId ?? selPatient,
      patientName: patient?.patientName ?? selPatient,
      unit: patient?.unit ?? "Ward",
      bed: patient?.bed ?? "—",
      observation, actionTaken,
      nurse: obsNurse,
      time: `${now} · Mar 15, 2026`,
      flag,
    }, ...obs]);
    setToast({ message: "Observation recorded.", type: "success" });
    setShowAdd(false);
    setObservation(""); setActionTaken(""); setFlag("Normal");
  }

  const filtered = filterFlag === "All" ? obs : obs.filter((o) => o.flag === filterFlag);
  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Observation"
        description="Nursing observations across all units — flag concerns, record actions taken, and escalate to doctors."
        action={<Button onClick={() => setShowAdd(true)}>+ Add Observation</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Urgent Flags", value: obs.filter((o) => o.flag === "Urgent").length, color: "text-red-700", bg: "bg-red-50" },
          { label: "Concerns", value: obs.filter((o) => o.flag === "Concern").length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Normal", value: obs.filter((o) => o.flag === "Normal").length, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} className={`p-5 ${s.bg} border-0`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Observation Log</h3>
          <div className="flex gap-1.5">
            {(["All", "Urgent", "Concern", "Normal"] as const).map((f) => (
              <button key={f} onClick={() => setFilterFlag(f)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${filterFlag === f ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((o) => (
            <div key={o.id} className={`px-5 py-4 ${o.flag === "Urgent" ? "bg-red-50/30" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{o.patientName}</span>
                    <span className="font-mono text-xs text-slate-400">{o.bed}</span>
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{o.unit}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${FLAG_STYLES[o.flag]}`}>{o.flag}</span>
                  </div>
                  <p className="text-sm text-slate-700"><span className="font-medium">Obs:</span> {o.observation}</p>
                  {o.actionTaken && <p className="text-sm text-slate-600"><span className="font-medium text-emerald-700">Action:</span> {o.actionTaken}</p>}
                  <p className="text-xs text-slate-400">{o.nurse} · {o.time}</p>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No observations found.</div>
          )}
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Observation">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Patient *</label>
            <select value={selPatient} onChange={(e) => setSelPatient(e.target.value)} className={inputCls}>
              <option value="">— Select patient —</option>
              {allPatients.filter((p) => p.status === "Active").map((p) => (
                <option key={p.id} value={p.id}>{p.patientName} ({p.unit} · {p.bed})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observation *</label>
            <textarea rows={3} value={observation} onChange={(e) => setObservation(e.target.value)}
              placeholder="Describe what was observed..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Action Taken</label>
            <textarea rows={2} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)}
              placeholder="What action was taken in response?" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Flag Level</label>
              <select value={flag} onChange={(e) => setFlag(e.target.value as ObsEntry["flag"])} className={inputCls}>
                {["Normal", "Concern", "Urgent"].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nurse</label>
              <select value={obsNurse} onChange={(e) => setObsNurse(e.target.value)} className={inputCls}>
                {NURSES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="md" disabled={!selPatient || !observation} onClick={handleAdd}>Save Observation</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
