"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import {
  addICUVitals,
  type ICUVitalsEntry,
  type WardPatient,
  updateWardPatient,
} from "@/lib/data/nurses-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { insertPatientObservation } from "@/lib/supabase/db";
import { useHMSSession } from "@/modules/rbac/hooks";

const PRIORITY_DOT: Record<string, string> = {
  Critical: "bg-red-500 animate-pulse",
  High: "bg-amber-500",
  Watch: "bg-amber-400",
  Stable: "bg-emerald-400",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasICUAlert(patient: WardPatient, latest?: ICUVitalsEntry) {
  const spo2 = Number.parseInt(latest?.spo2 ?? "", 10);
  const temp = Number.parseFloat(latest?.temp ?? "");
  const gcs = Number.parseInt(latest?.gcs ?? "", 10);

  return (
    patient.priority === "Critical" ||
    (!Number.isNaN(spo2) && spo2 < 90) ||
    (!Number.isNaN(temp) && temp >= 38.5) ||
    (!Number.isNaN(gcs) && gcs < 13)
  );
}

function latestICUReading(entries: ICUVitalsEntry[], patientId: string) {
  return entries.find((entry) => entry.patientId === patientId);
}

export default function NursesICUPage() {
  const { getByUnit, icuVitals } = useNursesStore();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Nurse";
  const icuPatients = getByUnit("ICU").filter((patient) => patient.status === "Active");
  const patientsWithReadings = icuPatients.filter((patient) =>
    icuVitals.some((entry) => entry.patientId === patient.patientId),
  );
  const patientsWithAlerts = icuPatients.filter((patient) =>
    hasICUAlert(patient, latestICUReading(icuVitals, patient.patientId)),
  );
  const sampleFollowUp = icuPatients.filter((patient) => (patient.labTestsOrdered ?? 0) > 0).length;

  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [viewVitals, setViewVitals] = useState<WardPatient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [gcs, setGcs] = useState("");
  const [urine, setUrine] = useState("");
  const [rrRate, setRrRate] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vNurse, setVNurse] = useState("");

  function resetVitalsForm() {
    setBp("");
    setPulse("");
    setTemp("");
    setSpo2("");
    setGcs("");
    setUrine("");
    setRrRate("");
    setVNotes("");
    setVNurse(staffName);
  }

  function handleRecordICUVitals() {
    if (!vitalsTarget || !bp.trim() || !pulse.trim()) return;

    const recordedAt = new Date().toISOString();
    const nurseLabel = vNurse.trim() || staffName;
    const entry: ICUVitalsEntry = {
      id: createLocalId("IV-ICU"),
      patientId: vitalsTarget.patientId,
      patientName: vitalsTarget.patientName,
      bp: bp.trim(),
      pulse: pulse.trim(),
      temp: temp.trim() || "-",
      spo2: spo2.trim() || "-",
      gcs: gcs.trim() || undefined,
      urine: urine.trim() || undefined,
      rrRate: rrRate.trim() || undefined,
      recordedBy: nurseLabel,
      recordedAt,
      notes: vNotes.trim() || undefined,
    };

    addICUVitals(entry);
    updateWardPatient(vitalsTarget.id, {
      vitals: {
        bp: entry.bp,
        pulse: entry.pulse,
        temp: entry.temp,
        spo2: entry.spo2,
        recordedAt,
        recordedBy: nurseLabel,
      },
      assignedNurse: nurseLabel,
      lastVitalsAt: recordedAt,
    });

    void insertPatientObservation({
      id: createLocalId("OBS-ICU"),
      patientId: vitalsTarget.patientId,
      patientName: vitalsTarget.patientName,
      unit: "ICU",
      observation: [
        `ICU vitals recorded: BP ${entry.bp}, Pulse ${entry.pulse}, Temp ${entry.temp}, SpO2 ${entry.spo2}.`,
        entry.gcs ? `GCS ${entry.gcs}.` : null,
        entry.urine ? `Urine ${entry.urine}.` : null,
        entry.rrRate ? `RR ${entry.rrRate}.` : null,
        entry.notes ? `Notes: ${entry.notes}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      recordedBy: nurseLabel,
      recordedAt,
    });

    setToast({ message: `ICU vitals recorded for ${vitalsTarget.patientName}.`, type: "success" });
    setVitalsTarget(null);
    resetVitalsForm();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intensive Care Unit (ICU)"
        description="Critical care monitoring with nurse-safe medication, sample, and handover follow-up."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border border-red-200 bg-red-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-red-500">Critical Patients</p>
          <p className="mt-1 text-4xl font-bold text-red-700">{icuPatients.length}</p>
          <p className="mt-1 text-xs text-slate-500">All require close monitoring</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Vitals Recorded</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">{patientsWithReadings.length}</p>
          <p className="mt-1 text-xs text-slate-500">Patients with saved ICU readings</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Doctor Attention</p>
          <p className="mt-1 text-4xl font-bold text-amber-600">{patientsWithAlerts.length}</p>
          <p className="mt-1 text-xs text-slate-500">Critical or alert-triggered readings</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-600">Sample Follow-Up</p>
          <p className="mt-1 text-4xl font-bold text-sky-700">{sampleFollowUp}</p>
          <p className="mt-1 text-xs text-slate-500">ICU patients with lab work pending</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <Card className="p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">ICU Protocol Reminders</p>
          <ul className="space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Record vitals <strong>every 1 hour</strong> for critical patients
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              Alert doctor <strong>immediately</strong> if SpO2 &lt;90%, BP changes significantly, or GCS drops
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
              Monitor <strong>urine output</strong> hourly and report if &lt;30ml/hr
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              Document all <strong>medications</strong> with exact time and dose
            </li>
          </ul>
        </Card>

        <Card className="space-y-3 p-5">
          <div>
            <h3 className="font-bold text-slate-900">ICU Actions</h3>
            <p className="mt-1 text-sm text-slate-500">Use nurse-safe pages for monitoring, meds, samples, and handover.</p>
          </div>
          {[
            {
              label: "Medication Administration",
              sub: "Record ICU doses and scheduled medications",
              href: `${INTERNAL_PREFIX}/nurses/medication-administration`,
            },
            {
              label: "Sample Collection",
              sub: "Follow ICU lab samples without opening Lab dashboards",
              href: `${INTERNAL_PREFIX}/nurses/sample-collection`,
            },
            {
              label: "Patient Observation",
              sub: "Log observation updates alongside ICU rounds",
              href: `${INTERNAL_PREFIX}/nurses/observation`,
            },
            {
              label: "Handover Notes",
              sub: "Document ICU transfer and shift handover notes",
              href: `${INTERNAL_PREFIX}/nurses/handover-notes`,
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-[var(--accent)]/30 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-500">{action.sub}</p>
              </div>
              <span className="text-slate-300">{"->"}</span>
            </Link>
          ))}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {icuPatients.map((patient) => {
          const patientVitals = icuVitals.filter((entry) => entry.patientId === patient.patientId);
          const latest = patientVitals[0];

          return (
            <Card key={patient.id} className="border border-red-200 bg-red-50/30 p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[patient.priority]}`} />
                    <p className="font-bold text-slate-900">{patient.patientName}</p>
                    <span className="font-mono text-xs text-slate-400">{patient.bed}</span>
                  </div>
                  <p className="text-xs text-slate-600">{patient.diagnosis}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Dr: {patient.doctorInCharge || "--"} / Nurse: {patient.assignedNurse || "--"}
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                  {patient.priority}
                </span>
              </div>

              {latest ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">Latest ICU Reading</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { label: "BP", value: latest.bp, alert: false },
                      {
                        label: "HR",
                        value: `${latest.pulse} bpm`,
                        alert: Number.parseInt(latest.pulse, 10) > 100,
                      },
                      {
                        label: "SpO2",
                        value: latest.spo2,
                        alert: Number.parseInt(latest.spo2, 10) < 94,
                      },
                      {
                        label: "Temp",
                        value: latest.temp === "-" ? "-" : `${latest.temp} C`,
                        alert: Number.parseFloat(latest.temp) > 38.5,
                      },
                      {
                        label: "GCS",
                        value: latest.gcs || "--",
                        alert: latest.gcs ? Number.parseInt(latest.gcs, 10) < 13 : false,
                      },
                      { label: "Urine", value: latest.urine || "--", alert: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded p-1.5 text-center ${item.alert ? "bg-red-50" : "bg-slate-50"}`}
                      >
                        <p className={`font-bold ${item.alert ? "text-red-700" : "text-slate-800"}`}>{item.value}</p>
                        <p className="text-slate-400">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Recorded {fmtDateTime(latest.recordedAt)}</span>
                    <span>{latest.recordedBy}</span>
                  </div>
                  {latest.notes ? <p className="mt-2 text-xs italic text-slate-500">Note: {latest.notes}</p> : null}
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  No ICU vitals recorded yet for this patient.
                </div>
              )}

              {patient.notes ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <strong>Nursing note:</strong> {patient.notes}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setVitalsTarget(patient);
                    resetVitalsForm();
                  }}
                >
                  Record Vitals
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewVitals(patient)}>
                  Vitals History ({patientVitals.length})
                </Button>
                <Link
                  href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open Record
                </Link>
                <Link
                  href={`${INTERNAL_PREFIX}/nurses/medication-administration`}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  Meds {"->"}
                </Link>
                <Link
                  href={`${INTERNAL_PREFIX}/nurses/sample-collection`}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  Samples {"->"}
                </Link>
              </div>
            </Card>
          );
        })}

        {icuPatients.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
            No active ICU patients at this time.
          </div>
        ) : null}
      </div>

      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title={`ICU Vitals - ${vitalsTarget?.patientName}`}>
        {vitalsTarget ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
              ICU patient - record comprehensive vitals every hour.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Blood Pressure (mmHg) *</label>
                <input value={bp} onChange={(event) => setBp(event.target.value)} placeholder="e.g. 160/100" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Pulse (bpm) *</label>
                <input value={pulse} onChange={(event) => setPulse(event.target.value)} placeholder="e.g. 110" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Temperature (C)</label>
                <input value={temp} onChange={(event) => setTemp(event.target.value)} placeholder="e.g. 37.8" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">SpO2 (%)</label>
                <input value={spo2} onChange={(event) => setSpo2(event.target.value)} placeholder="e.g. 92" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">GCS Score</label>
                <input value={gcs} onChange={(event) => setGcs(event.target.value)} placeholder="e.g. 12" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Urine Output (ml/hr)</label>
                <input value={urine} onChange={(event) => setUrine(event.target.value)} placeholder="e.g. 30ml/hr" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Respiratory Rate (/min)</label>
                <input value={rrRate} onChange={(event) => setRrRate(event.target.value)} placeholder="e.g. 24" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Recorded By</label>
                <input value={vNurse} onChange={(event) => setVNurse(event.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Clinical Notes</label>
              <textarea
                rows={2}
                value={vNotes}
                onChange={(event) => setVNotes(event.target.value)}
                placeholder="Any changes, interventions, or observations..."
                className={inputCls}
              />
            </div>
          </div>
        ) : null}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setVitalsTarget(null)}>
            Cancel
          </Button>
          <Button size="md" disabled={!bp.trim() || !pulse.trim()} onClick={handleRecordICUVitals}>
            Save ICU Vitals
          </Button>
        </ModalFooter>
      </Modal>

      {viewVitals ? (
        <Modal open={true} onClose={() => setViewVitals(null)} title={`Vitals History - ${viewVitals.patientName}`}>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {icuVitals
              .filter((entry) => entry.patientId === viewVitals.patientId)
              .map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="mb-2 flex justify-between">
                    <span className="font-semibold text-slate-700">{fmtDateTime(entry.recordedAt)}</span>
                    <span className="text-slate-500">By: {entry.recordedBy}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["BP", entry.bp],
                      ["HR", `${entry.pulse} bpm`],
                      ["SpO2", entry.spo2],
                      ["Temp", entry.temp === "-" ? "-" : `${entry.temp} C`],
                      ["GCS", entry.gcs || "--"],
                      ["Urine", entry.urine || "--"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded bg-white p-1 text-center">
                        <p className="font-bold text-slate-800">{value}</p>
                        <p className="text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                  {entry.rrRate ? <p className="mt-2 text-slate-500">Respiratory Rate: {entry.rrRate}</p> : null}
                  {entry.notes ? <p className="mt-2 italic text-slate-500">{entry.notes}</p> : null}
                </div>
              ))}
          </div>
          <ModalFooter>
            <Button size="md" onClick={() => setViewVitals(null)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
