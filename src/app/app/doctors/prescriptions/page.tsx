"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { useHMSSession } from "@/modules/rbac/hooks";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { addPrescription, getPharmacyDrugList, type PrescribedDrug, type SharedPrescription } from "@/lib/data/pharmacy-store";
import { canDoctorAccessConsultation, canDoctorAccessPatient, getCurrentDoctorSpecialty } from "@/lib/utils/doctor-routing";

type DrugLine = { name: string; dosage: string; frequency: string; duration: string; qty: string };

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Processing: "bg-violet-50 text-violet-700",
  Dispensed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};
const URGENCY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-red-100 text-red-700 font-bold",
};
const FREQ_OPTIONS = ["Once daily", "Twice daily (BD)", "3x/day (TDS)", "4x/day (QDS)", "Every 8 hrs", "Every 12 hrs", "Once nightly", "As needed (PRN)"];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Ongoing"];
const QTY_PRESETS = ["6 tabs", "10 tabs", "14 tabs", "21 caps", "30 tabs", "42 tabs", "60 tabs", "1 vial", "1 bag"];
const BLANK_DRUG: DrugLine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: "" };
const INPUT_CLASS = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

export default function DoctorPrescriptionsPage() {
  const { prescriptions, metrics } = usePharmacyStore();
  const { consultations, doctors } = useDoctorsStore();
  const { allPatients } = useNursesStore();
  const session = useHMSSession();
  const doctorName = session?.full_name ?? "";
  const doctorSpecialty = getCurrentDoctorSpecialty(doctors, doctorName);
  const drugList = getPharmacyDrugList();

  const visibleConsultations = consultations.filter((entry) => canDoctorAccessConsultation(entry, doctorName));
  const visiblePatients = allPatients.filter((entry) => entry.status === "Active" && canDoctorAccessPatient(entry, doctorName, doctorSpecialty));
  const myPrescriptions = prescriptions.filter((entry) => entry.doctorName.trim().toLowerCase() === doctorName.trim().toLowerCase());

  const patientOptions: SelectOption[] = [
    ...visibleConsultations
      .filter((entry) => entry.status === "In Progress" || entry.status === "Awaiting Results")
      .map((entry) => ({
        value: entry.patientId,
        label: entry.patientName,
        sublabel: `${entry.patientId} · ${entry.consultType}`,
        group: "Consultations",
      })),
    ...visiblePatients
      .filter((entry) => !visibleConsultations.some((consultation) => consultation.patientId === entry.patientId))
      .map((entry) => ({
        value: entry.patientId,
        label: entry.patientName,
        sublabel: `${entry.patientId} · ${entry.unit} · Bed ${entry.bed}`,
        group: "Admitted",
      })),
  ];

  const drugOptions: SelectOption[] = drugList.map((entry) => ({
    value: entry.name,
    label: entry.name,
    sublabel: `N${entry.unitPrice.toFixed(2)}/${entry.unit}`,
    group: entry.category,
  }));

  const [showWrite, setShowWrite] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [urgency, setUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [drugs, setDrugs] = useState<DrugLine[]>([{ ...BLANK_DRUG }]);
  const [notes, setNotes] = useState("");

  const filtered = filterStatus === "All" ? myPrescriptions : myPrescriptions.filter((entry) => entry.status === filterStatus);
  const pending = myPrescriptions.filter((entry) => entry.status === "Pending" || entry.status === "Processing");
  const dispensed = myPrescriptions.filter((entry) => entry.status === "Dispensed");
  const totalCost = drugs.reduce((sum, drug) => {
    const qty = parseInt(drug.qty, 10) || 0;
    const item = drugList.find((entry) => entry.name === drug.name);
    return sum + qty * (item?.unitPrice ?? 0);
  }, 0);

  function openWrite(prefill?: { patientId: string; patientName: string }) {
    setSelectedPatientId(prefill?.patientId ?? "");
    setPatientName(prefill?.patientName ?? "");
    setUrgency("Routine");
    setDrugs([{ ...BLANK_DRUG }]);
    setNotes("");
    setShowWrite(true);
  }

  function handlePatientSelect(patientId: string) {
    setSelectedPatientId(patientId);
    const fromConsult = visibleConsultations.find((entry) => entry.patientId === patientId);
    const fromWard = visiblePatients.find((entry) => entry.patientId === patientId);
    setPatientName(fromConsult?.patientName ?? fromWard?.patientName ?? "");
  }

  function updateDrug(index: number, field: keyof DrugLine, value: string) {
    setDrugs((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [field]: value } : entry)));
  }

  function autoFillDosage(index: number, name: string) {
    const item = drugList.find((entry) => entry.name === name);
    if (item) {
      setDrugs((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, name, dosage: item.defaultDosage } : entry)));
      return;
    }
    updateDrug(index, "name", name);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!doctorName) {
      setToast({ message: "Doctor session is missing. Sign in again before writing a prescription.", type: "error" });
      return;
    }
    if (!patientName) {
      setToast({ message: "Select a patient before sending a prescription.", type: "error" });
      return;
    }
    const filled = drugs.filter((entry) => entry.name && entry.qty);
    if (filled.length === 0) {
      setToast({ message: "Add at least one medication.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const payload: SharedPrescription = {
        id: `RX-${Date.now()}`,
        patientName,
        patientId: selectedPatientId || `PT-${Date.now().toString().slice(-4)}`,
        doctorName,
        department: "Doctors",
        urgency,
        drugs: filled.map((entry) => {
          const item = drugList.find((drug) => drug.name === entry.name);
          return { ...entry, unitPrice: item?.unitPrice ?? 0 } as PrescribedDrug;
        }),
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
        status: "Pending",
        totalCost,
      };
      await addPrescription(payload);
      setShowWrite(false);
      setToast({ message: `Prescription sent to Pharmacy for ${patientName}.`, type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setToast({ message: `Could not send prescription for ${patientName}: ${message}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Prescriptions" description={doctorName ? `Pharmacy requests written by ${doctorName}.` : "Doctor prescriptions routed to Pharmacy."} />
        <Button onClick={() => openWrite()}>+ Write Prescription</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Prescriptions", value: myPrescriptions.length, color: "text-slate-900" },
          { label: "Pending / Processing", value: pending.length, color: pending.length > 0 ? "text-amber-600" : "text-slate-400" },
          { label: "Dispensed", value: dispensed.length, color: "text-emerald-700" },
          { label: "Urgent Rx", value: metrics.urgentPrescriptions, color: metrics.urgentPrescriptions > 0 ? "text-red-700" : "text-slate-400" },
        ].map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      {visibleConsultations.filter((entry) => entry.status === "In Progress" || entry.status === "Awaiting Results").length > 0 ? (
        <Card className="p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Quick Prescribe</p>
          <div className="flex flex-wrap gap-2">
            {visibleConsultations
              .filter((entry) => entry.status === "In Progress" || entry.status === "Awaiting Results")
              .map((entry) => (
                <button key={entry.id} onClick={() => openWrite({ patientId: entry.patientId, patientName: entry.patientName })} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
                  {entry.patientName}
                </button>
              ))}
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">My Prescriptions</h3>
            <p className="mt-0.5 text-xs text-slate-400">Only prescriptions written by the logged-in doctor appear here.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", "Pending", "Processing", "Dispensed", "Cancelled"].map((status) => (
              <button key={status} onClick={() => setFilterStatus(status)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterStatus === status ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Rx ID", "Patient", "Medications", "Total", "Urgency", "Status"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{entry.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{entry.patientName}</p>
                    <p className="text-[10px] text-slate-400">{entry.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {entry.drugs.slice(0, 2).map((drug) => <span key={drug.name} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{drug.name}</span>)}
                      {entry.drugs.length > 2 ? <span className="text-xs text-slate-400">+{entry.drugs.length - 2} more</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">N{entry.totalCost?.toFixed(0) ?? "--"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${URGENCY_STYLES[entry.urgency]}`}>{entry.urgency}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[entry.status]}`}>{entry.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">No prescriptions in this category.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showWrite} onClose={() => !submitting && setShowWrite(false)} title="Write Prescription">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Patient *</label>
            <SearchableSelect options={patientOptions} value={selectedPatientId} onChange={handlePatientSelect} placeholder="Search your consultations or admitted patients..." />
            {!selectedPatientId ? <input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Or type patient name manually..." className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" /> : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">{doctorName || "Doctor session missing"}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Urgency:</span>
            {(["Routine", "Urgent"] as const).map((entry) => <button key={entry} type="button" onClick={() => setUrgency(entry)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${urgency === entry ? entry === "Urgent" ? "bg-red-600 text-white" : "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{entry}</button>)}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Medications</span>
              <button type="button" onClick={() => setDrugs((prev) => [...prev, { ...BLANK_DRUG }])} className="text-xs font-semibold text-violet-600 hover:underline">+ Add medication</button>
            </div>
            {drugs.map((drug, index) => (
              <div key={`${drug.name}-${index}`} className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
                <SearchableSelect options={drugOptions} value={drug.name} onChange={(value) => autoFillDosage(index, value)} placeholder="Search pharmacy drug catalog..." />
                <div className="grid grid-cols-2 gap-2">
                  <input value={drug.dosage} onChange={(event) => updateDrug(index, "dosage", event.target.value)} placeholder="Dosage" className={INPUT_CLASS} />
                  <input list={`qty-${index}`} value={drug.qty} onChange={(event) => updateDrug(index, "qty", event.target.value)} placeholder="Quantity" className={INPUT_CLASS} />
                  <datalist id={`qty-${index}`}>{QTY_PRESETS.map((preset) => <option key={preset} value={preset} />)}</datalist>
                  <select value={drug.frequency} onChange={(event) => updateDrug(index, "frequency", event.target.value)} className={INPUT_CLASS}>{FREQ_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                  <select value={drug.duration} onChange={(event) => updateDrug(index, "duration", event.target.value)} className={INPUT_CLASS}>{DURATION_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
                </div>
              </div>
            ))}
          </div>
          {totalCost > 0 ? <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-4 py-2"><span className="text-sm font-semibold text-violet-800">Estimated total</span><span className="text-lg font-bold text-violet-900">N {totalCost.toFixed(2)}</span></div> : null}
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Instructions for Pharmacy or patient..." className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20" />
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowWrite(false)} disabled={submitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Prescription to Pharmacy"}</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
