"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { addWardPatient, updateWardPatient, type WardPatient } from "@/lib/data/nurses-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  fetchDoctors,
  fetchPatientRegistrations,
  type PatientRegistration,
} from "@/lib/supabase/db";
import type { DoctorProfile } from "@/lib/data/doctors-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  buildDoctorRoutingChoices,
  describeDoctorRoute,
  getActiveDoctorSpecialties,
  getDoctorSelectionValue,
  normalizeDoctorSpecialty,
  resolveDoctorRoute,
} from "@/lib/utils/doctor-routing";

type UrgencyFilter = "ALL" | "CRITICAL" | "HIGH" | "ROUTINE";

const PRIORITY_STYLES: Record<WardPatient["priority"], string> = {
  Critical: "bg-red-100 text-red-700 font-bold",
  High: "bg-amber-100 text-amber-700 font-semibold",
  Watch: "bg-sky-100 text-sky-700 font-semibold",
  Stable: "bg-emerald-100 text-emerald-700 font-semibold",
};

function fmtRecordedAt(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtClock(value?: string) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function mapPriorityToUrgency(priority: WardPatient["priority"]): Exclude<UrgencyFilter, "ALL"> {
  if (priority === "Critical") return "CRITICAL";
  if (priority === "High") return "HIGH";
  return "ROUTINE";
}

function mapUrgencyToPriority(urgency: Exclude<UrgencyFilter, "ALL">): WardPatient["priority"] {
  if (urgency === "CRITICAL") return "Critical";
  if (urgency === "HIGH") return "High";
  return "Stable";
}

function hasCompleteVitals(patient: WardPatient) {
  if (!patient.vitals) return false;

  return [patient.vitals.bp, patient.vitals.pulse, patient.vitals.temp, patient.vitals.spo2].every(
    (value) => Boolean(value && value.trim() && value.trim() !== "-"),
  );
}

function hasVerifiedDoctorAssignment(
  patient: WardPatient,
  activeDoctorNames: Set<string>,
  activeDoctorSpecialties: Set<string>,
) {
  if (patient.doctorInCharge?.trim()) return activeDoctorNames.has(patient.doctorInCharge.trim());
  const specialty = normalizeDoctorSpecialty(patient.doctorSpecialty);
  return specialty ? activeDoctorSpecialties.has(specialty) : false;
}

function getTriageStatus(
  patient: WardPatient,
  activeDoctorNames: Set<string>,
  activeDoctorSpecialties: Set<string>,
) {
  const completeVitals = hasCompleteVitals(patient);
  const verifiedDoctor = hasVerifiedDoctorAssignment(patient, activeDoctorNames, activeDoctorSpecialties);
  const hasComplaint = Boolean(patient.diagnosis && patient.diagnosis.trim());

  if (completeVitals && verifiedDoctor && hasComplaint) return "Ready for doctor";
  if (completeVitals && hasComplaint) return "Awaiting doctor";
  if (verifiedDoctor && hasComplaint) return "Awaiting vitals";
  if (hasComplaint) return "Waiting";
  return "Incomplete triage";
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

function buildOutpatientBed(patients: WardPatient[]) {
  const usedBeds = patients
    .filter((patient) => patient.status === "Active")
    .map((patient) => patient.bed);

  let bedNumber = 1;
  while (usedBeds.includes(`OPD-${bedNumber}`)) bedNumber += 1;
  return `OPD-${bedNumber}`;
}

export default function NursesTriagePage() {
  const { allPatients } = useNursesStore();
  const session = useHMSSession();
  const nurseName = session?.full_name ?? "Triage Nurse";

  const outpatientPatients = allPatients.filter(
    (patient) => patient.unit === "Outpatient" && patient.status === "Active",
  );

  const [filterUrgency, setFilterUrgency] = useState<UrgencyFilter>("ALL");
  const [showNewModal, setShowNewModal] = useState(false);
  const [triageTarget, setTriageTarget] = useState<WardPatient | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [patientRegistrations, setPatientRegistrations] = useState<PatientRegistration[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submittingNew, setSubmittingNew] = useState(false);
  const [savingTriage, setSavingTriage] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newUrgency, setNewUrgency] = useState<Exclude<UrgencyFilter, "ALL">>("ROUTINE");
  const [newComplaint, setNewComplaint] = useState("");
  const [newDoctorRoute, setNewDoctorRoute] = useState("");
  const [newBP, setNewBP] = useState("");
  const [newPulse, setNewPulse] = useState("");
  const [newTemp, setNewTemp] = useState("");
  const [newSpo2, setNewSpo2] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [editUrgency, setEditUrgency] = useState<Exclude<UrgencyFilter, "ALL">>("ROUTINE");
  const [editDoctorRoute, setEditDoctorRoute] = useState("");
  const [editBP, setEditBP] = useState("");
  const [editPulse, setEditPulse] = useState("");
  const [editTemp, setEditTemp] = useState("");
  const [editSpo2, setEditSpo2] = useState("");
  const [editComplaint, setEditComplaint] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      const [patients, doctorProfiles] = await Promise.all([
        fetchPatientRegistrations().catch((err) => {
          console.error("[nurses-triage] fetchPatientRegistrations:", err);
          return [];
        }),
        fetchDoctors().catch((err) => {
          console.error("[nurses-triage] fetchDoctors:", err);
          return [];
        }),
      ]);

      setPatientRegistrations(patients);
      setDoctors(doctorProfiles as DoctorProfile[]);
      setLoadingLookups(false);
    }

    void loadLookups();
  }, []);

  const availableRegistrations = patientRegistrations.filter(
    (registration) =>
      !outpatientPatients.some((patient) => patient.patientId === registration.patientId),
  );
  const { activeDoctors, specialties } = buildDoctorRoutingChoices(doctors);
  const activeDoctorNames = new Set(activeDoctors.map((doctor) => doctor.name.trim()));
  const activeDoctorSpecialties = new Set(getActiveDoctorSpecialties(doctors));

  const displayedPatients =
    filterUrgency === "ALL"
      ? outpatientPatients
      : outpatientPatients.filter(
          (patient) => mapPriorityToUrgency(patient.priority) === filterUrgency,
        );

  function resetNewEntryForm() {
    setSelectedPatientId("");
    setNewUrgency("ROUTINE");
    setNewComplaint("");
    setNewDoctorRoute("");
    setNewBP("");
    setNewPulse("");
    setNewTemp("");
    setNewSpo2("");
    setNewNotes("");
  }

  function openTriage(patient: WardPatient) {
    setTriageTarget(patient);
    setEditUrgency(mapPriorityToUrgency(patient.priority));
    setEditDoctorRoute(getDoctorSelectionValue(patient, activeDoctors));
    setEditBP(patient.vitals?.bp ?? "");
    setEditPulse(patient.vitals?.pulse ?? "");
    setEditTemp(patient.vitals?.temp ?? "");
    setEditSpo2(patient.vitals?.spo2 ?? "");
    setEditComplaint(patient.diagnosis ?? "");
    setEditNotes(patient.notes ?? "");
  }

  function closeTriage() {
    setTriageTarget(null);
    setEditUrgency("ROUTINE");
    setEditDoctorRoute("");
    setEditBP("");
    setEditPulse("");
    setEditTemp("");
    setEditSpo2("");
    setEditComplaint("");
    setEditNotes("");
  }

  async function handleAddEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patientRecord = patientRegistrations.find((patient) => patient.id === selectedPatientId);
    if (!patientRecord) {
      setToast({ message: "Select a registered patient before creating a triage entry.", type: "error" });
      return;
    }
    if (!newComplaint.trim()) {
      setToast({ message: "Add the presenting complaint before saving triage.", type: "error" });
      return;
    }

    setSubmittingNew(true);

    const route = resolveDoctorRoute(newDoctorRoute, activeDoctors);
    const recordedAt = new Date().toISOString();

    addWardPatient({
      id: `WP-TR-${patientRecord.patientId}-${recordedAt.replace(/\D/g, "").slice(-14)}`,
      patientName: patientRecord.patientName,
      patientId: patientRecord.patientId,
      unit: "Outpatient",
      bed: buildOutpatientBed(outpatientPatients),
      diagnosis: newComplaint.trim(),
      admittedAt: recordedAt,
      assignedNurse: nurseName,
      priority: mapUrgencyToPriority(newUrgency),
      status: "Active",
      doctorInCharge: route.doctorName,
      doctorSpecialty: route.doctorSpecialty,
      notes: newNotes.trim() || undefined,
      vitals:
        newBP || newPulse || newTemp || newSpo2
          ? {
              bp: newBP || "-",
              pulse: newPulse || "-",
              temp: newTemp || "-",
              spo2: newSpo2 || "-",
              recordedAt,
              recordedBy: nurseName,
            }
          : undefined,
      lastVitalsAt: newBP || newPulse || newTemp || newSpo2 ? recordedAt : undefined,
    });

    setToast({
      message: `${patientRecord.patientName} added to the outpatient triage queue.`,
      type: "success",
    });
    setSubmittingNew(false);
    setShowNewModal(false);
    resetNewEntryForm();
  }

  async function handleSaveTriage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!triageTarget) return;
    if (!editComplaint.trim()) {
      setToast({ message: "Presenting complaint is required for triage.", type: "error" });
      return;
    }

    setSavingTriage(true);

    const route = resolveDoctorRoute(editDoctorRoute, activeDoctors);
    const hasVitals = editBP || editPulse || editTemp || editSpo2;
    const recordedAt = new Date().toISOString();

    updateWardPatient(triageTarget.id, {
      diagnosis: editComplaint.trim(),
      priority: mapUrgencyToPriority(editUrgency),
      assignedNurse: nurseName,
      doctorInCharge: route.doctorName,
      doctorSpecialty: route.doctorSpecialty,
      notes: editNotes.trim() || undefined,
      vitals: hasVitals
        ? {
            bp: editBP || "-",
            pulse: editPulse || "-",
            temp: editTemp || "-",
            spo2: editSpo2 || "-",
            recordedAt,
            recordedBy: nurseName,
          }
        : triageTarget.vitals,
      lastVitalsAt: hasVitals ? recordedAt : triageTarget.lastVitalsAt,
    });

    setToast({
      message: `Triage details updated for ${triageTarget.patientName}.`,
      type: "success",
    });
    setSavingTriage(false);
    closeTriage();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Triage Queue"
        description="Record vitals, prioritise outpatient patients, and prepare safe nurse-side handoff to doctors."
        action={<Button onClick={() => setShowNewModal(true)}>+ New Triage Entry</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Active queue",
            value: outpatientPatients.length,
            sub: "Outpatient patients currently in triage",
            href: `${INTERNAL_PREFIX}/nurses/triage`,
            color: "text-slate-900",
          },
          {
            label: "Ready for doctor",
            value: outpatientPatients.filter((patient) => getTriageStatus(patient, activeDoctorNames, activeDoctorSpecialties) === "Ready for doctor").length,
            sub: "Complete vitals and a valid doctor route assigned",
            href: `${INTERNAL_PREFIX}/nurses/triage`,
            color: "text-emerald-700",
          },
          {
            label: "Need vitals",
            value: outpatientPatients.filter((patient) => !hasCompleteVitals(patient)).length,
            sub: "Still waiting for complete triage vitals",
            href: `${INTERNAL_PREFIX}/nurses/triage`,
            color: "text-amber-700",
          },
          {
            label: "Sample follow-up",
            value: outpatientPatients.filter((patient) => (patient.labTestsOrdered ?? 0) > 0).length,
            sub: "Patients with active lab follow-up",
            href: `${INTERNAL_PREFIX}/nurses/sample-collection`,
            color: "text-sky-700",
          },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="block">
            <Card className="h-full border-slate-200 transition hover:border-[var(--accent)]/30 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className={`mt-3 text-2xl font-bold sm:text-3xl ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">{card.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "CRITICAL", "HIGH", "ROUTINE"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilterUrgency(value)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filterUrgency === value
                ? "bg-[var(--accent)] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {value === "ALL" ? "All Patients" : value}
            <span className="ml-1.5 opacity-70">
              (
              {value === "ALL"
                ? outpatientPatients.length
                : outpatientPatients.filter(
                    (patient) => mapPriorityToUrgency(patient.priority) === value,
                  ).length}
              )
            </span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Outpatient Triage Queue</h3>
            <p className="text-xs text-slate-400">
              Front Desk registrations appear here automatically. Record triage here, then hand off inside the nurses portal.
            </p>
          </div>
          <Link
            href={`${INTERNAL_PREFIX}/nurses/medication-administration`}
            className="text-sm font-semibold text-accent hover:underline"
          >
            Medication Administration {"->"}
          </Link>
        </div>
        <div className="space-y-3 p-3 lg:hidden">
          {displayedPatients.map((patient) => {
            const triageStatus = getTriageStatus(patient, activeDoctorNames, activeDoctorSpecialties);
            return (
              <div key={patient.id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${patient.priority === "Critical" ? "ring-1 ring-red-100" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                      className="truncate text-sm font-semibold text-slate-900 hover:text-[var(--accent)] hover:underline"
                    >
                      {patient.patientName}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-400">{patient.patientId}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[patient.priority]}`}>
                    {mapPriorityToUrgency(patient.priority)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <MobileMeta label="Bed" value={patient.bed} />
                  <MobileMeta label="Doctor Route" value={describeDoctorRoute(patient)} />
                  <MobileMeta label="BP" value={patient.vitals?.bp ?? "-"} />
                  <MobileMeta label="Pulse" value={patient.vitals?.pulse ?? "-"} />
                  <MobileMeta label="Temp" value={patient.vitals?.temp ?? "-"} />
                  <MobileMeta label="SpO2" value={patient.vitals?.spo2 ?? "-"} />
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-slate-500">{patient.diagnosis || "-"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{patient.notes || "No triage notes yet"}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    triageStatus === "Ready for doctor"
                      ? "bg-emerald-50 text-emerald-700"
                      : triageStatus === "Awaiting doctor"
                        ? "bg-sky-50 text-sky-700"
                        : triageStatus === "Awaiting vitals"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                  }`}>
                    {triageStatus}
                  </span>
                  <span className="text-[11px] text-slate-400">{fmtClock(patient.lastVitalsAt || patient.admittedAt)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openTriage(patient)}>
                    Record triage
                  </Button>
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
            );
          })}
          {displayedPatients.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              No outpatient triage patients match this filter.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                {[
                  "ID",
                  "Urgency",
                  "Patient",
                  "Complaint",
                  "Doctor",
                  "BP",
                  "Pulse",
                  "Temp",
                  "SpO2",
                  "Time",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{patient.bed}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[patient.priority]}`}>
                      {mapPriorityToUrgency(patient.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                      className="font-semibold text-slate-900 hover:text-[var(--accent)] hover:underline"
                    >
                      {patient.patientName}
                    </Link>
                    <p className="text-xs text-slate-400">{patient.patientId}</p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-600">
                    <p className="truncate">{patient.diagnosis || "-"}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{patient.notes || "No triage notes yet"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{describeDoctorRoute(patient)}</td>
                  <td className="px-4 py-3 text-slate-700">{patient.vitals?.bp ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{patient.vitals?.pulse ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{patient.vitals?.temp ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{patient.vitals?.spo2 ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtClock(patient.lastVitalsAt || patient.admittedAt)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const triageStatus = getTriageStatus(patient, activeDoctorNames, activeDoctorSpecialties);
                      const triageClassName =
                        triageStatus === "Ready for doctor"
                          ? "bg-emerald-50 text-emerald-700"
                          : triageStatus === "Awaiting doctor"
                            ? "bg-sky-50 text-sky-700"
                            : triageStatus === "Awaiting vitals"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600";

                      return (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${triageClassName}`}
                    >
                      {triageStatus}
                    </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openTriage(patient)}>
                        Record triage
                      </Button>
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
              {displayedPatients.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">No outpatient triage patients match this filter.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Front Desk check-in populates this queue automatically, or use &quot;New Triage Entry&quot; for an already registered patient.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Queue Readiness</h3>
            <Link href={`${INTERNAL_PREFIX}/nurses/sample-collection`} className="text-sm font-semibold text-accent hover:underline">
              Sample Collection {"->"}
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {outpatientPatients.slice(0, 6).map((patient) => (
                <div key={patient.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  getTriageStatus(patient, activeDoctorNames, activeDoctorSpecialties) === "Ready for doctor"
                    ? "bg-emerald-500"
                    : getTriageStatus(patient, activeDoctorNames, activeDoctorSpecialties) === "Awaiting doctor"
                      ? "bg-sky-500"
                      : "bg-amber-500"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{patient.patientName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {patient.patientId} - {patient.diagnosis || "Complaint pending"} - Nurse {patient.assignedNurse || nurseName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-700">{getTriageStatus(patient, activeDoctorNames, activeDoctorSpecialties)}</p>
                  <p className="text-xs text-slate-400">{fmtRecordedAt(patient.lastVitalsAt || patient.admittedAt)}</p>
                </div>
              </div>
            ))}
            {outpatientPatients.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No active outpatient queue yet.</div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900">Nurse Actions</h3>
            <p className="mt-1 text-sm text-slate-500">Stay inside nurse-safe routes while working the triage queue.</p>
          </div>
          <div className="space-y-3">
            {[
              {
                label: "Patient Records",
                sub: "View the nurse-access patient summary for each patient",
                href: `${INTERNAL_PREFIX}/nurses`,
              },
              {
                label: "Medication Administration",
                sub: "Track meds once the doctor has reviewed the patient",
                href: `${INTERNAL_PREFIX}/nurses/medication-administration`,
              },
              {
                label: "Sample Collection",
                sub: "Follow up ordered lab samples without opening Lab dashboards",
                href: `${INTERNAL_PREFIX}/nurses/sample-collection`,
              },
              {
                label: "Handover Notes",
                sub: "Document triage-to-doctor or shift handover notes",
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
                <span className="text-slate-400">{">"}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Triage Entry" className="max-w-2xl">
        <form id="triage-create-form" onSubmit={handleAddEntry} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Registered Patient <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className={inputCls}
              disabled={loadingLookups || availableRegistrations.length === 0}
            >
              <option value="">
                {loadingLookups ? "Loading patients..." : "Select a registered patient"}
              </option>
              {availableRegistrations.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.patientName} ({patient.patientId})
                </option>
              ))}
            </select>
            {!loadingLookups && availableRegistrations.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Every recently registered patient is already in the active outpatient queue.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Urgency Level <span className="text-red-500">*</span>
              </label>
              <select value={newUrgency} onChange={(event) => setNewUrgency(event.target.value as Exclude<UrgencyFilter, "ALL">)} className={inputCls}>
                <option value="ROUTINE">Routine</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Route to Doctor / Specialty</label>
              <select value={newDoctorRoute} onChange={(event) => setNewDoctorRoute(event.target.value)} className={inputCls}>
                <option value="">Assign later</option>
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
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Presenting Complaint <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={newComplaint}
              onChange={(event) => setNewComplaint(event.target.value)}
              placeholder="Reason for visit / presenting complaint"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "BP", value: newBP, setValue: setNewBP, placeholder: "120/80" },
              { label: "Pulse", value: newPulse, setValue: setNewPulse, placeholder: "72" },
              { label: "Temp", value: newTemp, setValue: setNewTemp, placeholder: "37.0" },
              { label: "SpO2", value: newSpo2, setValue: setNewSpo2, placeholder: "99" },
            ].map((field) => (
              <div key={field.label}>
                <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
                <input
                  value={field.value}
                  onChange={(event) => field.setValue(event.target.value)}
                  placeholder={field.placeholder}
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nurse Notes</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
              placeholder="Short handover or triage note"
              className={`${inputCls} resize-none`}
            />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNewModal(false)}>
            Cancel
          </Button>
          <Button size="md" type="submit" form="triage-create-form" disabled={submittingNew}>
            {submittingNew ? "Saving..." : "Add to Queue"}
          </Button>
        </ModalFooter>
      </Modal>

      {triageTarget && (
        <Modal open={true} onClose={closeTriage} title={`Record Triage - ${triageTarget.patientName}`} className="max-w-2xl">
          <form id="triage-update-form" onSubmit={handleSaveTriage} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">{triageTarget.patientId}</span>
                {" - "}
                {triageTarget.bed}
                {" - "}
                Arrived {fmtRecordedAt(triageTarget.admittedAt)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Urgency</label>
                <select value={editUrgency} onChange={(event) => setEditUrgency(event.target.value as Exclude<UrgencyFilter, "ALL">)} className={inputCls}>
                  <option value="ROUTINE">Routine</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Route to Doctor / Specialty</label>
                <select value={editDoctorRoute} onChange={(event) => setEditDoctorRoute(event.target.value)} className={inputCls}>
                  <option value="">Assign later</option>
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
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Presenting Complaint</label>
              <textarea
                rows={2}
                value={editComplaint}
                onChange={(event) => setEditComplaint(event.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "BP", value: editBP, setValue: setEditBP, placeholder: "120/80" },
                { label: "Pulse", value: editPulse, setValue: setEditPulse, placeholder: "72" },
                { label: "Temp", value: editTemp, setValue: setEditTemp, placeholder: "37.0" },
                { label: "SpO2", value: editSpo2, setValue: setEditSpo2, placeholder: "99" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
                  <input
                    value={field.value}
                    onChange={(event) => field.setValue(event.target.value)}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nurse Notes</label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="Short handover, observation, or preparation notes"
                className={`${inputCls} resize-none`}
              />
            </div>
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={closeTriage}>
              Cancel
            </Button>
            <Button size="md" type="submit" form="triage-update-form" disabled={savingTriage}>
              {savingTriage ? "Saving..." : "Save Triage"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
