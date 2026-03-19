"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useHMSSession } from "@/modules/rbac/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  addPrescription,
  getPharmacyDrugList,
  type SharedPrescription,
  type PrescribedDrug,
} from "@/lib/data/pharmacy-store";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Processing: "bg-violet-50 text-violet-700",
  Dispensed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
  "Partially Dispensed": "bg-sky-50 text-sky-700",
};

const URGENCY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-red-100 text-red-700 font-bold",
};

const FREQ_OPTIONS = [
  "Once daily", "Twice daily (BD)", "3×/day (TDS)", "4×/day (QDS)",
  "Every 8 hrs (8hrly)", "Every 12 hrs (12hrly)", "Once nightly", "As needed (PRN)",
];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Ongoing"];
const QTY_PRESETS = ["6 tabs", "10 tabs", "14 tabs", "21 caps", "30 tabs", "42 tabs", "60 tabs", "1 vial", "1 bag", "5 sachets"];


type DrugLine = { name: string; dosage: string; frequency: string; duration: string; qty: string };
const BLANK_DRUG: DrugLine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: "" };

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

export default function DoctorPrescriptionsPage() {
  const { prescriptions, metrics } = usePharmacyStore();
  const { consultations, doctors } = useDoctorsStore();
  const { allPatients } = useNursesStore();
  const session = useHMSSession();
  const sessionDoctorName = session?.full_name ?? "";
  const drugList = getPharmacyDrugList();

  // Build unified patient list from consultations + inpatients
  const patientOptions: SelectOption[] = [
    ...consultations
      .filter((c) => c.status === "In Progress" || c.status === "Awaiting Results")
      .map((c) => ({
        value: c.id,
        label: c.patientName,
        sublabel: `${c.patientId} · ${c.consultType} · ${c.doctorName}`,
        group: "Active Consultations",
      })),
    ...allPatients
      .filter((p) => p.status === "Active" && !consultations.some((c) => c.patientId === p.patientId))
      .map((p) => ({
        value: `NP-${p.id}`,
        label: p.patientName,
        sublabel: `${p.patientId} · ${p.unit} · Bed ${p.bed}`,
        group: "Admitted Patients",
      })),
  ];

  const doctorOptions: SelectOption[] = doctors.map((d) => ({
    value: d.name,
    label: d.name,
    sublabel: d.specialty,
  }));

  const drugSelectOptions: SelectOption[] = drugList.map((d) => ({
    value: d.name,
    label: d.name,
    sublabel: `₦${d.unitPrice.toFixed(2)}/${d.unit}`,
    group: d.category,
  }));

  const [filterStatus, setFilterStatus] = useState("All");
  const [showWrite, setShowWrite] = useState(false);
  const [viewRx, setViewRx] = useState<typeof prescriptions[0] | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [patient, setPatient] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctor, setDoctor] = useState("");
  const [urgency, setUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [drugs, setDrugs] = useState<DrugLine[]>([{ ...BLANK_DRUG }]);
  const [rxNotes, setRxNotes] = useState("");

  const pending = prescriptions.filter((p) => p.status === "Pending" || p.status === "Processing");
  const dispensed = prescriptions.filter((p) => p.status === "Dispensed");

  const filtered = filterStatus === "All"
    ? prescriptions
    : prescriptions.filter((p) => p.status === filterStatus);

  // Quick fill from active consultations
  const activeConsults = consultations.filter((c) =>
    c.status === "In Progress" || c.status === "Awaiting Results"
  );

  const [selectedPatientKey, setSelectedPatientKey] = useState("");

  function handlePatientSelect(key: string) {
    setSelectedPatientKey(key);
    if (key.startsWith("NP-")) {
      const p = allPatients.find((x) => `NP-${x.id}` === key);
      if (p) { setPatient(p.patientName); setPatientId(p.patientId); }
    } else {
      const c = consultations.find((x) => x.id === key);
      if (c) { setPatient(c.patientName); setPatientId(c.patientId); setDoctor(c.doctorName); }
    }
  }

  function openWrite(prefill?: { patient: string; patientId: string; doctor: string }) {
    setSelectedPatientKey("");
    setPatient(prefill?.patient ?? "");
    setPatientId(prefill?.patientId ?? "");
    setDoctor(prefill?.doctor ?? sessionDoctorName);
    setUrgency("Routine");
    setDrugs([{ ...BLANK_DRUG }]);
    setRxNotes("");
    setShowWrite(true);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = drugs.filter((d) => d.name && d.qty);
    if (!patient) { setToast({ message: "Enter patient name.", type: "error" }); return; }
    if (!filled.length) { setToast({ message: "Add at least one medication.", type: "error" }); return; }
    setSubmitting(true);
    setTimeout(() => {
      const prescribedDrugs: PrescribedDrug[] = filled.map((d) => {
        const item = drugList.find((x) => x.name === d.name);
        return { ...d, unitPrice: item?.unitPrice ?? 1.0 };
      });
      const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const rx: SharedPrescription = {
        id: `RX-${Date.now()}`,
        patientName: patient,
        patientId: patientId || `PT-${Date.now().toString().slice(-4)}`,
        doctorName: doctor,
        department: "Doctors",
        urgency,
        drugs: prescribedDrugs,
        notes: rxNotes || undefined,
        createdAt: `${now} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
        status: "Pending",
        totalCost,
      };
      addPrescription(rx);
      setSubmitting(false);
      setShowWrite(false);
      setToast({ message: `Prescription sent to Pharmacy for ${patient} — ${filled.length} medication(s).`, type: "success" });
    }, 700);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Prescriptions" description="Write prescriptions from the pharmacy inventory. All prescriptions go directly to the Pharmacy queue." />
        <Button onClick={() => { setDoctor(sessionDoctorName); openWrite(); }}>+ Write Prescription</Button>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3">
        {[
          { label: "Total Prescriptions", value: prescriptions.length, color: "text-slate-900" },
          { label: "Pending / Processing", value: pending.length, color: pending.length > 0 ? "text-amber-600" : "text-slate-400" },
          { label: "Dispensed", value: dispensed.length, color: "text-emerald-700" },
          { label: "Urgent Rx", value: metrics.urgentPrescriptions, color: metrics.urgentPrescriptions > 0 ? "text-red-700" : "text-slate-400" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick prescribe from active consultation */}
      {activeConsults.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Quick Prescribe for Active Consultations</p>
          <div className="flex flex-wrap gap-2">
            {activeConsults.map((c) => (
              <button key={c.id}
                onClick={() => openWrite({ patient: c.patientName, patientId: c.patientId, doctor: c.doctorName })}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition">
                {c.patientName} — {c.doctorName}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">All Prescriptions → Pharmacy</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a row to view full prescription details.</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["All", "Pending", "Processing", "Dispensed", "Cancelled"].map((f) => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterStatus === f ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Rx ID", "Patient", "Prescribed By", "Medications", "Total Cost", "Notes", "Urgency", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((rx) => (
                <tr key={rx.id} className={`hover:bg-slate-50 cursor-pointer ${rx.urgency === "Urgent" ? "bg-red-50/10" : ""}`}
                  onClick={() => setViewRx(rx)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{rx.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{rx.patientName}</p>
                    <p className="text-[10px] text-slate-400">{rx.patientId}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{rx.doctorName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rx.drugs.slice(0, 2).map((d) => (
                        <span key={d.name} className="rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-xs font-medium">{d.name}</span>
                      ))}
                      {rx.drugs.length > 2 && <span className="text-xs text-slate-400">+{rx.drugs.length - 2} more</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">₦{rx.totalCost?.toFixed(0) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">{rx.notes ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${URGENCY_STYLES[rx.urgency]}`}>{rx.urgency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[rx.status]}`}>{rx.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-violet-600 font-semibold whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setViewRx(rx); }}>View →</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No prescriptions in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Write Prescription Modal ─────────────────────────────────────────── */}
      <Modal open={showWrite} onClose={() => !submitting && setShowWrite(false)}
        title="Write Prescription">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient / doctor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Patient *</label>
              <SearchableSelect
                options={patientOptions}
                value={selectedPatientKey}
                onChange={handlePatientSelect}
                placeholder="Search patient from consultations or wards…"
              />
              {!selectedPatientKey && (
                <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="Or type patient name manually…"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
              )}
              {selectedPatientKey && patient && (
                <p className="mt-1 text-xs text-slate-500">Patient: <strong>{patient}</strong> ({patientId})</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Prescribing Doctor</label>
              <SearchableSelect
                options={doctorOptions}
                value={doctor}
                onChange={setDoctor}
                placeholder="Select doctor…"
                showGroups={false}
              />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Urgency:</span>
              {(["Routine", "Urgent"] as const).map((u) => (
                <button key={u} type="button" onClick={() => setUrgency(u)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${urgency === u
                    ? u === "Urgent" ? "bg-red-600 text-white" : "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {u}
                </button>
              ))}
            </div>
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
                      <SearchableSelect
                        options={drugSelectOptions}
                        value={d.name}
                        onChange={(name) => autoFillDosage(i, name)}
                        placeholder="Search pharmacy drug catalog…"
                      />
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
              <span className="text-sm font-semibold text-violet-800">Estimated Total ({drugs.filter((d) => d.name).length} medication{drugs.filter((d) => d.name).length > 1 ? "s" : ""})</span>
              <span className="text-lg font-bold text-violet-900">₦ {totalCost.toFixed(2)}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Notes / Instructions for Pharmacy & Patient</label>
            <textarea rows={2} placeholder="e.g. Take with food. Complete the full course. Avoid alcohol. Refrigerate after opening."
              value={rxNotes} onChange={(e) => setRxNotes(e.target.value)}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20" />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800">
            ✓ Prescription will be immediately visible in the Pharmacy dispensing queue.
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowWrite(false)} disabled={submitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={submitting}>
              {submitting ? "Sending to Pharmacy…" : "Send Prescription to Pharmacy"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Prescription Detail Modal ────────────────────────────────────────── */}
      {viewRx && (
        <Modal open={!!viewRx} onClose={() => setViewRx(null)}
          title={`Prescription ${viewRx.id}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Patient", value: viewRx.patientName },
                { label: "Patient ID", value: viewRx.patientId },
                { label: "Prescribed By", value: viewRx.doctorName },
                { label: "Date", value: viewRx.createdAt },
              ].map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wide">{row.label}</p>
                  <p className="font-semibold text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Medications</p>
              <div className="space-y-2">
                {viewRx.drugs.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-2.5">
                    <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">{i + 1}</div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-slate-500">{d.dosage} · {d.frequency} · {d.duration} · Qty: {d.qty}</p>
                      <p className="text-violet-700 font-semibold mt-0.5">₦{d.unitPrice.toFixed(2)}/unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {viewRx.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-xs font-bold text-amber-800 mb-1">Notes / Instructions</p>
                <p className="text-xs text-amber-900">{viewRx.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${URGENCY_STYLES[viewRx.urgency]}`}>{viewRx.urgency}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[viewRx.status]}`}>{viewRx.status}</span>
              </div>
              {viewRx.totalCost != null && (
                <span className="text-sm font-bold text-slate-900">Total: ₦{viewRx.totalCost.toFixed(2)}</span>
              )}
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewRx(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
