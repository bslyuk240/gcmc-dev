"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { addAdmissionOrder, updateConsultation, type AdmissionUnit } from "@/lib/data/doctors-store";
import { addLabTest, getTestCatalog, type TestPriority } from "@/lib/data/lab-store";
import {
  addPrescription,
  getPharmacyDrugList,
  type PrescribedDrug,
  type SharedPrescription,
} from "@/lib/data/pharmacy-store";
import type { WardPatient } from "@/lib/data/nurses-store";
import { canDoctorAccessConsultation, canDoctorAccessPatient, getCurrentDoctorSpecialty } from "@/lib/utils/doctor-routing";

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

const FREQ_OPTIONS = [
  "Once daily",
  "Twice daily (BD)",
  "3x/day (TDS)",
  "4x/day (QDS)",
  "Every 8 hrs",
  "Every 12 hrs",
  "Once nightly",
  "As needed (PRN)",
];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "30 days", "Ongoing"];
const QTY_PRESETS = ["6 tabs", "10 tabs", "14 tabs", "21 caps", "30 tabs", "42 tabs", "1 vial", "1 bag"];

type DrugLine = { name: string; dosage: string; frequency: string; duration: string; qty: string };
type LabLine = { testCode: string; priority: TestPriority };
type AdmissionSelection = {
  patientName: string;
  patientId: string;
  diagnosis: string;
  source: "consultation" | "outpatient";
  consultationId?: string;
};

const BLANK_DRUG: DrugLine = { name: "", dosage: "", frequency: "Once daily", duration: "7 days", qty: "" };
const BLANK_LAB: LabLine = { testCode: "", priority: "Routine" };
const INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

function MobileMeta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatOrderTime(value?: string) {
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

export default function DoctorAdmittedPatientsPage() {
  const session = useHMSSession();
  const doctorName = session?.full_name ?? "";
  const { allPatients, hydrated: nursesHydrated } = useNursesStore();
  const { admissionOrders, doctors, consultations, hydrated: doctorsHydrated } = useDoctorsStore();
  const doctorSpecialty = getCurrentDoctorSpecialty(doctors, doctorName);
  const drugList = getPharmacyDrugList();
  const testCatalog = getTestCatalog();

  const [toast, setToast] = useState<ToastData | null>(null);
  const [showAdmit, setShowAdmit] = useState(false);
  const [admitPatientId, setAdmitPatientId] = useState("");
  const [admitUnit, setAdmitUnit] = useState<AdmissionUnit>("Ward");
  const [admitReason, setAdmitReason] = useState("");
  const [admitSubmitting, setAdmitSubmitting] = useState(false);

  const [viewPatient, setViewPatient] = useState<WardPatient | null>(null);
  const [orderTab, setOrderTab] = useState<"lab" | "rx" | null>(null);
  const [labLines, setLabLines] = useState<LabLine[]>([{ ...BLANK_LAB }]);
  const [labNotes, setLabNotes] = useState("");
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [rxUrgency, setRxUrgency] = useState<"Routine" | "Urgent">("Routine");
  const [drugs, setDrugs] = useState<DrugLine[]>([{ ...BLANK_DRUG }]);
  const [rxNotes, setRxNotes] = useState("");
  const [rxSubmitting, setRxSubmitting] = useState(false);

  const visibleConsultations = useMemo(
    () =>
      [...consultations]
        .filter((entry) => canDoctorAccessConsultation(entry, doctorName))
        .sort((left, right) => toTimestamp(right.date) - toTimestamp(left.date)),
    [consultations, doctorName],
  );

  const visibleOutpatientPatients = useMemo(
    () =>
      [...allPatients]
        .filter(
          (patient) =>
            patient.unit === "Outpatient" &&
            patient.status === "Active" &&
            canDoctorAccessPatient(patient, doctorName, doctorSpecialty),
        )
        .sort((left, right) => left.patientName.localeCompare(right.patientName)),
    [allPatients, doctorName, doctorSpecialty],
  );

  const admittedPatients = useMemo(
    () =>
      [...allPatients]
        .filter(
          (patient) =>
            patient.status === "Active" &&
            ["Ward", "ICU", "Emergency"].includes(patient.unit) &&
            canDoctorAccessPatient(patient, doctorName, doctorSpecialty),
        )
        .sort((left, right) => toTimestamp(right.admittedAt) - toTimestamp(left.admittedAt)),
    [allPatients, doctorName, doctorSpecialty],
  );

  const criticalPatients = admittedPatients.filter((patient) => patient.priority === "Critical" || patient.priority === "High");
  const byUnit = {
    ICU: admittedPatients.filter((patient) => patient.unit === "ICU"),
    Ward: admittedPatients.filter((patient) => patient.unit === "Ward"),
    Emergency: admittedPatients.filter((patient) => patient.unit === "Emergency"),
  };

  const admitPatientOptions = useMemo(() => {
    const options: SelectOption[] = [];
    const seen = new Set<string>();

    visibleConsultations
      .filter((consultation) => !consultation.admissionOrdered)
      .forEach((consultation) => {
        if (seen.has(consultation.patientId)) return;
        seen.add(consultation.patientId);
        options.push({
          value: consultation.patientId,
          label: consultation.patientName,
          sublabel: `${consultation.patientId} · ${consultation.consultType}`,
          group: "Consultations",
        });
      });

    visibleOutpatientPatients.forEach((patient) => {
      if (seen.has(patient.patientId)) return;
      seen.add(patient.patientId);
      options.push({
        value: patient.patientId,
        label: patient.patientName,
        sublabel: `${patient.patientId} · ${patient.diagnosis || "Outpatient queue"}`,
        group: "Outpatient Queue",
      });
    });

    return options;
  }, [visibleConsultations, visibleOutpatientPatients]);

  const selectedAdmissionConsultation = useMemo(
    () =>
      visibleConsultations.find(
        (consultation) => consultation.patientId === admitPatientId && !consultation.admissionOrdered,
      ),
    [admitPatientId, visibleConsultations],
  );

  const selectedAdmissionOutpatient = useMemo(
    () => visibleOutpatientPatients.find((patient) => patient.patientId === admitPatientId),
    [admitPatientId, visibleOutpatientPatients],
  );

  const selectedAdmissionPatient: AdmissionSelection | null = selectedAdmissionConsultation
    ? {
        patientName: selectedAdmissionConsultation.patientName,
        patientId: selectedAdmissionConsultation.patientId,
        diagnosis:
          selectedAdmissionConsultation.diagnosis ||
          selectedAdmissionConsultation.chiefComplaint ||
          "Consultation patient",
        source: "consultation",
        consultationId: selectedAdmissionConsultation.id,
      }
    : selectedAdmissionOutpatient
      ? {
          patientName: selectedAdmissionOutpatient.patientName,
          patientId: selectedAdmissionOutpatient.patientId,
          diagnosis: selectedAdmissionOutpatient.diagnosis || "Outpatient queue patient",
          source: "outpatient",
        }
      : null;

  const myAdmissionOrders = useMemo(
    () =>
      [...admissionOrders]
        .filter((order) => order.orderedBy.trim().toLowerCase() === doctorName.trim().toLowerCase())
        .sort((left, right) => toTimestamp(right.orderedAt) - toTimestamp(left.orderedAt)),
    [admissionOrders, doctorName],
  );

  const totalDrugCost = drugs.reduce((sum, drug) => {
    const item = drugList.find((entry) => entry.name === drug.name);
    const qty = parseInt(drug.qty, 10) || 0;
    return sum + qty * (item?.unitPrice ?? 0);
  }, 0);

  function resetAdmissionModal() {
    setShowAdmit(false);
    setAdmitPatientId("");
    setAdmitUnit("Ward");
    setAdmitReason("");
    setAdmitSubmitting(false);
  }

  function openOrders(patient: WardPatient) {
    setViewPatient(patient);
    setOrderTab(null);
    setLabLines([{ ...BLANK_LAB }]);
    setLabNotes("");
    setLabSubmitting(false);
    setDrugs([{ ...BLANK_DRUG }]);
    setRxUrgency("Routine");
    setRxNotes("");
    setRxSubmitting(false);
  }

  async function handleAdmit() {
    if (!doctorName) {
      setToast({
        message: "Doctor session is missing. Sign in again before sending an admission order.",
        type: "error",
      });
      return;
    }
    if (!selectedAdmissionPatient) {
      setToast({ message: "Select a real patient from your consultation or outpatient queue.", type: "error" });
      return;
    }
    if (!admitReason.trim()) {
      setToast({ message: "Enter the clinical reason for admission.", type: "error" });
      return;
    }

    setAdmitSubmitting(true);

    try {
      await addAdmissionOrder({
        id: `ADM-${Date.now()}`,
        patientName: selectedAdmissionPatient.patientName,
        patientId: selectedAdmissionPatient.patientId,
        orderedBy: doctorName,
        unit: admitUnit,
        reason: admitReason.trim(),
        orderedAt: new Date().toISOString(),
        status: "Pending",
      });

      if (selectedAdmissionPatient.consultationId) {
        try {
          await updateConsultation(selectedAdmissionPatient.consultationId, {
            admissionOrdered: true,
            admissionUnit: admitUnit,
            status: "Admitted",
          });
        } catch (error) {
          throw new Error(
            `Nurses received the admission order, but the consultation record could not be updated: ${toErrorMessage(error)}`,
          );
        }
      }

      setToast({
        message: `${selectedAdmissionPatient.patientName} was sent to Nurses for ${admitUnit} admission review.`,
        type: "success",
      });
      resetAdmissionModal();
    } catch (error) {
      setToast({
        message: `Could not send admission order for ${selectedAdmissionPatient.patientName}: ${toErrorMessage(error)}`,
        type: "error",
      });
      setAdmitSubmitting(false);
    }
  }

  async function handleLabOrder() {
    if (!viewPatient) return;
    if (!doctorName) {
      setToast({ message: "Doctor session is missing. Sign in again before ordering lab tests.", type: "error" });
      return;
    }

    const filled = labLines.filter((line) => line.testCode);
    if (filled.length === 0) {
      setToast({ message: "Select at least one test before sending to Lab.", type: "error" });
      return;
    }

    setLabSubmitting(true);

    try {
      for (const line of filled) {
        const catalogItem = testCatalog.find((entry) => entry.code === line.testCode);
        if (!catalogItem) {
          throw new Error(`Test catalog entry ${line.testCode} was not found.`);
        }

        await addLabTest({
          id: `LAB-${Date.now()}-${catalogItem.code}`,
          patientName: viewPatient.patientName,
          patientId: viewPatient.patientId,
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
          resultNotes: labNotes || undefined,
        });
      }

      setToast({
        message: `${filled.length} test(s) sent to Lab for ${viewPatient.patientName}.`,
        type: "success",
      });
      setViewPatient(null);
    } catch (error) {
      setToast({
        message: `Could not send lab order for ${viewPatient.patientName}: ${toErrorMessage(error)}`,
        type: "error",
      });
    } finally {
      setLabSubmitting(false);
    }
  }

  async function handleRxOrder() {
    if (!viewPatient) return;
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

    try {
      const prescription: SharedPrescription = {
        id: `RX-${Date.now()}`,
        patientName: viewPatient.patientName,
        patientId: viewPatient.patientId,
        doctorName,
        department: "Doctors",
        urgency: rxUrgency,
        drugs: filled.map((drug) => {
          const item = drugList.find((entry) => entry.name === drug.name);
          return { ...drug, unitPrice: item?.unitPrice ?? 0 } as PrescribedDrug;
        }),
        notes: rxNotes || undefined,
        createdAt: new Date().toISOString(),
        status: "Pending",
        totalCost: totalDrugCost,
      };

      await addPrescription(prescription);
      setToast({
        message: `Prescription sent to Pharmacy for ${viewPatient.patientName}.`,
        type: "success",
      });
      setViewPatient(null);
    } catch (error) {
      setToast({
        message: `Could not send prescription for ${viewPatient.patientName}: ${toErrorMessage(error)}`,
        type: "error",
      });
    } finally {
      setRxSubmitting(false);
    }
  }

  function updateLabLine(index: number, field: keyof LabLine, value: string) {
    setLabLines((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [field]: value } : entry)));
  }

  function updateDrug(index: number, field: keyof DrugLine, value: string) {
    setDrugs((prev) => prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [field]: value } : entry)));
  }

  function autoFillDrug(index: number, name: string) {
    const item = drugList.find((entry) => entry.name === name);
    setDrugs((prev) =>
      prev.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, name, dosage: item?.defaultDosage ?? entry.dosage } : entry,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Admitted Patients"
          description="Patients in Ward, ICU, and Emergency. Admit from real consultation/outpatient records, then send clinical orders from here."
        />
        <Button onClick={() => setShowAdmit(true)}>+ Admit Patient</Button>
      </div>

      {!doctorName && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Doctor session was not found. Admission, lab, and prescription actions are disabled until you sign in again.
        </div>
      )}

      {(doctorsHydrated || nursesHydrated) && criticalPatients.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-bold text-red-800">
            {criticalPatients.length} critical/high-priority patient{criticalPatients.length > 1 ? "s" : ""} require immediate clinical review.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Admitted", value: admittedPatients.length, color: "text-slate-900" },
          { label: "ICU", value: byUnit.ICU.length, color: byUnit.ICU.length > 0 ? "text-red-700" : "text-slate-400" },
          { label: "Ward", value: byUnit.Ward.length, color: "text-indigo-700" },
          { label: "Emergency", value: byUnit.Emergency.length, color: byUnit.Emergency.length > 0 ? "text-orange-700" : "text-slate-400" },
        ].map((stat) => (
          <Card key={stat.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      {byUnit.ICU.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-red-100 bg-red-50/50 px-5 py-4">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <h3 className="font-bold text-red-900">ICU - Critical Care</h3>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {byUnit.ICU.map((patient) => (
              <div key={patient.id} className="space-y-3 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{patient.patientName}</p>
                    <p className="text-xs text-slate-400">{patient.patientId}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                    {patient.priority}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <MobileMeta label="Bed" value={patient.bed} />
                  <MobileMeta label="Nurse" value={patient.assignedNurse} />
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {patient.diagnosis}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => openOrders(patient)} disabled={!doctorName}>
                  Clinical Orders
                </Button>
              </div>
            ))}
          </div>
          <div className="hidden divide-y divide-slate-100 md:block">
	            {byUnit.ICU.map((patient) => (
	              <div key={patient.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{patient.patientName}</p>
                    <span className="font-mono text-xs text-slate-400">{patient.patientId}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{patient.bed}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{patient.diagnosis}</p>
                  <p className="text-xs text-slate-400">Nurse: {patient.assignedNurse}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                  {patient.priority}
                </span>
	                <Button size="sm" variant="outline" onClick={() => openOrders(patient)} disabled={!doctorName}>
	                  Clinical Orders
			                </Button>
			              </div>
			            ))}
	          </div>
	        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Ward - Inpatients</h3>
          <span className="text-xs text-slate-400">
            {byUnit.Ward.length} patient{byUnit.Ward.length !== 1 ? "s" : ""}
          </span>
        </div>
        {byUnit.Ward.length > 0 ? (
          <>
            <div className="space-y-3 md:hidden">
              {byUnit.Ward.map((patient) => (
                <div key={patient.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{patient.patientName}</p>
                      <p className="text-xs text-slate-400">{patient.patientId}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                      {patient.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <MobileMeta label="Bed" value={patient.bed} />
                    <MobileMeta label="Nurse" value={patient.assignedNurse} />
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{patient.diagnosis}</div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => openOrders(patient)} disabled={!doctorName}>
                    Clinical Orders
                  </Button>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Patient", "Patient ID", "Bed", "Diagnosis", "Priority", "Assigned Nurse", "Actions"].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byUnit.Ward.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{patient.patientName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{patient.patientId}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{patient.bed}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-500">{patient.diagnosis}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                          {patient.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{patient.assignedNurse}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openOrders(patient)} disabled={!doctorName}>
                          Clinical Orders
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No patients in Ward at this time.</p>
          )}
      </Card>

      {byUnit.Emergency.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-orange-100 bg-orange-50/50 px-5 py-4">
            <h3 className="font-bold text-orange-900">Emergency Unit</h3>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">
            {byUnit.Emergency.map((patient) => (
              <div key={patient.id} className="space-y-3 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{patient.patientName}</p>
                    <p className="text-xs text-slate-400">{patient.patientId}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                    {patient.priority}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <MobileMeta label="Bed" value={patient.bed} />
                  <MobileMeta label="Nurse" value={patient.assignedNurse} />
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{patient.diagnosis}</div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => openOrders(patient)} disabled={!doctorName}>
                  Clinical Orders
                </Button>
              </div>
            ))}
          </div>
          <div className="hidden divide-y divide-slate-100 md:block">
            {byUnit.Emergency.map((patient) => (
              <div key={patient.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    {patient.patientName} <span className="ml-1 font-mono text-xs text-slate-400">{patient.patientId}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {patient.diagnosis} - {patient.bed}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                  {patient.priority}
                </span>
                <Button size="sm" variant="outline" onClick={() => openOrders(patient)} disabled={!doctorName}>
                  Clinical Orders
                </Button>
              </div>
            ))}
	          </div>
	        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">My Admission Orders</h3>
        </div>
        <div className="space-y-3 md:hidden">
          {myAdmissionOrders.map((order) => (
            <div key={order.id} className="space-y-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{order.patientName}</p>
                  <p className="font-mono text-[10px] text-slate-400">{order.id}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    order.status === "Admitted"
                      ? "bg-emerald-50 text-emerald-700"
                      : order.status === "Discharged"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <MobileMeta label="Unit" value={order.unit} />
                <MobileMeta label="Ordered By" value={order.orderedBy} />
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{order.reason}</div>
              <div className="text-[10px] text-slate-400">{formatOrderTime(order.orderedAt)}</div>
            </div>
          ))}
          {myAdmissionOrders.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No admission orders sent by you yet.</p>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["ADM ID", "Patient", "Unit", "Ordered By", "Reason", "Ordered At", "Status"].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myAdmissionOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{order.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{order.patientName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${UNIT_STYLES[order.unit]}`}>
                      {order.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{order.orderedBy}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-xs text-slate-500">{order.reason}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatOrderTime(order.orderedAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        order.status === "Admitted"
                          ? "bg-emerald-50 text-emerald-700"
                          : order.status === "Discharged"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {myAdmissionOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                    No admission orders sent by you yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showAdmit} onClose={resetAdmissionModal} title="Admit Patient">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Patient *</label>
            <SearchableSelect
              options={admitPatientOptions}
              value={admitPatientId}
              onChange={setAdmitPatientId}
              placeholder="Search your consultation or outpatient patients"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Admitting Doctor</label>
              <input value={doctorName || "--"} readOnly className={`${INPUT_CLASS} bg-slate-50 text-slate-500`} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Admission Unit</label>
              <select
                value={admitUnit}
                onChange={(event) => setAdmitUnit(event.target.value as AdmissionUnit)}
                className={INPUT_CLASS}
              >
                {["Ward", "ICU", "Emergency"].map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedAdmissionPatient && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <p>
                  <span className="text-slate-400">Patient:</span> <strong>{selectedAdmissionPatient.patientName}</strong>
                </p>
                <p>
                  <span className="text-slate-400">ID:</span> <strong>{selectedAdmissionPatient.patientId}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Source:</span> <strong>{selectedAdmissionPatient.source}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Clinical summary:</span> <strong>{selectedAdmissionPatient.diagnosis}</strong>
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Reason for Admission *</label>
            <textarea
              rows={3}
              value={admitReason}
              onChange={(event) => setAdmitReason(event.target.value)}
              placeholder="Clinical reason and immediate management plan"
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <p className="text-xs text-slate-400">
            Doctors cannot type patient IDs manually here. Admission must be linked to a real consultation or routed outpatient record.
          </p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={resetAdmissionModal} disabled={admitSubmitting}>
            Cancel
          </Button>
          <Button size="md" onClick={handleAdmit} disabled={admitSubmitting || !doctorName}>
            {admitSubmitting ? "Sending..." : "Send Admission Order"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        open={!!viewPatient}
        onClose={() => setViewPatient(null)}
        title={`Clinical Orders - ${viewPatient?.patientName ?? ""}`}
        className="max-w-3xl"
      >
        {viewPatient && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs md:grid-cols-2">
              <div>
                <span className="text-slate-400">Unit:</span> <strong>{viewPatient.unit}</strong>
              </div>
              <div>
                <span className="text-slate-400">Bed:</span> <strong>{viewPatient.bed}</strong>
              </div>
              <div>
                <span className="text-slate-400">Priority:</span> <strong>{viewPatient.priority}</strong>
              </div>
              <div>
                <span className="text-slate-400">Nurse:</span> <strong>{viewPatient.assignedNurse}</strong>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-400">Diagnosis:</span> <strong>{viewPatient.diagnosis}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderTab(orderTab === "lab" ? null : "lab")}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                  orderTab === "lab"
                    ? "border-sky-400 bg-sky-50 text-sky-700"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                Order Lab Tests
              </button>
              <button
                type="button"
                onClick={() => setOrderTab(orderTab === "rx" ? null : "rx")}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                  orderTab === "rx"
                    ? "border-violet-400 bg-violet-50 text-violet-700"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                Write Prescription
              </button>
            </div>

            {orderTab && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Ordering Doctor</label>
                <input value={doctorName || "--"} readOnly className={`${INPUT_CLASS} bg-slate-50 text-slate-500`} />
              </div>
            )}

            {orderTab === "lab" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Tests</span>
                  <button
                    type="button"
                    onClick={() => setLabLines((prev) => [...prev, { ...BLANK_LAB }])}
                    className="text-xs font-semibold text-sky-600 hover:underline"
                  >
                    + Add test
                  </button>
                </div>

                {labLines.map((line, index) => {
                  const selectedTest = testCatalog.find((entry) => entry.code === line.testCode);
                  return (
                    <div key={`${line.testCode}-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Test {index + 1}</span>
                        {labLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLabLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

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

                      <div className="flex gap-1">
                        {(["Routine", "Urgent", "STAT"] as const).map((priority) => (
                          <button
                            key={priority}
                            type="button"
                            onClick={() => updateLabLine(index, "priority", priority)}
                            className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition ${
                              line.priority === priority
                                ? priority === "STAT"
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : priority === "Urgent"
                                    ? "border-amber-400 bg-amber-50 text-amber-700"
                                    : "border-sky-400 bg-sky-50 text-sky-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>

                      {selectedTest && (
                        <p className="text-xs font-medium text-sky-700">
                          Sample: {selectedTest.sampleType} · TAT:{" "}
                          {selectedTest.turnaroundHours < 1
                            ? `${selectedTest.turnaroundHours * 60} min`
                            : `${selectedTest.turnaroundHours} hr`}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={labNotes}
                    onChange={(event) => setLabNotes(event.target.value)}
                    placeholder="Reason for the test request"
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
              </div>
            )}
            {orderTab === "rx" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Medications</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {(["Routine", "Urgent"] as const).map((urgency) => (
                        <button
                          key={urgency}
                          type="button"
                          onClick={() => setRxUrgency(urgency)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                            rxUrgency === urgency
                              ? urgency === "Urgent"
                                ? "bg-red-600 text-white"
                                : "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {urgency}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrugs((prev) => [...prev, { ...BLANK_DRUG }])}
                      className="text-xs font-semibold text-violet-600 hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {drugs.map((drug, index) => {
                  const item = drugList.find((entry) => entry.name === drug.name);
                  const qty = parseInt(drug.qty, 10) || 0;

                  return (
                    <div key={`${drug.name}-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Drug {index + 1}</span>
                        {drugs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDrugs((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs text-slate-500">Medication *</label>
                          <SearchableSelect
                            value={drug.name}
                            onChange={(val) => autoFillDrug(index, val)}
                            placeholder="- Select from pharmacy inventory -"
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
                          <label className="mb-1 block text-xs text-slate-500">Dosage</label>
                          <input
                            type="text"
                            placeholder="e.g. 500mg"
                            value={drug.dosage}
                            onChange={(event) => updateDrug(index, "dosage", event.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Quantity</label>
                          <input
                            type="text"
                            list={`qty-${index}`}
                            placeholder="e.g. 21 caps"
                            value={drug.qty}
                            onChange={(event) => updateDrug(index, "qty", event.target.value)}
                            className={INPUT_CLASS}
                          />
                          <datalist id={`qty-${index}`}>
                            {QTY_PRESETS.map((preset) => (
                              <option key={preset} value={preset} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Frequency</label>
                          <select
                            value={drug.frequency}
                            onChange={(event) => updateDrug(index, "frequency", event.target.value)}
                            className={INPUT_CLASS}
                          >
                            {FREQ_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Duration</label>
                          <select
                            value={drug.duration}
                            onChange={(event) => updateDrug(index, "duration", event.target.value)}
                            className={INPUT_CLASS}
                          >
                            {DURATION_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        {item && qty > 0 && (
                          <div className="flex justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-800 md:col-span-2">
                            <span>
                              N{item.unitPrice.toFixed(2)} x {qty}
                            </span>
                            <strong>= N{(item.unitPrice * qty).toFixed(2)}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={rxNotes}
                    onChange={(event) => setRxNotes(event.target.value)}
                    placeholder="Medication instructions for Pharmacy and ward team"
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setViewPatient(null)} disabled={labSubmitting || rxSubmitting}>
            Close
          </Button>
          {orderTab === "lab" && (
            <Button
              size="md"
              disabled={!doctorName || !labLines.some((line) => line.testCode) || labSubmitting}
              onClick={handleLabOrder}
            >
              {labSubmitting ? "Sending..." : `Send ${labLines.filter((line) => line.testCode).length} Test(s) to Lab`}
            </Button>
          )}
          {orderTab === "rx" && (
            <Button
              size="md"
              disabled={!doctorName || !drugs.some((drug) => drug.name && drug.qty) || rxSubmitting}
              onClick={handleRxOrder}
            >
              {rxSubmitting ? "Sending..." : "Send Prescription to Pharmacy"}
            </Button>
          )}
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
