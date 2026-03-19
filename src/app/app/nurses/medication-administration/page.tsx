"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  addNurseRequest,
  updateNurseRequestStatus,
  PHARMACY_DRUG_LIST,
  type NurseMedRequest,
  type SharedPrescription,
} from "@/lib/data/pharmacy-store";
import {
  fetchMAREntries,
  insertMAREntry,
  insertPatientObservation,
  upsertMAREntryStatus,
  type MAREntry,
} from "@/lib/supabase/db";

type Tab = "Doctor Prescriptions" | "MAR" | "Pharmacy Requests";
type DueState = "due" | "overdue";

const NURSE_REQUEST_STATUS_COLOR: Record<string, string> = {
  Requested: "bg-sky-100 text-sky-700",
  Preparing: "bg-amber-100 text-amber-800",
  Ready: "bg-violet-100 text-violet-800",
  Collected: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const MAR_STATUS_BADGE: Record<MAREntry["status"], "warning" | "success" | "destructive" | "neutral"> = {
  Scheduled: "warning",
  Given: "success",
  Missed: "destructive",
  Held: "neutral",
};

const ROUTES = ["Oral", "IV", "IV infusion", "IM", "SC", "Sublingual", "Topical", "Inhaled", "Rectal"];

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtDateTime(value?: string | null) {
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

function getDueState(entry: MAREntry): DueState {
  if (!entry.scheduledAt) return "due";
  const scheduledTime = new Date(entry.scheduledAt).getTime();
  if (Number.isNaN(scheduledTime)) return "due";
  return Date.now() - scheduledTime > 60 * 60 * 1000 ? "overdue" : "due";
}

function getDueLabel(entry: MAREntry) {
  return entry.status === "Scheduled"
    ? getDueState(entry) === "overdue"
      ? "overdue"
      : "due"
    : entry.status.toLowerCase();
}

function getDueVariant(entry: MAREntry) {
  if (entry.status === "Scheduled") {
    return getDueState(entry) === "overdue" ? "destructive" : "warning";
  }
  return MAR_STATUS_BADGE[entry.status];
}

function isAdmittedUnit(unit: string) {
  return unit === "Ward" || unit === "ICU" || unit === "Emergency";
}

function buildPrescriptionKey(rxId: string, drugName: string) {
  return `From prescription ${rxId} / ${drugName}`.toLowerCase();
}

export default function NursesMedicationAdministrationPage() {
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Nurse";
  const [activeTab, setActiveTab] = useState<Tab>("Doctor Prescriptions");
  const [marEntries, setMarEntries] = useState<MAREntry[]>([]);
  const [loadingMar, setLoadingMar] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<MAREntry | null>(null);
  const [skipTarget, setSkipTarget] = useState<MAREntry | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqPatient, setReqPatient] = useState("");
  const [reqPatientId, setReqPatientId] = useState("");
  const [reqWard, setReqWard] = useState("");
  const [reqDrug, setReqDrug] = useState("");
  const [reqDosage, setReqDosage] = useState("");
  const [reqRoute, setReqRoute] = useState("IV");
  const [reqQty, setReqQty] = useState("");
  const [reqUrgency, setReqUrgency] = useState<"Routine" | "Urgent" | "STAT">("Routine");
  const [reqNotes, setReqNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { prescriptions, nurseRequests } = usePharmacyStore();
  const { allPatients } = useNursesStore();

  const admittedPatients = useMemo(
    () => allPatients.filter((patient) => patient.status === "Active" && isAdmittedUnit(patient.unit)),
    [allPatients],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMarEntries() {
      setLoadingMar(true);
      try {
        const uniquePatientIds = [...new Set(admittedPatients.map((patient) => patient.patientId).filter(Boolean))];
        const rows = await Promise.all(uniquePatientIds.map((patientId) => fetchMAREntries(patientId)));
        if (cancelled) return;
        setMarEntries(
          rows.flat().sort((a, b) => {
            const aTime = new Date(a.scheduledAt ?? a.createdAt).getTime();
            const bTime = new Date(b.scheduledAt ?? b.createdAt).getTime();
            return bTime - aTime;
          }),
        );
      } finally {
        if (!cancelled) setLoadingMar(false);
      }
    }

    void loadMarEntries();

    return () => {
      cancelled = true;
    };
  }, [admittedPatients]);

  const patientByDisplayId = useMemo(
    () => new Map(admittedPatients.map((patient) => [patient.patientId, patient])),
    [admittedPatients],
  );

  const patientOptions: SelectOption[] = admittedPatients.map((patient) => ({
    value: patient.id,
    label: patient.patientName,
    sublabel: `${patient.unit} / Bed ${patient.bed} / ${patient.patientId}`,
    group: patient.unit,
  }));

  const drugOptions: SelectOption[] = PHARMACY_DRUG_LIST.map((drug) => ({
    value: drug.id,
    label: drug.name,
    sublabel: `${drug.category} / NGN ${drug.unitPrice}/${drug.unit}`,
    group: drug.category,
  }));

  const wardOptions: SelectOption[] = [
    { value: "Ward", label: "Ward / Inpatient" },
    { value: "ICU", label: "ICU" },
    { value: "Emergency", label: "Emergency" },
  ];

  const doctorPrescriptions = useMemo(
    () =>
      prescriptions.filter((rx) => {
        const patient = patientByDisplayId.get(rx.patientId);
        return Boolean(patient) || isAdmittedUnit(rx.department);
      }),
    [patientByDisplayId, prescriptions],
  );

  const dispensedPrescriptions = doctorPrescriptions.filter((rx) => rx.status === "Dispensed");
  const openRequests = nurseRequests.filter((request) => request.status !== "Collected" && request.status !== "Cancelled");
  const readyRequests = nurseRequests.filter((request) => request.status === "Ready");
  const scheduledEntries = marEntries.filter((entry) => entry.status === "Scheduled");
  const completedEntries = marEntries.filter((entry) => entry.status !== "Scheduled");
  const overdueEntries = scheduledEntries.filter((entry) => getDueState(entry) === "overdue");

  function resetRequestForm() {
    setReqPatient("");
    setReqPatientId("");
    setReqWard("");
    setReqDrug("");
    setReqDosage("");
    setReqRoute("IV");
    setReqQty("");
    setReqUrgency("Routine");
    setReqNotes("");
  }

  function handleSelectPatient(patientId: string) {
    const patient = admittedPatients.find((entry) => entry.id === patientId);
    if (!patient) return;
    setReqPatient(patient.patientName);
    setReqPatientId(patient.patientId);
    setReqWard(patient.unit);
  }

  function handleSelectDrug(drugId: string) {
    const drug = PHARMACY_DRUG_LIST.find((entry) => entry.id === drugId);
    if (!drug) return;
    setReqDrug(drugId);
    setReqDosage(drug.defaultDosage);
  }

  async function handleAdminister() {
    if (!confirmTarget) return;
    await upsertMAREntryStatus(confirmTarget.id, "Given", staffName);
    await insertPatientObservation({
      id: createLocalId("OBS-MAR"),
      patientId: confirmTarget.patientId,
      patientName: confirmTarget.patientName,
      unit: confirmTarget.unit,
      observation: `Medication administered: ${confirmTarget.drug} ${confirmTarget.dose} via ${confirmTarget.route}.`,
      recordedBy: staffName,
      recordedAt: new Date().toISOString(),
    });
    setMarEntries((prev) => prev.map((entry) => entry.id === confirmTarget.id ? { ...entry, status: "Given", givenAt: new Date().toISOString(), givenBy: staffName } : entry));
    setToast({ message: `${confirmTarget.drug} administered to ${confirmTarget.patientName}.`, type: "success" });
    setConfirmTarget(null);
  }

  async function handleHoldDose() {
    if (!skipTarget || !skipReason.trim()) return;
    await upsertMAREntryStatus(skipTarget.id, "Held");
    await insertPatientObservation({
      id: createLocalId("OBS-MAR"),
      patientId: skipTarget.patientId,
      patientName: skipTarget.patientName,
      unit: skipTarget.unit,
      observation: `Medication dose held: ${skipTarget.drug} ${skipTarget.dose}. Reason: ${skipReason.trim()}.`,
      recordedBy: staffName,
      recordedAt: new Date().toISOString(),
    });
    setMarEntries((prev) => prev.map((entry) => entry.id === skipTarget.id ? { ...entry, status: "Held", notes: skipReason.trim() } : entry));
    setToast({ message: `${skipTarget.drug} for ${skipTarget.patientName} marked as held.`, type: "info" });
    setSkipTarget(null);
    setSkipReason("");
  }

  async function handleAddToMAR(rx: SharedPrescription) {
    const patient = patientByDisplayId.get(rx.patientId);
    const existingKeys = new Set(marEntries.map((entry) => `${entry.patientId}::${(entry.notes ?? "").toLowerCase()}`));

    const newEntries = rx.drugs
      .filter((drug) => !existingKeys.has(`${rx.patientId}::${buildPrescriptionKey(rx.id, drug.name)}`))
      .map((drug) => ({
        id: createLocalId("MAR-RX"),
        patientId: rx.patientId,
        patientName: rx.patientName,
        unit: patient?.unit ?? rx.department ?? "Ward",
        drug: drug.name,
        dose: drug.dosage,
        route: "As Prescribed",
        scheduledAt: new Date().toISOString(),
        status: "Scheduled" as const,
        notes: `From prescription ${rx.id} / ${drug.name} / ${drug.frequency} / ${drug.duration}`,
        createdAt: new Date().toISOString(),
      }));

    if (newEntries.length === 0) {
      setToast({ message: "This prescription is already in the MAR.", type: "info" });
      return;
    }

    await Promise.all(newEntries.map((entry) => insertMAREntry(entry)));
    setMarEntries((prev) => [...newEntries, ...prev]);
    setToast({ message: `${newEntries.length} medication item(s) added to MAR from ${rx.id}.`, type: "success" });
    setActiveTab("MAR");
  }

  async function handleSubmitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reqPatient.trim() || !reqDrug || !reqQty.trim()) {
      setToast({ message: "Fill in patient, drug, and quantity.", type: "error" });
      return;
    }

    setSubmitting(true);
    const drug = PHARMACY_DRUG_LIST.find((entry) => entry.id === reqDrug);
    const request: NurseMedRequest = {
      id: createLocalId("NRQ"),
      patientName: reqPatient.trim(),
      patientId: reqPatientId.trim() || createLocalId("PT-MED"),
      ward: reqWard || "Ward",
      requestedBy: staffName,
      drug: drug?.name ?? reqDrug,
      dosage: reqDosage.trim() || drug?.defaultDosage || "--",
      route: reqRoute,
      qty: reqQty.trim(),
      urgency: reqUrgency,
      notes: reqNotes.trim() || undefined,
      requestedAt: new Date().toISOString(),
      status: "Requested",
    };

    addNurseRequest(request);
    setSubmitting(false);
    setShowRequestModal(false);
    resetRequestForm();
    setToast({ message: `Request sent to Pharmacy for ${request.drug}.`, type: "success" });
    setActiveTab("Pharmacy Requests");
  }

  async function markCollected(request: NurseMedRequest) {
    updateNurseRequestStatus(request.id, "Collected");

    const entry: MAREntry = {
      id: createLocalId("MAR-PH"),
      patientId: request.patientId,
      patientName: request.patientName,
      unit: request.ward,
      drug: request.drug,
      dose: request.dosage || "--",
      route: request.route,
      scheduledAt: new Date().toISOString(),
      status: "Scheduled",
      notes: `From nurse request ${request.id}`,
      createdAt: new Date().toISOString(),
    };

    await insertMAREntry(entry);
    setMarEntries((prev) => [entry, ...prev]);
    setToast({ message: `${request.drug} collected and added to MAR for ${request.patientName}.`, type: "success" });
    setActiveTab("MAR");
  }

  const tabs: { label: Tab; badge?: number }[] = [
    { label: "Doctor Prescriptions", badge: dispensedPrescriptions.length },
    { label: "MAR", badge: scheduledEntries.length },
    { label: "Pharmacy Requests", badge: openRequests.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medication Administration"
        description="Medication handoff from doctors and pharmacy into the nurses MAR workflow."
        action={
          <Button size="md" onClick={() => setShowRequestModal(true)}>
            + Request from Pharmacy
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          {
            label: "Dispensed Prescriptions",
            value: dispensedPrescriptions.length,
            sub: `${doctorPrescriptions.length} doctor prescription(s) for admitted patients`,
            color: "text-slate-900",
          },
          {
            label: "Scheduled Doses",
            value: scheduledEntries.length,
            sub: `${overdueEntries.length} overdue for administration`,
            color: scheduledEntries.length > 0 ? "text-amber-600" : "text-slate-900",
          },
          {
            label: "Pharmacy Requests",
            value: openRequests.length,
            sub: `${readyRequests.length} ready for collection`,
            color: openRequests.length > 0 ? "text-violet-700" : "text-slate-900",
          },
          {
            label: "Completed Today",
            value: completedEntries.length,
            sub: "Given or held medication records",
            color: completedEntries.length > 0 ? "text-emerald-700" : "text-slate-900",
          },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-5 overflow-x-auto border-b border-slate-200 px-1">
        {tabs.map(({ label, badge }) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveTab(label)}
            className={`shrink-0 border-b-2 pb-3 pt-2 text-sm font-bold transition ${
              activeTab === label
                ? "border-accent text-accent-foreground"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {badge !== undefined && badge > 0 ? (
              <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "Doctor Prescriptions" ? (
        <div className="space-y-4">
          {doctorPrescriptions.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-slate-400">No doctor prescriptions found for active admitted patients.</p>
              <p className="mt-1 text-xs text-slate-400">Dispensed prescriptions from doctors and pharmacy will appear here.</p>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Showing {doctorPrescriptions.length} prescription(s) for admitted patients. Only dispensed items can move into MAR.
              </div>
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Rx ID", "Patient", "Doctor", "Medications", "Created", "Status", "Action"].map((heading) => (
                          <th key={heading} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctorPrescriptions.map((rx) => {
                        const patient = patientByDisplayId.get(rx.patientId);
                        return (
                          <tr key={rx.id} className={rx.urgency === "Urgent" ? "bg-red-50/20" : "hover:bg-slate-50"}>
                            <td className="px-5 py-3 font-mono text-xs font-bold text-slate-800">{rx.id}</td>
                            <td className="px-5 py-3">
                              <Link
                                href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(rx.patientId)}`}
                                className="font-semibold text-slate-900 hover:text-accent hover:underline"
                              >
                                {rx.patientName}
                              </Link>
                              <p className="text-xs text-slate-400">
                                {patient ? `${patient.unit} / Bed ${patient.bed}` : rx.department || "--"}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-slate-600">{rx.doctorName}</td>
                            <td className="px-5 py-3">
                              {rx.drugs.map((drug) => (
                                <div key={`${rx.id}-${drug.name}`} className="text-xs">
                                  <span className="font-medium text-slate-800">{drug.name}</span>
                                  <span className="text-slate-400"> / {drug.dosage} / {drug.frequency} / {drug.duration}</span>
                                </div>
                              ))}
                              {rx.notes ? <p className="mt-1 text-xs italic text-amber-700">{rx.notes}</p> : null}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(rx.createdAt)}</td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  rx.status === "Dispensed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : rx.status === "Pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : rx.status === "Processing"
                                        ? "bg-sky-100 text-sky-700"
                                        : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {rx.status}
                              </span>
                              {rx.urgency === "Urgent" ? (
                                <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                  URGENT
                                </span>
                              ) : null}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(rx.patientId)}`}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Open record
                                </Link>
                                {rx.status === "Dispensed" ? (
                                  <Button size="sm" onClick={() => void handleAddToMAR(rx)}>
                                    + Add to MAR
                                  </Button>
                                ) : (
                                  <span className="self-center text-xs text-slate-400">
                                    {rx.status === "Pending" ? "Awaiting Pharmacy" : rx.status}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      ) : null}

      {activeTab === "MAR" ? (
        <div className="space-y-6">
          {loadingMar ? (
            <Card className="py-10 text-center">
              <p className="text-slate-400">Loading MAR entries for admitted patients...</p>
            </Card>
          ) : null}

          {!loadingMar && scheduledEntries.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Pending Administration</h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {scheduledEntries.length} scheduled
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Patient", "Unit", "Drug", "Dose", "Route", "Due", "Status", "Action"].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheduledEntries.map((entry) => (
                      <tr key={entry.id} className={getDueState(entry) === "overdue" ? "bg-red-50/40" : "hover:bg-slate-50"}>
                        <td className="px-5 py-3">
                          <Link
                            href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(entry.patientId)}`}
                            className="font-semibold text-slate-900 hover:text-accent hover:underline"
                          >
                            {entry.patientName}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{entry.unit}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{entry.drug}</td>
                        <td className="px-5 py-3 text-slate-600">{entry.dose}</td>
                        <td className="px-5 py-3 text-slate-600">{entry.route}</td>
                        <td className="px-5 py-3 text-slate-500">{fmtDateTime(entry.scheduledAt)}</td>
                        <td className="px-5 py-3">
                          <StatusBadge variant={getDueVariant(entry)}>{getDueLabel(entry)}</StatusBadge>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setConfirmTarget(entry)}>
                              Administer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSkipTarget(entry);
                                setSkipReason("");
                              }}
                            >
                              Hold
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {!loadingMar && completedEntries.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Completed / Held</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Patient", "Drug", "Dose", "Route", "Updated", "By", "Status"].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedEntries.map((entry) => (
                      <tr key={entry.id} className="bg-slate-50/50 text-slate-500">
                        <td className="px-5 py-3 font-medium text-slate-700">{entry.patientName}</td>
                        <td className="px-5 py-3">{entry.drug}</td>
                        <td className="px-5 py-3">{entry.dose}</td>
                        <td className="px-5 py-3">{entry.route}</td>
                        <td className="px-5 py-3">{fmtDateTime(entry.givenAt ?? entry.createdAt)}</td>
                        <td className="px-5 py-3">{entry.givenBy ?? "--"}</td>
                        <td className="px-5 py-3">
                          <StatusBadge variant={MAR_STATUS_BADGE[entry.status]}>{entry.status.toLowerCase()}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {!loadingMar && scheduledEntries.length === 0 && completedEntries.length === 0 ? (
            <Card className="py-10 text-center">
              <p className="text-slate-400">No MAR entries yet. Add dispensed prescriptions or collect ready pharmacy requests.</p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Pharmacy Requests" ? (
        <div className="space-y-4">
          {readyRequests.length > 0 ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800">
              {readyRequests.length} medication request(s) are <strong>Ready for Collection</strong> from Pharmacy.
            </div>
          ) : null}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Medication Requests to Pharmacy</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Req ID", "Patient", "Unit", "Drug", "Route", "Urgency", "Requested", "Status", "Action"].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nurseRequests.map((request) => (
                    <tr key={request.id} className={request.status === "Ready" ? "bg-violet-50/30" : "hover:bg-slate-50"}>
                      <td className="px-5 py-3 font-bold text-slate-800 text-xs">{request.id}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(request.patientId)}`}
                          className="font-medium text-slate-900 hover:text-accent hover:underline"
                        >
                          {request.patientName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{request.ward}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{request.drug}</p>
                        <p className="text-xs text-slate-400">{request.dosage} / {request.qty}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{request.route}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            request.urgency === "STAT"
                              ? "bg-red-100 text-red-700"
                              : request.urgency === "Urgent"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {request.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(request.requestedAt)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            NURSE_REQUEST_STATUS_COLOR[request.status] ?? "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {request.status === "Ready" ? (
                          <Button size="sm" onClick={() => void markCollected(request)}>
                            Collect &amp; Add to MAR
                          </Button>
                        ) : request.status === "Collected" ? (
                          <span className="text-xs font-semibold text-emerald-600">In MAR</span>
                        ) : (
                          <span className="text-xs text-slate-400">Awaiting pharmacy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {nurseRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                        No medication requests sent yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Administration">
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">Confirm that you administered the following medication:</p>
          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{confirmTarget?.patientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Drug</span><span className="font-semibold">{confirmTarget?.drug}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dose</span><span>{confirmTarget?.dose}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Route</span><span>{confirmTarget?.route}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Due Time</span><span>{fmtDateTime(confirmTarget?.scheduledAt)}</span></div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setConfirmTarget(null)}>Cancel</Button>
          <Button size="md" onClick={() => void handleAdminister()}>Confirm Administered</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!skipTarget} onClose={() => setSkipTarget(null)} title="Hold Medication Dose">
        <p className="text-sm text-slate-600">
          Reason for holding <strong>{skipTarget?.drug}</strong> for <strong>{skipTarget?.patientName}</strong>:
        </p>
        <textarea
          rows={3}
          value={skipReason}
          onChange={(event) => setSkipReason(event.target.value)}
          placeholder="Patient refused, contraindication, out of stock..."
          className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setSkipTarget(null)}>Cancel</Button>
          <Button size="md" variant="outline" disabled={!skipReason.trim()} onClick={() => void handleHoldDose()}>
            Confirm Hold
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={showRequestModal} onClose={() => !submitting && setShowRequestModal(false)} title="Request Medication from Pharmacy">
        <form onSubmit={(event) => void handleSubmitRequest(event)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Patient <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={patientOptions}
              value={admittedPatients.find((patient) => patient.patientName === reqPatient)?.id ?? ""}
              onChange={handleSelectPatient}
              placeholder="Select admitted patient..."
            />
            {patientOptions.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">No active admitted patients found. You can type a name manually below.</p>
            ) : null}
            {!admittedPatients.find((patient) => patient.patientName === reqPatient) ? (
              <input
                type="text"
                value={reqPatient}
                onChange={(event) => setReqPatient(event.target.value)}
                placeholder="Or type patient name..."
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Patient ID</label>
              <input
                value={reqPatientId}
                onChange={(event) => setReqPatientId(event.target.value)}
                placeholder="P-00000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Unit</label>
              <SearchableSelect
                options={wardOptions}
                value={reqWard}
                onChange={setReqWard}
                placeholder="Select unit..."
                showGroups={false}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Drug <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={drugOptions}
              value={reqDrug}
              onChange={handleSelectDrug}
              placeholder="Search pharmacy drug catalog..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Dosage</label>
              <input
                value={reqDosage}
                onChange={(event) => setReqDosage(event.target.value)}
                placeholder="e.g. 1g"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={reqQty}
                onChange={(event) => setReqQty(event.target.value)}
                placeholder="e.g. 1 vial"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Route</label>
              <SearchableSelect
                options={ROUTES.map((route) => ({ value: route, label: route }))}
                value={reqRoute}
                onChange={setReqRoute}
                placeholder="Route..."
                showGroups={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Urgency</label>
              <div className="mt-1 flex gap-2">
                {(["Routine", "Urgent", "STAT"] as const).map((urgency) => (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() => setReqUrgency(urgency)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      reqUrgency === urgency
                        ? urgency === "STAT"
                          ? "bg-red-600 text-white"
                          : urgency === "Urgent"
                            ? "bg-orange-500 text-white"
                            : "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {urgency}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Clinical Notes</label>
            <textarea
              rows={2}
              value={reqNotes}
              onChange={(event) => setReqNotes(event.target.value)}
              placeholder="Notes for pharmacist..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
            />
          </div>

          <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            Requests appear immediately in the Pharmacy nurse-request queue for preparation.
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowRequestModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="md" type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send to Pharmacy"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
