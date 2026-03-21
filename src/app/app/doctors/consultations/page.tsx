"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { addPrescription, getPharmacyDrugList, type PrescribedDrug, type SharedPrescription } from "@/lib/data/pharmacy-store";
import { addConsultationFee, type ConsultationFee } from "@/lib/data/accounts-store";
import { addLabTest, getTestCatalog, type TestPriority } from "@/lib/data/lab-store";
import { addAdmissionOrder, updateConsultation, type AdmissionUnit } from "@/lib/data/doctors-store";
import { canDoctorAccessConsultation } from "@/lib/utils/doctor-routing";
import { useBillingPresets } from "@/lib/hooks/use-billing-presets";

type ConsultType = "General" | "Specialist" | "Emergency" | "Follow-up" | "Antenatal";
type DrugLine = { name: string; dosage: string; frequency: string; duration: string; qty: string };
type LabLine = { testCode: string; priority: TestPriority };

const FREQ_OPTIONS = [
  "Once daily",
  "Twice daily (BD)",
  "3x/day (TDS)",
  "4x/day (QDS)",
  "Every 8 hrs (8hrly)",
  "Every 12 hrs (12hrly)",
  "Once nightly",
  "As needed (PRN)",
];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Ongoing"];
const QTY_PRESETS = ["6 tabs", "10 tabs", "14 tabs", "21 caps", "30 tabs", "42 tabs", "60 tabs", "1 vial", "1 bag", "5 sachets"];
const BLANK_DRUG: DrugLine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: "" };
const BLANK_LAB: LabLine = { testCode: "", priority: "Routine" };
const INPUT_CLASS = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

function formatDate(value?: string) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameCalendarDay(left?: string, right?: string) {
  if (!left || !right) return false;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (!Number.isNaN(leftDate.getTime()) && !Number.isNaN(rightDate.getTime())) {
    return (
      leftDate.getFullYear() === rightDate.getFullYear() &&
      leftDate.getMonth() === rightDate.getMonth() &&
      leftDate.getDate() === rightDate.getDate()
    );
  }
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function DoctorsConsultationsPage() {
  const session = useHMSSession();
  const doctorName = session?.full_name ?? "";
  const { consultations: storeConsultations } = useDoctorsStore();
  const { consultationFees } = useAccountsStore();
  const { getByCategory, getAmount } = useBillingPresets();
  const drugList = getPharmacyDrugList();
  const testCatalog = getTestCatalog();

  const consultPresets = getByCategory("consultation");
  const consultTypes = (
    consultPresets.length > 0
      ? consultPresets.map((preset) => preset.name)
      : ["General", "Specialist", "Emergency", "Follow-up", "Antenatal"]
  ) as ConsultType[];

  const consultations = [...storeConsultations]
    .filter((entry) => canDoctorAccessConsultation(entry, doctorName))
    .sort((left, right) => {
      const leftTime = new Date(left.date).getTime();
      const rightTime = new Date(right.date).getTime();
      if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) return rightTime - leftTime;
      return right.date.localeCompare(left.date);
    });

  const [toast, setToast] = useState<ToastData | null>(null);
  const [rxTarget, setRxTarget] = useState<(typeof consultations)[number] | null>(null);
  const [urgency, setUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [drugs, setDrugs] = useState<DrugLine[]>([{ ...BLANK_DRUG }]);
  const [rxNotes, setRxNotes] = useState("");
  const [rxSubmitting, setRxSubmitting] = useState(false);

  const [feeTarget, setFeeTarget] = useState<(typeof consultations)[number] | null>(null);
  const [consultType, setConsultType] = useState<ConsultType>("General");
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  const [labTarget, setLabTarget] = useState<(typeof consultations)[number] | null>(null);
  const [labLines, setLabLines] = useState<LabLine[]>([{ ...BLANK_LAB }]);
  const [labClinicalNotes, setLabClinicalNotes] = useState("");
  const [labSubmitting, setLabSubmitting] = useState(false);

  const [admitTarget, setAdmitTarget] = useState<(typeof consultations)[number] | null>(null);
  const [admissionUnit, setAdmissionUnit] = useState<AdmissionUnit>("Ward");
  const [admissionReason, setAdmissionReason] = useState("");
  const [admitSubmitting, setAdmitSubmitting] = useState(false);

  const stats = {
    inProgress: consultations.filter((entry) => entry.status === "In Progress").length,
    completed: consultations.filter((entry) => entry.status === "Completed" || entry.status === "Admitted").length,
    rxWritten: consultations.filter((entry) => entry.rxWritten).length,
    labOrdered: consultations.filter((entry) => entry.labOrdered).length,
  };

  function consultationHasFee(consultationId: string) {
    const consultation = consultations.find((entry) => entry.id === consultationId);
    if (!consultation) return false;
    return consultationFees.some(
      (entry) =>
        entry.patientId === consultation.patientId &&
        entry.doctorName.trim().toLowerCase() === consultation.doctorName.trim().toLowerCase() &&
        isSameCalendarDay(entry.consultedAt, consultation.date),
    );
  }

  function updateDrug(index: number, field: keyof DrugLine, value: string) {
    setDrugs((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [field]: value } : entry)));
  }

  function updateLabLine(index: number, field: keyof LabLine, value: string) {
    setLabLines((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [field]: value } : entry)));
  }

  function autoFillDosage(index: number, name: string) {
    const item = drugList.find((entry) => entry.name === name);
    if (item) {
      setDrugs((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, name, dosage: item.defaultDosage } : entry)));
      return;
    }
    updateDrug(index, "name", name);
  }

  const totalDrugCost = drugs.reduce((sum, drug) => {
    const qty = parseInt(drug.qty, 10) || 0;
    const item = drugList.find((entry) => entry.name === drug.name);
    return sum + qty * (item?.unitPrice ?? 0);
  }, 0);

  async function handleSubmitRx(event: React.FormEvent) {
    event.preventDefault();
    if (!rxTarget) return;
    if (!doctorName) {
      setToast({ message: "Doctor session is missing. Sign in again before writing a prescription.", type: "error" });
      return;
    }

    const filled = drugs.filter((drug) => drug.name && drug.qty);
    if (filled.length === 0) {
      setToast({ message: "Add at least one medication with a quantity.", type: "error" });
      return;
    }

    setRxSubmitting(true);
    const prescription: SharedPrescription = {
      id: `RX-${Date.now()}`,
      patientName: rxTarget.patientName,
      patientId: rxTarget.patientId,
      doctorName,
      department: "Doctors",
      urgency,
      drugs: filled.map((drug) => {
        const item = drugList.find((entry) => entry.name === drug.name);
        return { ...drug, unitPrice: item?.unitPrice ?? 0 } as PrescribedDrug;
      }),
      notes: rxNotes || undefined,
      createdAt: new Date().toISOString(),
      status: "Pending",
      totalCost: totalDrugCost,
    };

    try {
      await addPrescription(prescription);
      try {
        await updateConsultation(rxTarget.id, { rxWritten: true });
      } catch (error) {
        throw new Error(`Pharmacy received the prescription, but the consultation record could not be updated: ${toErrorMessage(error)}`);
      }
      setRxTarget(null);
      setToast({ message: `Prescription sent to Pharmacy for ${rxTarget.patientName}.`, type: "success" });
    } catch (error) {
      setToast({ message: `Could not send prescription for ${rxTarget.patientName}: ${toErrorMessage(error)}`, type: "error" });
    } finally {
      setRxSubmitting(false);
    }
  }

  async function handleSubmitFee() {
    if (!feeTarget) return;
    if (!doctorName) {
      setToast({ message: "Doctor session is missing. Sign in again before billing a consultation fee.", type: "error" });
      return;
    }

    const feeRecord: ConsultationFee = {
      id: `CF-${feeTarget.id}`,
      patientName: feeTarget.patientName,
      patientId: feeTarget.patientId,
      doctorName,
      consultationType: consultType,
      fee: getAmount("consultation", consultType, 100),
      consultedAt: new Date().toISOString(),
      status: "Pending",
    };

    setFeeSubmitting(true);
    try {
      await addConsultationFee(feeRecord);
      setFeeTarget(null);
      setToast({ message: `Consultation fee sent to Accounts for ${feeTarget.patientName}.`, type: "success" });
    } catch (error) {
      setToast({ message: `Could not bill consultation fee for ${feeTarget.patientName}: ${toErrorMessage(error)}`, type: "error" });
    } finally {
      setFeeSubmitting(false);
    }
  }

  async function handleOrderLab() {
    if (!labTarget) return;
    if (!doctorName) {
      setToast({ message: "Doctor session is missing. Sign in again before ordering lab tests.", type: "error" });
      return;
    }

    const filled = labLines.filter((line) => line.testCode);
    if (filled.length === 0) {
      setToast({ message: "Select at least one test.", type: "error" });
      return;
    }

    setLabSubmitting(true);
    let sentCount = 0;

    try {
      for (const line of filled) {
        const catalogItem = testCatalog.find((entry) => entry.code === line.testCode);
        if (!catalogItem) {
          throw new Error(`Test catalog entry ${line.testCode} was not found.`);
        }

        try {
          await addLabTest({
            id: `LAB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            patientName: labTarget.patientName,
            patientId: labTarget.patientId,
            testName: catalogItem.name,
            testCode: catalogItem.code,
            category: catalogItem.category,
            orderedBy: doctorName,
            orderedAt: new Date().toISOString(),
            priority: line.priority,
            status: "Pending",
            sampleType: catalogItem.sampleType,
            price: catalogItem.price,
            billStatus: "Pending",
            resultNotes: labClinicalNotes || undefined,
          });
          sentCount += 1;
        } catch (error) {
          if (sentCount > 0) {
            throw new Error(`${sentCount} test(s) reached Lab before ${catalogItem.name} failed: ${toErrorMessage(error)}`);
          }
          throw new Error(`Could not send ${catalogItem.name} to Lab: ${toErrorMessage(error)}`);
        }
      }

      try {
        await updateConsultation(labTarget.id, { labOrdered: true });
      } catch (error) {
        throw new Error(`Lab received the order, but the consultation record could not be updated: ${toErrorMessage(error)}`);
      }

      setLabTarget(null);
      setToast({ message: `${sentCount} lab test(s) sent to Lab for ${labTarget.patientName}.`, type: "success" });
    } catch (error) {
      setToast({ message: `Could not complete lab order for ${labTarget.patientName}: ${toErrorMessage(error)}`, type: "error" });
    } finally {
      setLabSubmitting(false);
    }
  }

  async function handleSubmitAdmission() {
    if (!admitTarget) return;
    if (!doctorName) {
      setToast({ message: "Doctor session is missing. Sign in again before creating an admission order.", type: "error" });
      return;
    }
    if (!admissionReason.trim()) {
      setToast({ message: "Admission reason is required.", type: "error" });
      return;
    }

    setAdmitSubmitting(true);
    try {
      await addAdmissionOrder({
        id: `ADM-${Date.now().toString().slice(-6)}`,
        patientName: admitTarget.patientName,
        patientId: admitTarget.patientId,
        orderedBy: doctorName,
        unit: admissionUnit,
        reason: admissionReason.trim(),
        orderedAt: new Date().toISOString(),
        status: "Pending",
      });

      try {
        await updateConsultation(admitTarget.id, {
          admissionOrdered: true,
          admissionUnit,
          status: "Admitted",
        });
      } catch (error) {
        throw new Error(`Nurses received the admission order, but the consultation record could not be updated: ${toErrorMessage(error)}`);
      }

      setToast({ message: `Admission order sent to ${admissionUnit} for ${admitTarget.patientName}.`, type: "success" });
      setAdmitTarget(null);
      setAdmissionUnit("Ward");
      setAdmissionReason("");
    } catch (error) {
      setToast({ message: `Could not admit ${admitTarget.patientName}: ${toErrorMessage(error)}`, type: "error" });
    } finally {
      setAdmitSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        description={
          doctorName
            ? `Consultations assigned to ${doctorName}. Prescriptions, lab orders, and consultation fees are routed from here.`
            : "Consultations assigned to the logged-in doctor."
        }
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        Consultation billing rates are managed centrally and applied here automatically. Doctors cannot edit billing presets from this portal.
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { label: "In Progress", value: stats.inProgress, color: "bg-sky-50 text-sky-700 border border-sky-200" },
          { label: "Completed", value: stats.completed, color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
          { label: "Rx Written", value: stats.rxWritten, color: "bg-violet-50 text-violet-700 border border-violet-200" },
          { label: "Lab Ordered", value: stats.labOrdered, color: "bg-amber-50 text-amber-700 border border-amber-200" },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${stat.color}`}>
            <span className="text-lg font-bold">{stat.value}</span>
            <span className="font-medium opacity-80">{stat.label}</span>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">My Consultations</h3>
          <p className="mt-0.5 text-xs text-slate-400">Only your consultations are shown here. Success is only shown after the recipient write completes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Patient", "Complaint", "Date", "Status", "Rx", "Lab", "Billing", "Actions"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultations.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{row.patientName}</p>
                    <p className="text-xs text-slate-400">{row.patientId}</p>
                  </td>
                  <td className="max-w-[260px] px-5 py-3 text-xs text-slate-500">
                    <p className="truncate">{row.chiefComplaint || row.diagnosis || "--"}</p>
                    {row.notes ? <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{row.notes}</p> : null}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge variant={row.status === "Completed" || row.status === "Admitted" ? "success" : row.status === "Awaiting Results" ? "warning" : "info"}>
                      {row.status}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-3">{row.rxWritten ? <span className="text-xs font-semibold text-violet-700">Sent</span> : <span className="text-xs text-slate-300">--</span>}</td>
                  <td className="px-5 py-3">{row.labOrdered ? <span className="text-xs font-semibold text-sky-700">Ordered</span> : <span className="text-xs text-slate-300">--</span>}</td>
                  <td className="px-5 py-3">{consultationHasFee(row.id) ? <span className="text-xs font-semibold text-emerald-700">Sent</span> : <span className="text-xs text-slate-300">--</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => { setRxTarget(row); setUrgency("Routine"); setDrugs([{ ...BLANK_DRUG }]); setRxNotes(""); }} className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-700">
                        {row.rxWritten ? "Re-prescribe" : "Write Rx"}
                      </button>
                      <button type="button" onClick={() => { setLabTarget(row); setLabLines([{ ...BLANK_LAB }]); setLabClinicalNotes(""); }} className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-sky-700">
                        Order Lab
                      </button>
                      {row.admissionOrdered ? (
                        <span className="text-xs font-semibold text-red-700">Admission sent</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAdmitTarget(row);
                            setAdmissionUnit(row.admissionUnit ?? "Ward");
                            setAdmissionReason(row.diagnosis || row.chiefComplaint || "");
                          }}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          Admit
                        </button>
                      )}
                      {consultationHasFee(row.id) ? (
                        <span className="text-xs font-semibold text-emerald-700">Fee sent</span>
                      ) : (
                        <button type="button" onClick={() => { setFeeTarget(row); setConsultType(["General", "Specialist", "Emergency", "Follow-up", "Antenatal"].includes(row.consultType) ? (row.consultType as ConsultType) : "General"); }} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
                          Bill Fee
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {consultations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                    No consultations are currently assigned to this doctor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!rxTarget} onClose={() => !rxSubmitting && setRxTarget(null)} title={`Write Prescription - ${rxTarget?.patientName ?? ""}`}>
        <form onSubmit={handleSubmitRx} className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="text-slate-500">Patient:</span>
              <span className="font-semibold text-slate-900">{rxTarget?.patientName}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Doctor:</span>
              <span className="font-semibold text-slate-900">{doctorName || "--"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Urgency:</span>
            {(["Routine", "Urgent"] as const).map((entry) => (
              <button key={entry} type="button" onClick={() => setUrgency(entry)} className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${urgency === entry ? entry === "Urgent" ? "bg-red-600 text-white" : "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {entry}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Medications</span>
              <button type="button" onClick={() => setDrugs((prev) => [...prev, { ...BLANK_DRUG }])} className="text-xs font-semibold text-violet-600 hover:underline">
                + Add medication
              </button>
            </div>
            {drugs.map((drug, index) => {
              const item = drugList.find((entry) => entry.name === drug.name);
              const qty = parseInt(drug.qty, 10) || 0;
              return (
                <div key={`${drug.name}-${index}`} className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drug {index + 1}</span>
                    {drugs.length > 1 ? <button type="button" onClick={() => setDrugs((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-500 hover:text-red-700">Remove</button> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">Medication *</label>
                      <SearchableSelect
                        value={drug.name}
                        onChange={(val) => autoFillDosage(index, val)}
                        placeholder="- Select from inventory -"
                        showGroups
                        options={drugList.map((entry) => ({
                          value: entry.name,
                          label: entry.name,
                          sublabel: `N${entry.unitPrice.toFixed(2)}/${entry.unit}`,
                          group: entry.category,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Dosage *</label>
                      <input type="text" value={drug.dosage} onChange={(event) => updateDrug(index, "dosage", event.target.value)} required className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Quantity *</label>
                      <input type="text" list={`qty-opts-${index}`} value={drug.qty} onChange={(event) => updateDrug(index, "qty", event.target.value)} required className={INPUT_CLASS} />
                      <datalist id={`qty-opts-${index}`}>{QTY_PRESETS.map((preset) => <option key={preset} value={preset} />)}</datalist>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                      <select value={drug.frequency} onChange={(event) => updateDrug(index, "frequency", event.target.value)} className={INPUT_CLASS}>
                        {FREQ_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Duration</label>
                      <select value={drug.duration} onChange={(event) => updateDrug(index, "duration", event.target.value)} className={INPUT_CLASS}>
                        {DURATION_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                      </select>
                    </div>
                    {item && qty > 0 ? <div className="col-span-2 flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-800"><span>N{item.unitPrice.toFixed(2)} x {qty} {item.unit}s</span><strong>= N{(item.unitPrice * qty).toFixed(2)}</strong></div> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {totalDrugCost > 0 ? <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 px-4 py-2"><span className="text-sm font-semibold text-violet-800">Estimated total</span><span className="text-lg font-bold text-violet-900">N {totalDrugCost.toFixed(2)}</span></div> : null}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Notes / Instructions</label>
            <textarea value={rxNotes} onChange={(event) => setRxNotes(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20" />
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setRxTarget(null)} disabled={rxSubmitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={rxSubmitting}>{rxSubmitting ? "Sending..." : "Send Prescription to Pharmacy"}</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={!!feeTarget} onClose={() => !feeSubmitting && setFeeTarget(null)} title={`Bill Consultation Fee - ${feeTarget?.patientName ?? ""}`}>
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{feeTarget?.patientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span>{doctorName || "--"}</span></div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Consultation Type</label>
            <div className="grid grid-cols-2 gap-2">
              {consultTypes.map((entry) => (
                <button key={entry} type="button" onClick={() => setConsultType(entry)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${consultType === entry ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/30" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <span className="text-sm font-medium text-slate-800">{entry}</span>
                  <span className={`text-sm font-bold ${consultType === entry ? "text-emerald-700" : "text-slate-600"}`}>N{getAmount("consultation", entry, 100)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="text-sm font-semibold text-emerald-800">Fee to bill</span>
            <span className="text-xl font-bold text-emerald-900">N{getAmount("consultation", consultType, 100)}</span>
          </div>
          <p className="text-xs text-slate-500">Accounts will receive this charge only after the write succeeds.</p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setFeeTarget(null)} disabled={feeSubmitting}>Cancel</Button>
          <Button size="md" type="button" onClick={() => void handleSubmitFee()} disabled={feeSubmitting}>{feeSubmitting ? "Sending..." : "Send Fee to Accounts"}</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!labTarget} onClose={() => !labSubmitting && setLabTarget(null)} title={`Order Lab Tests - ${labTarget?.patientName ?? ""}`}>
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{labTarget?.patientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ordered by</span><span>{doctorName || "--"}</span></div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Tests</span>
              <button type="button" onClick={() => setLabLines((prev) => [...prev, { ...BLANK_LAB }])} className="text-xs font-semibold text-sky-600 hover:underline">
                + Add test
              </button>
            </div>
            {labLines.map((line, index) => {
              const selected = testCatalog.find((entry) => entry.code === line.testCode);
              return (
                <div key={`${line.testCode}-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Test {index + 1}</span>
                    {labLines.length > 1 ? <button type="button" onClick={() => setLabLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-500 hover:text-red-700">Remove</button> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">Test *</label>
                      <SearchableSelect
                        value={line.testCode}
                        onChange={(val) => updateLabLine(index, "testCode", val)}
                        placeholder="- Choose a test -"
                        showGroups
                        options={testCatalog.map((entry) => ({
                          value: entry.code,
                          label: entry.name,
                          sublabel: `${entry.code} · N${entry.price}`,
                          group: entry.category,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Priority</label>
                      <div className="flex gap-1">
                        {(["Routine", "Urgent", "STAT"] as const).map((entry) => (
                          <button key={entry} type="button" onClick={() => updateLabLine(index, "priority", entry)} className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold transition ${line.priority === entry ? entry === "STAT" ? "border-red-400 bg-red-50 text-red-700" : entry === "Urgent" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                            {entry}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selected ? <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800"><div><strong>Sample:</strong> {selected.sampleType}</div><div><strong>TAT:</strong> {selected.turnaroundHours < 1 ? `${selected.turnaroundHours * 60} min` : `${selected.turnaroundHours} hr`}</div></div> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Clinical Notes / Indication</label>
            <textarea value={labClinicalNotes} onChange={(event) => setLabClinicalNotes(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200" />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setLabTarget(null)} disabled={labSubmitting}>Cancel</Button>
          <Button size="md" disabled={labSubmitting || !labLines.some((line) => line.testCode)} onClick={() => void handleOrderLab()}>{labSubmitting ? "Sending..." : "Send to Lab"}</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!admitTarget} onClose={() => !admitSubmitting && setAdmitTarget(null)} title={`Admit Patient - ${admitTarget?.patientName ?? ""}`}>
        <div className="space-y-4">
          <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{admitTarget?.patientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Patient ID</span><span>{admitTarget?.patientId || "--"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span>{doctorName || "--"}</span></div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Admission Unit</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Ward", "ICU", "Emergency"] as AdmissionUnit[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setAdmissionUnit(entry)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    admissionUnit === entry
                      ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-400/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Reason for Admission</label>
            <textarea
              value={admissionReason}
              onChange={(event) => setAdmissionReason(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
              placeholder="Clinical reason, initial plan, or monitoring requirement..."
            />
          </div>
          <p className="text-xs text-slate-500">Nurses will only see this as a pending admission until they accept the patient into the target unit.</p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setAdmitTarget(null)} disabled={admitSubmitting}>Cancel</Button>
          <Button size="md" type="button" onClick={() => void handleSubmitAdmission()} disabled={admitSubmitting || !admissionReason.trim()}>
            {admitSubmitting ? "Sending..." : `Send to ${admissionUnit}`}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
