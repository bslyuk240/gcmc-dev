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
import { addICUVitals, updateWardPatient, type WardPatient } from "@/lib/data/nurses-store";

const PRIORITY_DOT: Record<string, string> = {
  Critical: "bg-red-500 animate-pulse",
  High: "bg-amber-500",
  Watch: "bg-amber-400",
  Stable: "bg-emerald-400",
};

export default function NursesICUPage() {
  const { getByUnit, icuVitals } = useNursesStore();
  const icuPatients = getByUnit("ICU").filter((p) => p.status === "Active");

  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [viewVitals, setViewVitals] = useState<WardPatient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Vitals form
  const [bp, setBp] = useState(""); const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState(""); const [spo2, setSpo2] = useState("");
  const [gcs, setGcs] = useState(""); const [urine, setUrine] = useState("");
  const [rrRate, setRrRate] = useState(""); const [vNotes, setVNotes] = useState("");
  const [vNurse, setVNurse] = useState("Nurse Sandra (ICU)");

  function handleRecordICUVitals() {
    if (!vitalsTarget || !bp || !pulse) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const entry = {
      id: `IV-${Date.now()}`,
      patientId: vitalsTarget.patientId,
      patientName: vitalsTarget.patientName,
      bp, pulse, temp, spo2, gcs, urine, rrRate,
      recordedBy: vNurse,
      recordedAt: `${now} · Mar 15, 2026`,
      notes: vNotes || undefined,
    };
    addICUVitals(entry);
    updateWardPatient(vitalsTarget.id, {
      vitals: { bp, pulse, temp, spo2, recordedAt: now, recordedBy: vNurse },
      lastVitalsAt: `${now} · Mar 15`,
    });
    setToast({ message: `ICU vitals recorded for ${vitalsTarget.patientName}.`, type: "success" });
    setVitalsTarget(null);
    setBp(""); setPulse(""); setTemp(""); setSpo2(""); setGcs(""); setUrine(""); setRrRate(""); setVNotes("");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intensive Care Unit (ICU)"
        description="Critical care monitoring — continuous vitals, strict medication schedules, and close observation."
      />

      {/* Critical header */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 bg-red-50 border border-red-200 col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-red-500">Critical Patients</p>
          <p className="mt-1 text-4xl font-bold text-red-700">{icuPatients.length}</p>
          <p className="mt-1 text-xs text-slate-500">All require continuous monitoring</p>
        </Card>
        <Card className="p-5 col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">ICU Protocol Reminders</p>
          <ul className="space-y-1 text-xs text-slate-600">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />Record vitals <strong>every 1 hour</strong> for critical patients</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />Alert doctor <strong>immediately</strong> if SpO2 &lt;90%, BP changes significantly, or GCS drops</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />Monitor <strong>urine output</strong> hourly — report if &lt;30ml/hr</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />Document all <strong>medications</strong> with exact time and dose</li>
          </ul>
        </Card>
      </div>

      {/* ICU patient cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {icuPatients.map((p) => {
          const patientVitals = icuVitals.filter((v) => v.patientId === p.patientId);
          const latest = patientVitals[0];
          return (
            <Card key={p.id} className="p-5 border border-red-200 bg-red-50/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[p.priority]}`} />
                    <p className="font-bold text-slate-900">{p.patientName}</p>
                    <span className="font-mono text-xs text-slate-400">{p.bed}</span>
                  </div>
                  <p className="text-xs text-slate-600">{p.diagnosis}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Dr: {p.doctorInCharge} · Nurse: {p.assignedNurse}</p>
                </div>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">{p.priority}</span>
              </div>

              {/* Latest vitals */}
              {latest ? (
                <div className="rounded-lg bg-white border border-slate-200 p-3 mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Latest Vitals · {latest.recordedAt}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { label: "BP", value: latest.bp, alert: false },
                      { label: "HR", value: `${latest.pulse} bpm`, alert: parseInt(latest.pulse) > 100 },
                      { label: "SpO2", value: latest.spo2, alert: parseInt(latest.spo2) < 94 },
                      { label: "Temp", value: `${latest.temp}°C`, alert: parseFloat(latest.temp) > 38.5 },
                      { label: "GCS", value: latest.gcs || "—", alert: latest.gcs ? parseInt(latest.gcs) < 13 : false },
                      { label: "Urine", value: latest.urine || "—", alert: false },
                    ].map((v) => (
                      <div key={v.label} className={`rounded p-1.5 text-center ${v.alert ? "bg-red-50" : "bg-slate-50"}`}>
                        <p className={`font-bold ${v.alert ? "text-red-700" : "text-slate-800"}`}>{v.value}</p>
                        <p className="text-slate-400">{v.label}</p>
                      </div>
                    ))}
                  </div>
                  {latest.notes && <p className="mt-2 text-xs text-slate-500 italic">Note: {latest.notes}</p>}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3 text-xs text-amber-800">⚠ No vitals recorded yet for this patient.</div>
              )}

              {p.notes && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 mb-3">
                  <strong>Nursing note:</strong> {p.notes}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => { setVitalsTarget(p); setBp(""); setPulse(""); setTemp(""); setSpo2(""); setGcs(""); setUrine(""); setRrRate(""); setVNotes(""); }}>
                  Record Vitals
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewVitals(p)}>Vitals History ({patientVitals.length})</Button>
                <Link href={`${INTERNAL_PREFIX}/nurses/medication-administration`}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
                  Meds →
                </Link>
                <Link href={`${INTERNAL_PREFIX}/lab/results`}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition">
                  Lab Results →
                </Link>
              </div>
            </Card>
          );
        })}
        {icuPatients.length === 0 && (
          <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
            No active ICU patients at this time.
          </div>
        )}
      </div>

      {/* ICU Vitals entry modal */}
      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title={`ICU Vitals — ${vitalsTarget?.patientName}`}>
        {vitalsTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-semibold">
              ICU patient — record comprehensive vitals every hour
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Blood Pressure (mmHg) *</label>
                <input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 160/100" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Pulse (bpm) *</label>
                <input value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="e.g. 110" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Temperature (°C)</label>
                <input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 37.8" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">SpO2 (%)</label>
                <input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="e.g. 92%" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">GCS Score</label>
                <input value={gcs} onChange={(e) => setGcs(e.target.value)} placeholder="e.g. 12" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Urine Output (ml/hr)</label>
                <input value={urine} onChange={(e) => setUrine(e.target.value)} placeholder="e.g. 30ml/hr" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Respiratory Rate (/min)</label>
                <input value={rrRate} onChange={(e) => setRrRate(e.target.value)} placeholder="e.g. 24" className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Recorded By</label>
                <input value={vNurse} onChange={(e) => setVNurse(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Clinical Notes</label>
              <textarea rows={2} value={vNotes} onChange={(e) => setVNotes(e.target.value)}
                placeholder="Any changes, interventions, or observations..." className={inputCls} /></div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setVitalsTarget(null)}>Cancel</Button>
          <Button size="md" disabled={!bp || !pulse} onClick={handleRecordICUVitals}>Save ICU Vitals</Button>
        </ModalFooter>
      </Modal>

      {/* Vitals history modal */}
      {viewVitals && (
        <Modal open={true} onClose={() => setViewVitals(null)} title={`Vitals History — ${viewVitals.patientName}`}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {icuVitals.filter((v) => v.patientId === viewVitals.patientId).map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-slate-700">{v.recordedAt}</span>
                  <span className="text-slate-500">By: {v.recordedBy}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[["BP", v.bp], ["HR", `${v.pulse} bpm`], ["SpO2", v.spo2], ["Temp", `${v.temp}°C`], ["GCS", v.gcs || "—"], ["Urine", v.urine || "—"]].map(([l, val]) => (
                    <div key={l} className="text-center bg-white rounded p-1">
                      <p className="font-bold text-slate-800">{val}</p><p className="text-slate-400">{l}</p>
                    </div>
                  ))}
                </div>
                {v.notes && <p className="mt-2 italic text-slate-500">{v.notes}</p>}
              </div>
            ))}
          </div>
          <ModalFooter><Button size="md" onClick={() => setViewVitals(null)}>Close</Button></ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
