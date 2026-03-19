"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  addWardPatient,
  updateWardPatient,
  type WardPatient,
  type PatientPriority,
} from "@/lib/data/nurses-store";

type Urgency = "CRITICAL" | "HIGH" | "ROUTINE";

const URGENCY_TO_PRIORITY: Record<Urgency, PatientPriority> = {
  CRITICAL: "Critical",
  HIGH: "High",
  ROUTINE: "Stable",
};

const PRIORITY_TO_URGENCY: Record<PatientPriority, Urgency> = {
  Critical: "CRITICAL",
  High: "HIGH",
  Watch: "HIGH",
  Stable: "ROUTINE",
};

const URGENCY_STYLES: Record<Urgency, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-amber-100 text-amber-700",
  ROUTINE: "bg-slate-100 text-slate-700",
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-slate-100 text-slate-600",
  "In Progress": "bg-amber-50 text-amber-700",
  Discharged: "bg-emerald-50 text-emerald-700",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

export default function NursesTriagePage() {
  const { allPatients } = useNursesStore();

  // Only show active Outpatient patients (sent here by front desk)
  const outpatients = allPatients
    .filter((p) => p.unit === "Outpatient" && p.status === "Active")
    .sort((a, b) => {
      const order: Record<PatientPriority, number> = { Critical: 0, High: 1, Watch: 2, Stable: 3 };
      return order[a.priority] - order[b.priority];
    });

  const [filterUrgency, setFilterUrgency] = useState<Urgency | "ALL">("ALL");
  const displayed =
    filterUrgency === "ALL"
      ? outpatients
      : outpatients.filter(
          (p) => PRIORITY_TO_URGENCY[p.priority] === filterUrgency
        );

  // Manual walk-in form
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPatient, setNewPatient] = useState("");
  const [newUrgency, setNewUrgency] = useState<Urgency>("ROUTINE");
  const [newComplaint, setNewComplaint] = useState("");
  const [newDoctor, setNewDoctor] = useState("");

  // Vitals modal
  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [editBP, setEditBP] = useState("");
  const [editPulse, setEditPulse] = useState("");
  const [editTemp, setEditTemp] = useState("");
  const [editSpo2, setEditSpo2] = useState("");

  const [toast, setToast] = useState<ToastData | null>(null);

  function handleAddWalkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatient || !newDoctor) return;
    const now = new Date();
    addWardPatient({
      id: `WP-TR-${Date.now()}`,
      patientName: newPatient,
      patientId: `WALK-${Date.now().toString().slice(-5)}`,
      unit: "Outpatient",
      bed: `OPD-${(Date.now() % 100).toString().padStart(2, "0")}`,
      diagnosis: newComplaint || "Walk-in",
      admittedAt: now.toISOString(),
      assignedNurse: "Triage Nurse",
      priority: URGENCY_TO_PRIORITY[newUrgency],
      status: "Active",
      doctorInCharge: newDoctor,
    });
    setToast({
      message: `${newPatient} added to triage queue (${newUrgency}).`,
      type: "success",
    });
    setShowNewModal(false);
    setNewPatient(""); setNewUrgency("ROUTINE");
    setNewComplaint(""); setNewDoctor("");
  }

  function openVitals(p: WardPatient) {
    setVitalsTarget(p);
    setEditBP(p.vitals?.bp ?? "");
    setEditPulse(p.vitals?.pulse ?? "");
    setEditTemp(p.vitals?.temp ?? "");
    setEditSpo2(p.vitals?.spo2 ?? "");
  }

  function saveVitals(e: React.FormEvent) {
    e.preventDefault();
    if (!vitalsTarget) return;
    const now = new Date().toISOString();
    updateWardPatient(vitalsTarget.id, {
      vitals: { bp: editBP, pulse: editPulse, temp: editTemp, spo2: editSpo2, recordedAt: now, recordedBy: "Triage Nurse" },
      lastVitalsAt: now,
    });
    setToast({ message: `Vitals updated for ${vitalsTarget.patientName}.`, type: "success" });
    setVitalsTarget(null);
  }

  function markWithDoctor(p: WardPatient) {
    updateWardPatient(p.id, { notes: "Sent to doctor" });
    setToast({ message: `${p.patientName} marked as with doctor.`, type: "success" });
  }

  function markDone(p: WardPatient) {
    updateWardPatient(p.id, { status: "Discharged" });
    setToast({ message: `${p.patientName} discharged from triage.`, type: "success" });
  }

  const countFor = (u: Urgency) =>
    outpatients.filter((p) => PRIORITY_TO_URGENCY[p.priority] === u).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Triage Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Patients sent from Front Desk — record vitals, prioritise, and route to doctor.
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>+ Walk-in Entry</Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "CRITICAL", "HIGH", "ROUTINE"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterUrgency(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filterUrgency === f
                ? "bg-[var(--accent)] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "ALL" ? "All Patients" : f}
            <span className="ml-1.5 opacity-70">
              ({f === "ALL" ? outpatients.length : countFor(f)})
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {outpatients.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-lg font-semibold text-slate-500">No patients in queue</p>
          <p className="mt-1 text-sm text-slate-400">
            Patients appear here automatically when Front Desk creates a visit.
          </p>
        </div>
      )}

      {/* Patient table */}
      {outpatients.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["ID", "Priority", "Patient", "Complaint", "Doctor", "BP", "Pulse", "Temp", "SpO₂", "Arrived", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((p) => {
                  const urgency = PRIORITY_TO_URGENCY[p.priority];
                  const arrivedAt = p.admittedAt
                    ? new Date(p.admittedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";
                  const isDone = p.notes === "Sent to doctor";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.patientId}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${URGENCY_STYLES[urgency]}`}>
                          {urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.patientName}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">{p.diagnosis}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.doctorInCharge ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{p.vitals?.bp ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{p.vitals?.pulse ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{p.vitals?.temp ? `${p.vitals.temp}°C` : "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{p.vitals?.spo2 ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{arrivedAt}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[isDone ? "In Progress" : p.status]}`}>
                          {isDone ? "With Doctor" : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openVitals(p)}>
                            Vitals
                          </Button>
                          {!isDone && (
                            <Button size="sm" variant="outline" onClick={() => markWithDoctor(p)}>
                              → Doctor
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => markDone(p)}>
                            Done
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Walk-in modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Walk-in Triage Entry"
        className="max-w-lg"
      >
        <form id="triage-form" onSubmit={handleAddWalkIn} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={newPatient}
                onChange={(e) => setNewPatient(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value as Urgency)}
                className={inputCls}
              >
                <option value="ROUTINE">Routine</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Complaint
            </label>
            <textarea
              rows={2}
              value={newComplaint}
              onChange={(e) => setNewComplaint(e.target.value)}
              placeholder="Presenting complaint…"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Assign Doctor <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={newDoctor}
              onChange={(e) => setNewDoctor(e.target.value)}
              placeholder="e.g. Dr. Mensah"
              className={inputCls}
            />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNewModal(false)}>
            Cancel
          </Button>
          <Button size="md" type="submit" form="triage-form">
            Add to Queue
          </Button>
        </ModalFooter>
      </Modal>

      {/* Vitals modal */}
      {vitalsTarget && (
        <Modal
          open={true}
          onClose={() => setVitalsTarget(null)}
          title={`Vitals — ${vitalsTarget.patientName}`}
        >
          <form id="vitals-form" onSubmit={saveVitals}>
            <p className="mb-4 text-sm text-slate-500">
              Record vital signs. These are saved and visible on the patient record.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Blood Pressure (mmHg)", val: editBP, set: setEditBP, ph: "120/80" },
                { label: "Pulse (bpm)", val: editPulse, set: setEditPulse, ph: "72" },
                { label: "Temperature (°C)", val: editTemp, set: setEditTemp, ph: "37.0" },
                { label: "SpO₂ (%)", val: editSpo2, set: setEditSpo2, ph: "99%" },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                  <input
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setVitalsTarget(null)}>
              Cancel
            </Button>
            <Button size="md" type="submit" form="vitals-form">
              Save Vitals
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
