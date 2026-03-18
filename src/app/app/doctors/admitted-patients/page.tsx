"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { addAdmissionOrder, type AdmissionUnit } from "@/lib/data/doctors-store";
import { addLabTest, getTestCatalog, type TestPriority } from "@/lib/data/lab-store";
import {
  addPrescription,
  getPharmacyDrugList,
  type SharedPrescription,
  type PrescribedDrug,
} from "@/lib/data/pharmacy-store";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 font-bold",
  High: "bg-amber-100 text-amber-700",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-100 text-emerald-700",
};

const UNIT_STYLES: Record<string, string> = {
  Ward: "bg-indigo-50 text-indigo-700",
  ICU: "bg-red-50 text-red-700 font-bold",
  Emergency: "bg-orange-50 text-orange-700",
  Outpatient: "bg-slate-100 text-slate-600",
};

// Doctor names derived from store
const FREQ_OPTIONS = ["Once daily", "Twice daily (BD)", "3×/day (TDS)", "4×/day (QDS)", "Every 8 hrs", "Every 12 hrs", "Once nightly", "As needed (PRN)"];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Ongoing"];
const QTY_PRESETS = ["6 tabs", "10 tabs", "14 tabs", "21 caps", "30 tabs", "42 tabs", "1 vial", "1 bag"];

type DrugLine = { name: string; dosage: string; frequency: string; duration: string; qty: string };
const BLANK_DRUG: DrugLine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: "" };
type LabLine = { testCode: string; priority: TestPriority };
const BLANK_LAB: LabLine = { testCode: "", priority: "Routine" };

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

export default function DoctorAdmittedPatientsPage() {
  const { allPatients } = useNursesStore();
  const { admissionOrders, doctors } = useDoctorsStore();
  const DOCTORS = doctors.map((d) => d.name);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showAdmit, setShowAdmit] = useState(false);
  const [viewPatient, setViewPatient] = useState<typeof allPatients[0] | null>(null);
  const [orderTab, setOrderTab] = useState<"lab" | "rx" | null>(null);

  // Admit form
  const [admitName, setAdmitName] = useState("");
  const [admitId, setAdmitId] = useState("");
  const [admitUnit, setAdmitUnit] = useState<AdmissionUnit>("Ward");
  const [admitReason, setAdmitReason] = useState("");
  const [admitDoctor, setAdmitDoctor] = useState("Dr. Chen Lin");

  // Lab order
  const [labLines, setLabLines] = useState<LabLine[]>([{ ...BLANK_LAB }]);
  const [labNotes, setLabNotes] = useState("");

  // Rx order
  const [rxDoctor, setRxDoctor] = useState("Dr. Chen Lin");
  const [rxUrgency, setRxUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [drugs, setDrugs] = useState<DrugLine[]>([{ ...BLANK_DRUG }]);
  const [rxNotes, setRxNotes] = useState("");

  const drugList = getPharmacyDrugList();
  const testCatalog = getTestCatalog();

  const admittedPatients = allPatients.filter(
    (p) => p.status === "Active" && (p.unit === "Ward" || p.unit === "ICU" || p.unit === "Emergency"),
  );
  const criticalPatients = admittedPatients.filter((p) => p.priority === "Critical" || p.priority === "High");
  const byUnit = {
    ICU:       admittedPatients.filter((p) => p.unit === "ICU"),
    Ward:      admittedPatients.filter((p) => p.unit === "Ward"),
    Emergency: admittedPatients.filter((p) => p.unit === "Emergency"),
  };

  function openOrders(p: typeof allPatients[0]) {
    setViewPatient(p);
    setOrderTab(null);
    setLabLines([{ ...BLANK_LAB }]); setLabNotes("");
    setDrugs([{ ...BLANK_DRUG }]); setRxNotes(""); setRxUrgency("Routine");
    setRxDoctor("Dr. Chen Lin");
  }

  function handleAdmit() {
    if (!admitName || !admitReason) { setToast({ message: "Fill in patient name and reason.", type: "error" }); return; }
    addAdmissionOrder({
      id: `ADM-${Date.now().toString().slice(-5)}`,
      patientName: admitName,
      patientId: admitId || `PT-${Date.now().toString().slice(-4)}`,
      orderedBy: admitDoctor,
      unit: admitUnit,
      reason: admitReason,
      orderedAt: "Mar 15, 2026",
      status: "Pending",
    });
    setToast({ message: `${admitName} admission order sent to Nurses Bay (${admitUnit}).`, type: "success" });
    setShowAdmit(false);
    setAdmitName(""); setAdmitId(""); setAdmitReason("");
  }

  function handleLabOrder() {
    if (!viewPatient) return;
    const filled = labLines.filter((l) => l.testCode);
    if (!filled.length) { setToast({ message: "Select at least one test.", type: "error" }); return; }
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    filled.forEach((line) => {
      const cat = testCatalog.find((t) => t.code === line.testCode);
      if (!cat) return;
      addLabTest({
        id: `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientName: viewPatient.patientName,
        patientId: viewPatient.patientId,
        testName: cat.name,
        testCode: cat.code,
        category: cat.category,
        orderedBy: rxDoctor,
        orderedAt: `${now} · Mar 15, 2026`,
        priority: line.priority,
        status: "Pending",
        sampleType: cat.sampleType,
        price: cat.price,
        billStatus: "Pending",
        resultNotes: labNotes || undefined,
      });
    });
    setToast({ message: `${filled.length} test(s) sent to Lab for ${viewPatient.patientName}.`, type: "success" });
    setViewPatient(null);
  }

  function handleRxOrder() {
    if (!viewPatient) return;
    const filled = drugs.filter((d) => d.name && d.qty);
    if (!filled.length) { setToast({ message: "Add at least one medication.", type: "error" }); return; }
    const prescribedDrugs: PrescribedDrug[] = filled.map((d) => {
      const item = drugList.find((x) => x.name === d.name);
      return { ...d, unitPrice: item?.unitPrice ?? 1.0 };
    });
    const totalCost = prescribedDrugs.reduce((s, d) => s + (parseInt(d.qty) || 1) * d.unitPrice, 0);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const rx: SharedPrescription = {
      id: `RX-${Date.now()}`,
      patientName: viewPatient.patientName,
      patientId: viewPatient.patientId,
      doctorName: rxDoctor,
      department: "Doctors",
      urgency: rxUrgency,
      drugs: prescribedDrugs,
      notes: rxNotes || undefined,
      createdAt: `${now} · Mar 15, 2026`,
      status: "Pending",
      totalCost,
    };
    addPrescription(rx);
    setToast({ message: `Prescription sent to Pharmacy for ${viewPatient.patientName} — ${filled.length} medication(s).`, type: "success" });
    setViewPatient(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Admitted Patients" description="Patients in Ward, ICU, and Emergency. Order labs and prescribe directly from this view." />
        <Button onClick={() => setShowAdmit(true)}>+ Admit Patient</Button>
      </div>

      {criticalPatients.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-red-800">
            {criticalPatients.length} critical/high-priority patient{criticalPatients.length > 1 ? "s" : ""} — immediate clinical review required.
          </span>
        </div>
      )}

      {/* KPI strip */}
      <div className="flex gap-3">
        {[
          { label: "Total Admitted", value: admittedPatients.length, color: "text-slate-900" },
          { label: "ICU", value: byUnit.ICU.length, color: byUnit.ICU.length > 0 ? "text-red-700" : "text-slate-400" },
          { label: "Ward", value: byUnit.Ward.length, color: "text-indigo-700" },
          { label: "Emergency", value: byUnit.Emergency.length, color: byUnit.Emergency.length > 0 ? "text-orange-700" : "text-slate-400" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ICU */}
      {byUnit.ICU.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-red-100 bg-red-50/50 px-5 py-4">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-bold text-red-900">ICU — Critical Care</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {byUnit.ICU.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{p.patientName}</p>
                    <span className="font-mono text-xs text-slate-400">{p.patientId}</span>
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{p.bed}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{p.diagnosis}</p>
                  <p className="text-xs text-slate-400">Nurse: {p.assignedNurse}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                <Button size="sm" variant="outline" onClick={() => openOrders(p)}>Clinical Orders</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ward */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Ward — Inpatients</h3>
          <span className="text-xs text-slate-400">{byUnit.Ward.length} patient{byUnit.Ward.length !== 1 ? "s" : ""}</span>
        </div>
        {byUnit.Ward.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Patient", "Patient ID", "Bed", "Diagnosis", "Priority", "Assigned Nurse", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byUnit.Ward.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.patientName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.patientId}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{p.bed}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{p.diagnosis}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.assignedNurse}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => openOrders(p)}>Clinical Orders</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No patients in Ward at this time.</p>
        )}
      </Card>

      {/* Emergency */}
      {byUnit.Emergency.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-orange-100 bg-orange-50/50 px-5 py-4">
            <h3 className="font-bold text-orange-900">Emergency Unit</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {byUnit.Emergency.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{p.patientName} <span className="font-mono text-xs text-slate-400 ml-1">{p.patientId}</span></p>
                  <p className="text-xs text-slate-500">{p.diagnosis} · {p.bed}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                <Button size="sm" variant="outline" onClick={() => openOrders(p)}>Clinical Orders</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Admission Orders Log */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Admission Orders Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["ADM ID", "Patient", "Unit", "Ordered By", "Reason", "Ordered At", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissionOrders.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{a.patientName}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${UNIT_STYLES[a.unit]}`}>{a.unit}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.orderedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{a.reason}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{a.orderedAt}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === "Admitted" ? "bg-emerald-50 text-emerald-700" : a.status === "Discharged" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
              {admissionOrders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">No admission orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Admit Patient Modal ──────────────────────────────────────────────── */}
      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} title="Admit Patient">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name *</label><input value={admitName} onChange={(e) => setAdmitName(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Patient ID</label><input value={admitId} onChange={(e) => setAdmitId(e.target.value)} placeholder="PT-XXXX" className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Admitting Doctor</label>
              <select value={admitDoctor} onChange={(e) => setAdmitDoctor(e.target.value)} className={inputCls}>
                {DOCTORS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Admission Unit</label>
              <select value={admitUnit} onChange={(e) => setAdmitUnit(e.target.value as AdmissionUnit)} className={inputCls}>
                {["Ward", "ICU", "Emergency"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Admission *</label>
            <textarea rows={3} value={admitReason} onChange={(e) => setAdmitReason(e.target.value)}
              placeholder="Clinical reason and initial management plan…" className={inputCls + " resize-none"} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowAdmit(false)}>Cancel</Button>
          <Button size="md" onClick={handleAdmit}>Admit Patient</Button>
        </ModalFooter>
      </Modal>

      {/* ── Clinical Orders Modal ────────────────────────────────────────────── */}
      <Modal open={!!viewPatient} onClose={() => setViewPatient(null)}
        title={`Clinical Orders — ${viewPatient?.patientName ?? ""}`}>
        {viewPatient && (
          <div className="space-y-4">
            {/* Patient info banner */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs">
              <div><span className="text-slate-400">Unit:</span> <strong>{viewPatient.unit}</strong></div>
              <div><span className="text-slate-400">Bed:</span> <strong>{viewPatient.bed}</strong></div>
              <div><span className="text-slate-400">Priority:</span> <strong>{viewPatient.priority}</strong></div>
              <div><span className="text-slate-400">Nurse:</span> <strong>{viewPatient.assignedNurse}</strong></div>
              <div className="col-span-2"><span className="text-slate-400">Diagnosis:</span> <strong>{viewPatient.diagnosis}</strong></div>
            </div>

            {/* Order type tabs */}
            <div className="flex gap-2">
              <button onClick={() => setOrderTab(orderTab === "lab" ? null : "lab")}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${orderTab === "lab" ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 hover:border-slate-300"}`}>
                🧪 Order Lab Tests
              </button>
              <button onClick={() => setOrderTab(orderTab === "rx" ? null : "rx")}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${orderTab === "rx" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 hover:border-slate-300"}`}>
                💊 Write Prescription
              </button>
            </div>

            {/* Doctor selector */}
            {orderTab && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ordering Doctor</label>
                <select value={rxDoctor} onChange={(e) => setRxDoctor(e.target.value)} className={inputCls}>
                  {DOCTORS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}

            {/* Lab order panel */}
            {orderTab === "lab" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Tests</span>
                  <button type="button" onClick={() => setLabLines((p) => [...p, { ...BLANK_LAB }])}
                    className="text-xs font-semibold text-sky-600 hover:underline">+ Add test</button>
                </div>
                {labLines.map((line, i) => {
                  const sel = testCatalog.find((t) => t.code === line.testCode);
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Test {i + 1}</span>
                        {labLines.length > 1 && (
                          <button type="button" onClick={() => setLabLines((p) => p.filter((_, j) => j !== i))}
                            className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        )}
                      </div>
                      <select value={line.testCode} onChange={(e) => setLabLines((p) => p.map((l, j) => j === i ? { ...l, testCode: e.target.value } : l))}
                        className={inputCls}>
                        <option value="">— Choose a test —</option>
                        {testCatalog.map((t) => <option key={t.code} value={t.code}>{t.name} — ₦{t.price}</option>)}
                      </select>
                      <div className="flex gap-1">
                        {(["Routine", "Urgent", "STAT"] as const).map((p) => (
                          <button key={p} type="button" onClick={() => setLabLines((prev) => prev.map((l, j) => j === i ? { ...l, priority: p } : l))}
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition ${
                              line.priority === p
                                ? p === "STAT" ? "border-red-400 bg-red-50 text-red-700"
                                  : p === "Urgent" ? "border-amber-400 bg-amber-50 text-amber-700"
                                  : "border-sky-400 bg-sky-50 text-sky-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}>
                            {p}
                          </button>
                        ))}
                      </div>
                      {sel && (
                        <p className="text-xs text-sky-700 font-medium">Sample: {sel.sampleType} · TAT: {sel.turnaroundHours < 1 ? `${sel.turnaroundHours * 60} min` : `${sel.turnaroundHours} hr`}</p>
                      )}
                    </div>
                  );
                })}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Clinical Notes</label>
                  <textarea rows={2} value={labNotes} onChange={(e) => setLabNotes(e.target.value)}
                    placeholder="e.g. Check FBC, patient anaemic…"
                    className={inputCls + " resize-none"} />
                </div>
              </div>
            )}

            {/* Rx panel */}
            {orderTab === "rx" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Medications</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {(["Routine", "Urgent"] as const).map((u) => (
                        <button key={u} type="button" onClick={() => setRxUrgency(u)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${rxUrgency === u ? u === "Urgent" ? "bg-red-600 text-white" : "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {u}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setDrugs((p) => [...p, { ...BLANK_DRUG }])}
                      className="text-xs font-semibold text-violet-600 hover:underline">+ Add</button>
                  </div>
                </div>
                {drugs.map((d, i) => {
                  const item = drugList.find((x) => x.name === d.name);
                  const qty = parseInt(d.qty) || 0;
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Drug {i + 1}</span>
                        {drugs.length > 1 && (
                          <button type="button" onClick={() => setDrugs((p) => p.filter((_, j) => j !== i))}
                            className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-slate-500">Medication *</label>
                          <select value={d.name} onChange={(e) => {
                            const found = drugList.find((x) => x.name === e.target.value);
                            setDrugs((prev) => prev.map((dr, j) => j === i ? { ...dr, name: e.target.value, dosage: found?.defaultDosage ?? dr.dosage } : dr));
                          }} className={inputCls}>
                            <option value="">— Select from pharmacy inventory —</option>
                            {Object.entries(
                              drugList.reduce<Record<string, typeof drugList>>((acc, drug) => {
                                (acc[drug.category] = acc[drug.category] || []).push(drug);
                                return acc;
                              }, {}),
                            ).map(([cat, items]) => (
                              <optgroup key={cat} label={cat}>
                                {items.map((opt) => (
                                  <option key={opt.id} value={opt.name}>{opt.name} — ₦{opt.unitPrice.toFixed(2)}/{opt.unit}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Dosage</label>
                          <input type="text" placeholder="e.g. 500mg" value={d.dosage}
                            onChange={(e) => setDrugs((p) => p.map((dr, j) => j === i ? { ...dr, dosage: e.target.value } : dr))}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Quantity</label>
                          <input type="text" list={`q-${i}`} placeholder="e.g. 21 caps" value={d.qty}
                            onChange={(e) => setDrugs((p) => p.map((dr, j) => j === i ? { ...dr, qty: e.target.value } : dr))}
                            className={inputCls} />
                          <datalist id={`q-${i}`}>{QTY_PRESETS.map((q) => <option key={q} value={q} />)}</datalist>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                          <select value={d.frequency} onChange={(e) => setDrugs((p) => p.map((dr, j) => j === i ? { ...dr, frequency: e.target.value } : dr))} className={inputCls}>
                            {FREQ_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Duration</label>
                          <select value={d.duration} onChange={(e) => setDrugs((p) => p.map((dr, j) => j === i ? { ...dr, duration: e.target.value } : dr))} className={inputCls}>
                            {DURATION_OPTIONS.map((dur) => <option key={dur}>{dur}</option>)}
                          </select>
                        </div>
                        {item && qty > 0 && (
                          <div className="col-span-2 flex justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-800">
                            <span>₦{item.unitPrice.toFixed(2)} × {qty}</span>
                            <strong>= ₦{(item.unitPrice * qty).toFixed(2)}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Instructions</label>
                  <textarea rows={2} value={rxNotes} onChange={(e) => setRxNotes(e.target.value)}
                    placeholder="e.g. Take with food. Complete the full course."
                    className={inputCls + " resize-none"} />
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setViewPatient(null)}>Close</Button>
          {orderTab === "lab" && (
            <Button size="md" disabled={!labLines.some((l) => l.testCode)} onClick={handleLabOrder}>
              Send {labLines.filter((l) => l.testCode).length} Test(s) to Lab
            </Button>
          )}
          {orderTab === "rx" && (
            <Button size="md" disabled={!drugs.some((d) => d.name)} onClick={handleRxOrder}>
              Send Prescription to Pharmacy
            </Button>
          )}
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
