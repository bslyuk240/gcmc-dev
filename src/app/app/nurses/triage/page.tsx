"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";

type Urgency = "CRITICAL" | "HIGH" | "ROUTINE";
type Entry = { id: string; urgency: Urgency; patient: string; complaint: string; doctor: string; bp: string; pulse: string; temp: string; spo2: string; time: string; status: "Waiting" | "In Progress" | "Done" };

const INITIAL: Entry[] = [
  { id: "TRG-001", urgency: "CRITICAL", patient: "Kofi Mensah", complaint: "Severe chest pain, short of breath", doctor: "Dr. Kwame Mensah", bp: "160/100", pulse: "110", temp: "37.8", spo2: "92%", time: "10:05", status: "In Progress" },
  { id: "TRG-002", urgency: "HIGH", patient: "Yaw Darko", complaint: "Compound fracture – right arm", doctor: "Dr. Amaka Osei", bp: "120/80", pulse: "88", temp: "37.1", spo2: "98%", time: "10:20", status: "Waiting" },
  { id: "TRG-003", urgency: "ROUTINE", patient: "Ama Owusu", complaint: "Persistent migraine and dizziness", doctor: "Dr. Chen", bp: "118/76", pulse: "72", temp: "36.9", spo2: "99%", time: "10:40", status: "Waiting" },
];

const URGENCY_STYLES: Record<Urgency, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-amber-100 text-amber-700",
  ROUTINE: "bg-slate-100 text-slate-700",
};

const DOCTORS = ["Dr. Amaka Osei", "Dr. Kwame Mensah", "Dr. Chen", "Dr. Robert Smith", "Dr. Emily White"];

export default function NursesTriagePage() {
  const [entries, setEntries] = useState<Entry[]>(INITIAL);
  const [filterUrgency, setFilterUrgency] = useState<Urgency | "ALL">("ALL");
  const [showNewModal, setShowNewModal] = useState(false);
  const [vitalsTarget, setVitalsTarget] = useState<Entry | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New entry form state
  const [newPatient, setNewPatient] = useState("");
  const [newUrgency, setNewUrgency] = useState<Urgency>("ROUTINE");
  const [newComplaint, setNewComplaint] = useState("");
  const [newDoctor, setNewDoctor] = useState("");
  const [newBP, setNewBP] = useState(""); const [newPulse, setNewPulse] = useState("");
  const [newTemp, setNewTemp] = useState(""); const [newSpo2, setNewSpo2] = useState("");

  // Vitals edit state
  const [editBP, setEditBP] = useState(""); const [editPulse, setEditPulse] = useState("");
  const [editTemp, setEditTemp] = useState(""); const [editSpo2, setEditSpo2] = useState("");

  const displayed = filterUrgency === "ALL" ? entries : entries.filter((e) => e.urgency === filterUrgency);

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatient || !newDoctor) return;
    const entry: Entry = {
      id: `TRG-${String(entries.length + 4).padStart(3, "0")}`,
      urgency: newUrgency,
      patient: newPatient,
      complaint: newComplaint,
      doctor: newDoctor,
      bp: newBP || "—", pulse: newPulse || "—", temp: newTemp || "—", spo2: newSpo2 || "—",
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      status: "Waiting",
    };
    setEntries((prev) => [entry, ...prev]);
    setToast({ message: `${newPatient} added to triage queue (${newUrgency}).`, type: "success" });
    setShowNewModal(false);
    setNewPatient(""); setNewUrgency("ROUTINE"); setNewComplaint(""); setNewDoctor("");
    setNewBP(""); setNewPulse(""); setNewTemp(""); setNewSpo2("");
  }

  function openVitals(entry: Entry) {
    setVitalsTarget(entry);
    setEditBP(entry.bp === "—" ? "" : entry.bp);
    setEditPulse(entry.pulse === "—" ? "" : entry.pulse);
    setEditTemp(entry.temp === "—" ? "" : entry.temp);
    setEditSpo2(entry.spo2 === "—" ? "" : entry.spo2);
  }

  function saveVitals(e: React.FormEvent) {
    e.preventDefault();
    if (!vitalsTarget) return;
    setEntries((prev) => prev.map((en) => en.id === vitalsTarget.id
      ? { ...en, bp: editBP || "—", pulse: editPulse || "—", temp: editTemp || "—", spo2: editSpo2 || "—" }
      : en,
    ));
    setToast({ message: `Vitals updated for ${vitalsTarget.patient}.`, type: "success" });
    setVitalsTarget(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Triage Queue</h1>
          <p className="mt-1 text-sm text-slate-500">Record vitals, prioritise patients, and update doctor queue readiness.</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ New Triage Entry</Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "CRITICAL", "HIGH", "ROUTINE"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterUrgency(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${filterUrgency === f ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {f === "ALL" ? "All Patients" : f}
            <span className="ml-1.5 opacity-70">({f === "ALL" ? entries.length : entries.filter((e) => e.urgency === f).length})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["ID", "Urgency", "Patient", "Complaint", "Doctor", "BP", "Pulse", "Temp", "SpO2", "Time", "Status", "Action"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${URGENCY_STYLES[row.urgency]}`}>{row.urgency}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.patient}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{row.complaint}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.doctor}</td>
                  <td className="px-4 py-3 text-slate-700">{row.bp}</td>
                  <td className="px-4 py-3 text-slate-700">{row.pulse}</td>
                  <td className="px-4 py-3 text-slate-700">{row.temp}°C</td>
                  <td className="px-4 py-3 text-slate-700">{row.spo2}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{row.time}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.status === "In Progress" ? "bg-amber-50 text-amber-700" : row.status === "Done" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openVitals(row)}>Record vitals</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* New triage entry modal */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Triage Entry" className="max-w-2xl">
        <form id="triage-form" onSubmit={handleAddEntry} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name <span className="text-red-500">*</span></label>
              <input required value={newPatient} onChange={(e) => setNewPatient(e.target.value)} placeholder="Full name" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency Level <span className="text-red-500">*</span></label>
              <select value={newUrgency} onChange={(e) => setNewUrgency(e.target.value as Urgency)} className={inputCls}>
                <option value="ROUTINE">Routine</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Complaint</label>
            <textarea rows={2} value={newComplaint} onChange={(e) => setNewComplaint(e.target.value)} placeholder="Presenting complaint…" className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assign Doctor <span className="text-red-500">*</span></label>
            <select required value={newDoctor} onChange={(e) => setNewDoctor(e.target.value)} className={inputCls}>
              <option value="">Select doctor…</option>
              {DOCTORS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[{ label: "BP (mmHg)", val: newBP, set: setNewBP, ph: "120/80" }, { label: "Pulse (bpm)", val: newPulse, set: setNewPulse, ph: "72" }, { label: "Temp (°C)", val: newTemp, set: setNewTemp, ph: "37.0" }, { label: "SpO2 (%)", val: newSpo2, set: setNewSpo2, ph: "99%" }].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className={inputCls} />
              </div>
            ))}
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNewModal(false)}>Cancel</Button>
          <Button size="md" type="submit" form="triage-form">Add to Queue</Button>
        </ModalFooter>
      </Modal>

      {/* Vitals modal */}
      {vitalsTarget && (
        <Modal open={true} onClose={() => setVitalsTarget(null)} title={`Vitals — ${vitalsTarget.patient}`}>
          <form id="vitals-form" onSubmit={saveVitals}>
            <p className="mb-4 text-sm text-slate-500">Update vital signs for this triage entry.</p>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Blood Pressure (mmHg)", val: editBP, set: setEditBP, ph: "120/80" }, { label: "Pulse (bpm)", val: editPulse, set: setEditPulse, ph: "72" }, { label: "Temperature (°C)", val: editTemp, set: setEditTemp, ph: "37.0" }, { label: "SpO2 (%)", val: editSpo2, set: setEditSpo2, ph: "99%" }].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className={inputCls} />
                </div>
              ))}
            </div>
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setVitalsTarget(null)}>Cancel</Button>
            <Button size="md" type="submit" form="vitals-form">Save Vitals</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
