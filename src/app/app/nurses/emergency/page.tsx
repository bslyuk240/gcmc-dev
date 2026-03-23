"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  addNursingProcedure,
  addWardPatient,
  updateWardPatient,
  type NursingProcedure,
  type WardPatient,
} from "@/lib/data/nurses-store";
import { addNursingCharge } from "@/lib/data/accounts-store";
import {
  fetchDoctors,
  insertHandoverNote,
  insertPatientObservation,
  fetchPatientRegistrations,
  type PatientRegistration,
} from "@/lib/supabase/db";
import type { DoctorProfile } from "@/lib/data/doctors-store";
import {
  buildDoctorRoutingChoices,
  describeDoctorRoute,
  resolveDoctorRoute,
} from "@/lib/utils/doctor-routing";

const PRIORITY_STYLES: Record<WardPatient["priority"], string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700 font-semibold",
  Watch: "bg-yellow-50 text-yellow-700",
  Stable: "bg-emerald-50 text-emerald-700",
};

const PROCEDURE_TYPES = [
  "Injection",
  "Dressing",
  "IV Access",
  "Catheter",
  "Observation",
  "Wound Care",
  "Blood Draw",
  "Procedure",
  "Other",
] as const;

const PROCEDURE_PRICES: Record<(typeof PROCEDURE_TYPES)[number], number> = {
  Injection: 25,
  Dressing: 20,
  "IV Access": 30,
  Catheter: 60,
  Observation: 15,
  "Wound Care": 40,
  "Blood Draw": 15,
  Procedure: 50,
  Other: 20,
};

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function fmtDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtClock(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function buildUnitBed(patients: WardPatient[], unit: WardPatient["unit"]) {
  const prefix = unit === "ICU" ? "ICU" : unit === "Ward" ? "WD" : "ER";
  const usedBeds = new Set(
    patients
      .filter((patient) => patient.unit === unit && patient.status === "Active")
      .map((patient) => patient.bed),
  );

  let bedNumber = 1;
  while (usedBeds.has(`${prefix}-${bedNumber}`)) bedNumber += 1;
  return `${prefix}-${bedNumber}`;
}

function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Night";
}

function MobileMeta({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function NursesEmergencyPage() {
  const { getByUnit, procedures, allPatients } = useNursesStore();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Emergency Nurse";
  const erPatients = getByUnit("Emergency").filter((patient) => patient.status === "Active");
  const erProcedures = procedures.filter((entry) => entry.unit === "Emergency");

  const [registrations, setRegistrations] = useState<PatientRegistration[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [newPatientModal, setNewPatientModal] = useState(false);
  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [transferTarget, setTransferTarget] = useState<WardPatient | null>(null);
  const [procedureTarget, setProcedureTarget] = useState<WardPatient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPatientId, setManualPatientId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [priority, setPriority] = useState<WardPatient["priority"]>("High");
  const [doctorRoute, setDoctorRoute] = useState("");
  const [assignedNurse, setAssignedNurse] = useState(staffName);

  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [vitalsNurse, setVitalsNurse] = useState(staffName);

  const [procedureType, setProcedureType] = useState<(typeof PROCEDURE_TYPES)[number]>("Observation");
  const [procedureDescription, setProcedureDescription] = useState("");
  const [procedureNurse, setProcedureNurse] = useState(staffName);

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      const [patientRows, doctorRows] = await Promise.all([
        fetchPatientRegistrations().catch((err) => {
          console.error("[nurses-emergency] fetchPatientRegistrations:", err);
          return [];
        }),
        fetchDoctors().catch((err) => {
          console.error("[nurses-emergency] fetchDoctors:", err);
          return [];
        }),
      ]);

      setRegistrations(patientRows);
      setDoctors(doctorRows as DoctorProfile[]);
      setLoadingLookups(false);
    }

    void loadLookups();
  }, []);

  const { activeDoctors, specialties } = buildDoctorRoutingChoices(doctors);
  const registeredPatientOptions = registrations.filter(
    (registration) => !erPatients.some((patient) => patient.patientId === registration.patientId),
  );

  function resetAdmitForm() {
    setSelectedPatientId("");
    setManualName("");
    setManualPatientId("");
    setComplaint("");
    setPriority("High");
    setDoctorRoute("");
    setAssignedNurse(staffName);
  }

  function openVitals(patient: WardPatient) {
    setVitalsTarget(patient);
    setBp(patient.vitals?.bp ?? "");
    setPulse(patient.vitals?.pulse ?? "");
    setTemp(patient.vitals?.temp ?? "");
    setSpo2(patient.vitals?.spo2 ?? "");
    setVitalsNurse(staffName);
  }

  function openProcedure(patient: WardPatient) {
    setProcedureTarget(patient);
    setProcedureType("Observation");
    setProcedureDescription("");
    setProcedureNurse(staffName);
  }

  function handleAdmitPatient() {
    const selectedPatient = registrations.find((registration) => registration.id === selectedPatientId);
    const patientName = selectedPatient?.patientName ?? manualName.trim();
    const patientId = selectedPatient?.patientId ?? manualPatientId.trim();

    if (!patientName || !complaint.trim()) {
      setToast({ message: "Select or enter a patient and add the emergency complaint.", type: "error" });
      return;
    }

    const route = resolveDoctorRoute(doctorRoute, activeDoctors);
    if (doctorRoute && !route.routeLabel) {
      setToast({ message: "Choose a valid doctor, specialty, or emergency queue.", type: "error" });
      return;
    }

    addWardPatient({
      id: createLocalId("WP-ER"),
      patientName,
      patientId: patientId || createLocalId("PT-ER"),
      unit: "Emergency",
      bed: buildUnitBed(allPatients, "Emergency"),
      diagnosis: complaint.trim(),
      admittedAt: new Date().toISOString(),
      assignedNurse: assignedNurse.trim() || staffName,
      priority,
      status: "Active",
      doctorInCharge: route.doctorName,
      doctorSpecialty: route.doctorSpecialty,
      notes: selectedPatient ? "Emergency admission from registered patient record." : "Emergency admission entered from nurses portal.",
    });

    setToast({ message: `${patientName} admitted to Emergency Unit.`, type: "success" });
    setNewPatientModal(false);
    resetAdmitForm();
  }

  function handleRecordVitals() {
    if (!vitalsTarget || !bp.trim() || !pulse.trim()) return;

    const recordedAt = new Date().toISOString();
    const nurseLabel = vitalsNurse.trim() || staffName;

    updateWardPatient(vitalsTarget.id, {
      vitals: {
        bp: bp.trim(),
        pulse: pulse.trim(),
        temp: temp.trim() || "-",
        spo2: spo2.trim() || "-",
        recordedAt,
        recordedBy: nurseLabel,
      },
      assignedNurse: nurseLabel,
      lastVitalsAt: recordedAt,
    });

    void insertPatientObservation({
      id: createLocalId("OBS-ER"),
      patientId: vitalsTarget.patientId,
      patientName: vitalsTarget.patientName,
      unit: "Emergency",
      observation: `Emergency vitals recorded: BP ${bp.trim()}, Pulse ${pulse.trim()}, Temp ${temp.trim() || "-"}, SpO2 ${spo2.trim() || "-"}.`,
      recordedBy: nurseLabel,
      recordedAt,
    });

    setToast({ message: `Emergency vitals recorded for ${vitalsTarget.patientName}.`, type: "success" });
    setVitalsTarget(null);
    setBp("");
    setPulse("");
    setTemp("");
    setSpo2("");
  }

  async function handleAddProcedure() {
    if (!procedureTarget) return;

    const performedAt = new Date().toISOString();
    const performedBy = procedureNurse.trim() || staffName;
    const description = procedureDescription.trim() || `${procedureType} in Emergency Unit`;
    const amount = PROCEDURE_PRICES[procedureType];
    const procedureId = createLocalId("NP-ER");

    const procedure: NursingProcedure = {
      id: procedureId,
      patientName: procedureTarget.patientName,
      patientId: procedureTarget.patientId,
      unit: "Emergency",
      procedureType,
      description,
      performedBy,
      performedAt,
      amount,
      billStatus: "Billed",
    };

    try {
      await addNursingProcedure(procedure);
      await addNursingCharge({
        id: procedureId,
        patientName: procedure.patientName,
        patientId: procedure.patientId,
        unit: procedure.unit,
        procedureType: procedure.procedureType,
        description: procedure.description,
        performedBy: procedure.performedBy,
        performedAt: procedure.performedAt,
        amount: procedure.amount,
        status: "Billed",
      });

      setToast({
        message: `${procedureType} recorded for ${procedureTarget.patientName}. Billing is now in Accounts.`,
        type: "success",
      });
      setProcedureTarget(null);
      setProcedureDescription("");
    } catch (error) {
      setToast({
        message: `Procedure billing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    }
  }

  async function handleTransfer(targetUnit: "Ward" | "ICU") {
    if (!transferTarget) return;

    try {
      await updateWardPatient(transferTarget.id, {
        unit: targetUnit,
        bed: buildUnitBed(allPatients.filter((patient) => patient.id !== transferTarget.id), targetUnit),
      });

      await insertHandoverNote({
        id: createLocalId("HO-ER"),
        ward: "Emergency",
        shift: getCurrentShift(),
        writtenBy: staffName,
        content: `${transferTarget.patientName} (${transferTarget.patientId}) transferred from Emergency to ${targetUnit}.`,
        createdAt: new Date().toISOString(),
      });

      setToast({ message: `${transferTarget.patientName} transferred to ${targetUnit}.`, type: "info" });
      setTransferTarget(null);
    } catch (error) {
      setToast({
        message: `Emergency transfer handover failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Unit"
        description="Urgent triage, emergency stabilisation, and rapid nurse-safe coordination."
        action={<Button onClick={() => setNewPatientModal(true)}>+ Admit Emergency Patient</Button>}
      />

      {erPatients.filter((patient) => patient.priority === "Critical").length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500 shrink-0" />
          <span className="text-sm font-bold text-red-800">
            Critical ER patients need immediate review: {erPatients.filter((patient) => patient.priority === "Critical").map((patient) => patient.patientName).join(", ")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Active ER Patients",
            value: erPatients.length,
            sub: "Current emergency census",
            href: `${INTERNAL_PREFIX}/nurses/emergency`,
            color: "text-amber-700",
          },
          {
            label: "Critical",
            value: erPatients.filter((patient) => patient.priority === "Critical").length,
            sub: "Immediate clinical attention required",
            href: `${INTERNAL_PREFIX}/nurses/emergency`,
            color: "text-red-700",
          },
          {
            label: "High Priority",
            value: erPatients.filter((patient) => patient.priority === "High").length,
            sub: "Need rapid follow-up",
            href: `${INTERNAL_PREFIX}/nurses/emergency`,
            color: "text-orange-700",
          },
          {
            label: "Procedures",
            value: erProcedures.length,
            sub: "Emergency procedures already billed",
            href: `${INTERNAL_PREFIX}/nurses/procedure-charges`,
            color: "text-slate-900",
          },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="block">
            <Card className="h-full border-slate-200 transition hover:border-[var(--accent)]/30 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold sm:text-3xl ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">{card.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Emergency Patients</h3>
            <p className="text-xs text-slate-400">Track vitals, route safely, and move patients to the next nursing unit.</p>
          </div>
          <div className="flex gap-3">
            <Link href={`${INTERNAL_PREFIX}/nurses/sample-collection`} className="text-sm font-semibold text-accent hover:underline">
              Sample Collection {"->"}
            </Link>
            <Link href={`${INTERNAL_PREFIX}/nurses/medication-administration`} className="text-sm font-semibold text-accent hover:underline">
              Medication Administration {"->"}
            </Link>
          </div>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {erPatients.map((patient) => (
            <div key={patient.id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${patient.priority === "Critical" ? "ring-1 ring-red-100" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                    className="truncate text-sm font-semibold text-slate-900 hover:text-[var(--accent)] hover:underline"
                  >
                    {patient.patientName}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {patient.patientId} / Arrived {fmtDateTime(patient.admittedAt)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                  {patient.priority}
                </span>
              </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MobileMeta label="Bed" value={patient.bed} />
                <MobileMeta label="Doctor Route" value={describeDoctorRoute(patient)} />
                <MobileMeta label="BP" value={patient.vitals?.bp || "-"} />
                <MobileMeta label="Pulse" value={patient.vitals?.pulse || "-"} />
                <MobileMeta label="Temp" value={patient.vitals?.temp || "-"} />
                <MobileMeta label="SpO2" value={patient.vitals?.spo2 || "-"} />
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-slate-500">{patient.diagnosis || "--"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{patient.notes || "No emergency note yet"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="flex-1" onClick={() => openVitals(patient)}>Vitals</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openProcedure(patient)}>Procedure</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setTransferTarget(patient)}>Transfer</Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                >
                  Open record
                </Button>
              </div>
            </div>
          ))}
          {erPatients.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              No active emergency patients right now.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Bed", "Patient", "Presenting Complaint", "Doctor Route", "Vitals", "Priority", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {erPatients.map((patient) => (
                <tr key={patient.id} className={patient.priority === "Critical" ? "bg-red-50/25 hover:bg-red-50/35" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-amber-700">{patient.bed}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                      className="font-semibold text-slate-900 hover:text-[var(--accent)] hover:underline"
                    >
                      {patient.patientName}
                    </Link>
                    <p className="text-xs text-slate-400">{patient.patientId} / Arrived {fmtDateTime(patient.admittedAt)}</p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-slate-600">
                    <p className="truncate">{patient.diagnosis || "--"}</p>
                    <p className="mt-1 truncate text-slate-400">{patient.notes || "No emergency note yet"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{describeDoctorRoute(patient)}</td>
                  <td className="px-4 py-3">
                    {patient.vitals?.bp || patient.vitals?.pulse ? (
                      <div className="text-xs">
                        <p className="font-medium text-slate-700">BP: {patient.vitals?.bp || "-"} / HR: {patient.vitals?.pulse || "-"}</p>
                        <p className="text-slate-400">Temp: {patient.vitals?.temp || "-"} / SpO2: {patient.vitals?.spo2 || "-"}</p>
                        <p className="text-slate-400">{fmtClock(patient.lastVitalsAt || patient.vitals?.recordedAt)}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-red-600">No vitals</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                      {patient.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openVitals(patient)}>Vitals</Button>
                      <Button size="sm" variant="outline" onClick={() => openProcedure(patient)}>Procedure</Button>
                      <Button size="sm" variant="outline" onClick={() => setTransferTarget(patient)}>Transfer</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                      >
                        Open record
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {erPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">No active emergency patients right now.</p>
                    <p className="mt-1 text-xs text-slate-400">Front Desk emergency check-in and emergency admission both feed this queue.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Urgent Lab Tests",
            sub: "Collect or send STAT samples from the nurses portal",
            href: `${INTERNAL_PREFIX}/nurses/sample-collection`,
            color: "border-sky-200 bg-sky-50",
            textColor: "text-sky-800",
          },
          {
            label: "Urgent Medications",
            sub: "Request or administer emergency meds from the nurses portal",
            href: `${INTERNAL_PREFIX}/nurses/medication-administration`,
            color: "border-violet-200 bg-violet-50",
            textColor: "text-violet-800",
          },
          {
            label: "Doctor Handoff",
            sub: "Use patient record and handover notes without opening doctors dashboards",
            href: `${INTERNAL_PREFIX}/nurses/handover-notes`,
            color: "border-amber-200 bg-amber-50",
            textColor: "text-amber-800",
          },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition hover:shadow-sm ${action.color}`}
          >
            <div>
              <p className={`text-sm font-bold ${action.textColor}`}>{action.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{action.sub}</p>
            </div>
            <span className={`text-lg ${action.textColor}`}>{">"}</span>
          </Link>
        ))}
      </div>

      <Modal open={newPatientModal} onClose={() => setNewPatientModal(false)} title="Admit Emergency Patient">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Registered Patient</label>
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className={inputCls}
              disabled={loadingLookups}
            >
              <option value="">{loadingLookups ? "Loading patients..." : "Select registered patient or leave blank for manual entry"}</option>
              {registeredPatientOptions.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.patientName} ({patient.patientId})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Manual Patient Name</label>
              <input
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="Use only if patient is not yet registered"
                className={inputCls}
                disabled={Boolean(selectedPatientId)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Manual Patient ID</label>
              <input
                value={manualPatientId}
                onChange={(event) => setManualPatientId(event.target.value)}
                placeholder="Optional manual ID"
                className={inputCls}
                disabled={Boolean(selectedPatientId)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Presenting Complaint / Diagnosis *</label>
            <input value={complaint} onChange={(event) => setComplaint(event.target.value)} placeholder="Chest pain, trauma, dyspnoea, seizure..." className={inputCls} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Priority</label>
              <select value={priority} onChange={(event) => setPriority(event.target.value as WardPatient["priority"])} className={inputCls}>
                {["Critical", "High", "Watch", "Stable"].map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Assigned Nurse</label>
              <input value={assignedNurse} onChange={(event) => setAssignedNurse(event.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Doctor / Specialty Route</label>
            <select value={doctorRoute} onChange={(event) => setDoctorRoute(event.target.value)} className={inputCls}>
              <option value="">Leave as shared emergency queue</option>
              <optgroup label="Doctor Specialties">
                {specialties.map((specialty) => (
                  <option key={specialty} value={`specialty:${specialty}`}>
                    {specialty} Queue
                  </option>
                ))}
              </optgroup>
              <optgroup label="On-Duty Doctors">
                {activeDoctors.map((doctor) => (
                  <option key={doctor.id} value={`doctor:${doctor.id}`}>
                    {doctor.name} ({doctor.specialty})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Queues">
                <option value="queue:emergency">Emergency Team</option>
              </optgroup>
            </select>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setNewPatientModal(false)}>Cancel</Button>
          <Button size="md" disabled={(!selectedPatientId && !manualName.trim()) || !complaint.trim()} onClick={handleAdmitPatient}>
            Admit Patient
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title={`Record Vitals - ${vitalsTarget?.patientName ?? ""}`}>
        {vitalsTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Emergency patient - record vitals immediately and use the nurse patient record for lab, meds, and doctor context.
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Blood Pressure *</label>
                <input value={bp} onChange={(event) => setBp(event.target.value)} placeholder="145/95" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Pulse *</label>
                <input value={pulse} onChange={(event) => setPulse(event.target.value)} placeholder="110" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Temperature</label>
                <input value={temp} onChange={(event) => setTemp(event.target.value)} placeholder="39.5" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">SpO2</label>
                <input value={spo2} onChange={(event) => setSpo2(event.target.value)} placeholder="94" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Recorded By</label>
              <input value={vitalsNurse} onChange={(event) => setVitalsNurse(event.target.value)} className={inputCls} />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setVitalsTarget(null)}>Cancel</Button>
          <Button size="md" disabled={!bp.trim() || !pulse.trim()} onClick={handleRecordVitals}>Save Emergency Vitals</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!procedureTarget} onClose={() => setProcedureTarget(null)} title={`Record Procedure - ${procedureTarget?.patientName ?? ""}`}>
        {procedureTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">{procedureTarget.bed}</span> / {procedureTarget.patientId}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Procedure Type</label>
              <select value={procedureType} onChange={(event) => setProcedureType(event.target.value as (typeof PROCEDURE_TYPES)[number])} className={inputCls}>
                {PROCEDURE_TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry} (NGN {PROCEDURE_PRICES[entry]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
              <input value={procedureDescription} onChange={(event) => setProcedureDescription(event.target.value)} placeholder="Short emergency procedure note" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Performed By</label>
              <input value={procedureNurse} onChange={(event) => setProcedureNurse(event.target.value)} className={inputCls} />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setProcedureTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleAddProcedure}>Record Procedure</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title={`Transfer - ${transferTarget?.patientName ?? ""}`}>
        {transferTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">Transfer <strong>{transferTarget.patientName}</strong> from Emergency to:</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["Ward", "ICU"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleTransfer(unit)}
                  className={`rounded-xl border-2 px-4 py-4 text-center font-bold transition hover:shadow-md ${unit === "ICU" ? "border-red-300 bg-red-50 text-red-700 hover:border-red-400" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400"}`}
                >
                  {unit === "ICU" ? "ICU" : "Ward / Inpatient"}
                </button>
              ))}
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setTransferTarget(null)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
