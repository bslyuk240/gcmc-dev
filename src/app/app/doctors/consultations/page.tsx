"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  addPrescription,
  getPharmacyDrugList,
  type SharedPrescription,
  type PrescribedDrug,
} from "@/lib/data/pharmacy-store";
import { addConsultationFee } from "@/lib/data/accounts-store";
import { addLabTest, getTestCatalog, type TestPriority } from "@/lib/data/lab-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";

type ConsultStatus = "completed" | "in_progress";
type ConsultType = "General" | "Specialist" | "Emergency" | "Follow-up" | "Antenatal";

const CONSULT_FEES: Record<ConsultType, number> = {
  General: 100, Specialist: 250, Emergency: 200, "Follow-up": 60, Antenatal: 120,
};

type Consultation = {
  id: string; patient: string; patientId: string; doctor: string;
  date: string; status: ConsultStatus; rxWritten?: boolean; labOrdered?: boolean; billed?: boolean;
};

const INITIAL: Consultation[] = [
  { id: "CON-001", patient: "Alice Thompson",  patientId: "PT-8234", doctor: "Dr. Chen Lin",   date: "Mar 15, 2026", status: "in_progress" },
  { id: "CON-002", patient: "Kofi Mensah",     patientId: "PT-8236", doctor: "Dr. Kwame Mensah",date: "Mar 15, 2026", status: "in_progress" },
  { id: "CON-003", patient: "Mary Ibrahim",    patientId: "PT-8233", doctor: "Dr. Amaka Osei", date: "Mar 15, 2026", status: "completed", rxWritten: true },
  { id: "CON-004", patient: "Joseph James",    patientId: "PT-8240", doctor: "Dr. Chen Lin",   date: "Mar 14, 2026", status: "completed" },
  { id: "CON-005", patient: "Ruth Cole",       patientId: "PT-8241", doctor: "Dr. Kofi Osei",  date: "Mar 14, 2026", status: "completed", rxWritten: true },
];

const FREQ_OPTIONS = [
  "Once daily", "Twice daily (BD)", "3×/day (TDS)", "4×/day (QDS)",
  "Every 8 hrs (8hrly)", "Every 12 hrs (12hrly)", "Once nightly", "As needed (PRN)",
];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Ongoing"];
const QTY_PRESETS = ["6 tabs", "10 tabs", "14 tabs", "21 caps", "30 tabs", "42 tabs", "60 tabs", "1 vial", "1 bag", "5 sachets"];

type DrugLine = { name: string; dosage: string; frequency: string; duration: string; qty: string };
const BLANK_DRUG: DrugLine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: "" };

type LabLine = { testCode: string; priority: TestPriority };
const BLANK_LAB: LabLine = { testCode: "", priority: "Routine" };

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

export default function DoctorsConsultationsPage() {
  const { consultations: storeConsults } = useDoctorsStore();
  const [consultations, setConsultations] = useState<Consultation[]>(INITIAL);
  const [toast, setToast] = useState<ToastData | null>(null);

  // ── Rx modal ──────────────────────────────────────────────────────────────
  const [rxTarget, setRxTarget] = useState<Consultation | null>(null);
  const [urgency, setUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [drugs, setDrugs] = useState<DrugLine[]>([{ ...BLANK_DRUG }]);
  const [rxNotes, setRxNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Consultation fee modal ────────────────────────────────────────────────
  const [feeTarget, setFeeTarget] = useState<Consultation | null>(null);
  const [consultType, setConsultType] = useState<ConsultType>("General");

  // ── Lab order modal ───────────────────────────────────────────────────────
  const [labTarget, setLabTarget] = useState<Consultation | null>(null);
  const [labLines, setLabLines] = useState<LabLine[]>([{ ...BLANK_LAB }]);
  const [labClinicalNotes, setLabClinicalNotes] = useState("");

  const drugList = getPharmacyDrugList();
  const testCatalog = getTestCatalog();

  // ── Rx helpers ────────────────────────────────────────────────────────────
  function openRxModal(c: Consultation) {
    setRxTarget(c);
    setUrgency("Routine");
    setDrugs([{ ...BLANK_DRUG }]);
    setRxNotes("");
  }

  function updateDrug(idx: number, field: keyof DrugLine, value: string) {
    setDrugs((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  function autoFillDosage(idx: number, name: string) {
    const item = drugList.find((d) => d.name === name);
    if (item) setDrugs((prev) => prev.map((d, i) => (i === idx ? { ...d, name, dosage: item.defaultDosage } : d)));
    else updateDrug(idx, "name", name);
  }

  const totalCost = drugs.reduce((sum, d) => {
    const qty = parseInt(d.qty) || 0;
    const item = drugList.find((x) => x.name === d.name);
    return sum + qty * (item?.unitPrice ?? 0);
  }, 0);

  function handleSubmitRx(e: React.FormEvent) {
    e.preventDefault();
    if (!rxTarget) return;
    const filled = drugs.filter((d) => d.name && d.qty);
    if (!filled.length) { setToast({ message: "Add at least one drug with name and quantity.", type: "error" }); return; }
    setSubmitting(true);
    setTimeout(() => {
      const prescribedDrugs: PrescribedDrug[] = filled.map((d) => {
        const item = drugList.find((x) => x.name === d.name);
        return { ...d, unitPrice: item?.unitPrice ?? 1.0 };
      });
      const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const rx: SharedPrescription = {
        id: `RX-${Date.now()}`,
        patientName: rxTarget.patient,
        patientId: rxTarget.patientId,
        doctorName: rxTarget.doctor,
        department: "Doctors",
        urgency,
        drugs: prescribedDrugs,
        notes: rxNotes || undefined,
        createdAt: `${now} · Mar 15, 2026`,
        status: "Pending",
      };
      addPrescription(rx);
      setConsultations((prev) => prev.map((c) => (c.id === rxTarget.id ? { ...c, rxWritten: true } : c)));
      setSubmitting(false);
      setRxTarget(null);
      setToast({ message: `Prescription sent to Pharmacy for ${rxTarget.patient} — ${filled.length} drug(s).`, type: "success" });
    }, 700);
  }

  // ── Fee helpers ───────────────────────────────────────────────────────────
  function handleSubmitFee() {
    if (!feeTarget) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    addConsultationFee({
      id: `CF-${Date.now()}`,
      patientName: feeTarget.patient,
      patientId: feeTarget.patientId,
      doctorName: feeTarget.doctor,
      consultationType: consultType,
      fee: CONSULT_FEES[consultType],
      consultedAt: `${now} · Mar 15, 2026`,
      status: "Pending",
    });
    setConsultations((prev) => prev.map((c) => (c.id === feeTarget.id ? { ...c, billed: true } : c)));
    setToast({ message: `Consultation fee ₦${CONSULT_FEES[consultType]} sent to Accounts for ${feeTarget.patient}.`, type: "success" });
    setFeeTarget(null);
  }

  // ── Lab helpers ───────────────────────────────────────────────────────────
  function openLabModal(c: Consultation) {
    setLabTarget(c);
    setLabLines([{ ...BLANK_LAB }]);
    setLabClinicalNotes("");
  }

  function updateLabLine(idx: number, field: keyof LabLine, value: string) {
    setLabLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function handleOrderLab() {
    if (!labTarget) return;
    const filled = labLines.filter((l) => l.testCode);
    if (!filled.length) { setToast({ message: "Select at least one test.", type: "error" }); return; }
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    filled.forEach((line) => {
      const cat = testCatalog.find((t) => t.code === line.testCode);
      if (!cat) return;
      addLabTest({
        id: `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patientName: labTarget.patient,
        patientId: labTarget.patientId,
        testName: cat.name,
        testCode: cat.code,
        category: cat.category,
        orderedBy: labTarget.doctor,
        orderedAt: `${now} · Mar 15, 2026`,
        priority: line.priority,
        status: "Pending",
        sampleType: cat.sampleType,
        price: cat.price,
        billStatus: "Billed",
        resultNotes: labClinicalNotes || undefined,
      });
    });
    setConsultations((prev) => prev.map((c) => (c.id === labTarget.id ? { ...c, labOrdered: true } : c)));
    setToast({ message: `${filled.length} lab test(s) ordered for ${labTarget.patient} — Lab notified.`, type: "success" });
    setLabTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description="Active and recent consultations. Write prescriptions, bill fees, and order lab tests."
      />

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "In Progress",    value: consultations.filter((c) => c.status === "in_progress").length,  color: "bg-sky-50 text-sky-700 border border-sky-200" },
          { label: "Completed Today",value: consultations.filter((c) => c.status === "completed").length,    color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
          { label: "Rx Written",     value: consultations.filter((c) => c.rxWritten).length,                 color: "bg-violet-50 text-violet-700 border border-violet-200" },
          { label: "Lab Ordered",    value: consultations.filter((c) => c.labOrdered).length,                color: "bg-amber-50 text-amber-700 border border-amber-200" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${s.color}`}>
            <span className="text-lg font-bold">{s.value}</span>
            <span className="font-medium opacity-80">{s.label}</span>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Today&apos;s Consultations</h3>
          <p className="text-xs text-slate-400 mt-0.5">Use the action buttons to write prescriptions, order lab tests, and bill consultation fees.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Doctor", "Date", "Status", "Rx", "Lab", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultations.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{row.patient}</p>
                    <p className="text-xs text-slate-400">{row.patientId}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{row.doctor}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{row.date}</td>
                  <td className="px-5 py-3">
                    <StatusBadge variant={row.status === "completed" ? "success" : "info"}>
                      {row.status.replace("_", " ")}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">
                    {row.rxWritten
                      ? <span className="text-xs font-semibold text-violet-700">✓ Sent</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {row.labOrdered
                      ? <span className="text-xs font-semibold text-sky-700">✓ Ordered</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openRxModal(row)}
                        className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
                        {row.rxWritten ? "Re-prescribe" : "Write Rx"}
                      </button>
                      <button onClick={() => openLabModal(row)}
                        className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700 transition-colors">
                        Order Lab
                      </button>
                      {!row.billed ? (
                        <button onClick={() => { setFeeTarget(row); setConsultType("General"); }}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                          Bill Fee
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700">✓ Billed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Prescription Modal ──────────────────────────────────────────────── */}
      <Modal open={!!rxTarget} onClose={() => !submitting && setRxTarget(null)}
        title={`Write Prescription — ${rxTarget?.patient ?? ""}`}>
        <form onSubmit={handleSubmitRx} className="space-y-4">
          <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-500">Patient:</span><span className="font-semibold text-slate-900">{rxTarget?.patient}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500">Doctor:</span><span className="font-semibold text-slate-900">{rxTarget?.doctor}</span>
          </div>

          <div className="flex gap-3 items-center">
            <span className="text-sm font-semibold text-slate-700">Urgency:</span>
            {(["Routine", "Urgent"] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUrgency(u)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${urgency === u
                  ? u === "Urgent" ? "bg-red-600 text-white" : "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {u}
              </button>
            ))}
          </div>

          {/* Drug lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Medications</span>
              <button type="button" onClick={() => setDrugs((p) => [...p, { ...BLANK_DRUG }])}
                className="text-xs font-semibold text-violet-600 hover:underline">+ Add medication</button>
            </div>
            {drugs.map((d, i) => {
              const item = drugList.find((x) => x.name === d.name);
              const qty = parseInt(d.qty) || 0;
              return (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2.5 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Drug {i + 1}</span>
                    {drugs.length > 1 && (
                      <button type="button" onClick={() => setDrugs((p) => p.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">Medication *</label>
                      <select value={d.name} onChange={(e) => autoFillDosage(i, e.target.value)} required
                        className={inputCls}>
                        <option value="">— Select from inventory —</option>
                        {Object.entries(
                          drugList.reduce<Record<string, typeof drugList>>((acc, drug) => {
                            (acc[drug.category] = acc[drug.category] || []).push(drug);
                            return acc;
                          }, {}),
                        ).map(([cat, items]) => (
                          <optgroup key={cat} label={cat}>
                            {items.map((opt) => (
                              <option key={opt.id} value={opt.name}>
                                {opt.name} — ₦{opt.unitPrice.toFixed(2)}/{opt.unit}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Dosage *</label>
                      <input type="text" placeholder="e.g. 500mg" value={d.dosage}
                        onChange={(e) => updateDrug(i, "dosage", e.target.value)} required className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Quantity *</label>
                      <input type="text" list={`qty-opts-${i}`} placeholder="e.g. 21 caps" value={d.qty}
                        onChange={(e) => updateDrug(i, "qty", e.target.value)} required className={inputCls} />
                      <datalist id={`qty-opts-${i}`}>{QTY_PRESETS.map((q) => <option key={q} value={q} />)}</datalist>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                      <select value={d.frequency} onChange={(e) => updateDrug(i, "frequency", e.target.value)} className={inputCls}>
                        {FREQ_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Duration</label>
                      <select value={d.duration} onChange={(e) => updateDrug(i, "duration", e.target.value)} className={inputCls}>
                        {DURATION_OPTIONS.map((dur) => <option key={dur} value={dur}>{dur}</option>)}
                      </select>
                    </div>
                    {item && qty > 0 && (
                      <div className="col-span-2 flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-800">
                        <span>₦{item.unitPrice.toFixed(2)} × {qty} {item.unit}s</span>
                        <strong>= ₦{(item.unitPrice * qty).toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalCost > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-violet-50 border border-violet-100 px-4 py-2">
              <span className="text-sm font-semibold text-violet-800">Estimated Total</span>
              <span className="text-lg font-bold text-violet-900">₦ {totalCost.toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Notes / Instructions</label>
            <textarea rows={2} placeholder="e.g. Take with food. Avoid alcohol. Complete the full course."
              value={rxNotes} onChange={(e) => setRxNotes(e.target.value)}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20" />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800">
            ✓ Prescription will be immediately visible in the Pharmacy dispensing queue.
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setRxTarget(null)} disabled={submitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={submitting}>
              {submitting ? "Sending to Pharmacy…" : "Send Prescription to Pharmacy"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Consultation Fee Modal ──────────────────────────────────────────── */}
      <Modal open={!!feeTarget} onClose={() => setFeeTarget(null)}
        title={`Bill Consultation Fee — ${feeTarget?.patient ?? ""}`}>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{feeTarget?.patient}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span>{feeTarget?.doctor}</span></div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Consultation Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CONSULT_FEES) as ConsultType[]).map((t) => (
                <button key={t} type="button" onClick={() => setConsultType(t)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${consultType === t ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/30" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                  <span className="text-sm font-medium text-slate-800">{t}</span>
                  <span className={`text-sm font-bold ${consultType === t ? "text-emerald-700" : "text-slate-600"}`}>₦{CONSULT_FEES[t]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <span className="text-sm font-semibold text-emerald-800">Fee to bill</span>
            <span className="text-xl font-bold text-emerald-900">₦{CONSULT_FEES[consultType]}</span>
          </div>
          <p className="text-xs text-slate-500">Fee will appear as a pending charge in Accounts for this patient.</p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setFeeTarget(null)}>Cancel</Button>
          <Button size="md" type="button" onClick={handleSubmitFee}>Send Fee to Accounts</Button>
        </ModalFooter>
      </Modal>

      {/* ── Lab Order Modal (multiple tests) ───────────────────────────────── */}
      <Modal open={!!labTarget} onClose={() => setLabTarget(null)}
        title={`Order Lab Tests — ${labTarget?.patient ?? ""}`}>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{labTarget?.patient}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ordered by</span><span>{labTarget?.doctor}</span></div>
          </div>

          {/* Test lines */}
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">Test *</label>
                      <select value={line.testCode}
                        onChange={(e) => updateLabLine(i, "testCode", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200">
                        <option value="">— Choose a test —</option>
                        {testCatalog.map((t) => (
                          <option key={t.code} value={t.code}>{t.name} — ₦{t.price}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Priority</label>
                      <div className="flex gap-1">
                        {(["Routine", "Urgent", "STAT"] as const).map((p) => (
                          <button key={p} type="button" onClick={() => updateLabLine(i, "priority", p)}
                            className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold transition ${
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
                    </div>
                    {sel && (
                      <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 space-y-0.5">
                        <div><strong>Sample:</strong> {sel.sampleType}</div>
                        <div><strong>TAT:</strong> {sel.turnaroundHours < 1 ? `${sel.turnaroundHours * 60} min` : `${sel.turnaroundHours} hr`}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total cost preview */}
          {labLines.some((l) => l.testCode) && (
            <div className="flex items-center justify-between rounded-xl bg-sky-50 border border-sky-100 px-4 py-2 text-sm">
              <span className="font-semibold text-sky-800">Est. total</span>
              <span className="font-bold text-sky-900">
                ₦{labLines.reduce((sum, l) => {
                  const t = testCatalog.find((x) => x.code === l.testCode);
                  return sum + (t?.price ?? 0);
                }, 0).toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Clinical Notes / Indication</label>
            <textarea rows={2} placeholder="e.g. Suspected malaria, check FBC for anaemia…"
              value={labClinicalNotes} onChange={(e) => setLabClinicalNotes(e.target.value)}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setLabTarget(null)}>Cancel</Button>
          <Button size="md" disabled={!labLines.some((l) => l.testCode)} onClick={handleOrderLab}>
            Send {labLines.filter((l) => l.testCode).length > 1 ? `${labLines.filter((l) => l.testCode).length} Tests` : "Test"} to Lab
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
