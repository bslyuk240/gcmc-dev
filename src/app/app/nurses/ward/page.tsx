"use client";

import Link from "next/link";
import { useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import {
  addNursingProcedure,
  addWardPatient,
  updateWardPatient,
  type NursingProcedure,
  type WardPatient,
} from "@/lib/data/nurses-store";
import { addNursingCharge } from "@/lib/data/accounts-store";
import { updateAdmissionOrder, type AdmissionOrder } from "@/lib/data/doctors-store";
import { RecordConsumableModal } from "@/components/nurses/record-consumable-modal";
import { dischargeInpatientStay, openInpatientStay } from "@/lib/inpatient/client";
import { checkHmoPreauthStatus, createHmoPreauthorization } from "@/lib/nhis/client";
import { useBillingPresets } from "@/lib/hooks/use-billing-presets";
import {
  NURSING_PROCEDURE_TYPES,
  type NursingProcedureType,
} from "@/lib/billing/preset-catalog";

const PRIORITY_STYLES: Record<WardPatient["priority"], string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-yellow-50 text-yellow-700",
  Stable: "bg-emerald-50 text-emerald-700",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
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

function buildWardBed(patients: WardPatient[]) {
  const usedBeds = new Set(
    patients
      .filter((patient) => patient.unit === "Ward" && patient.status === "Active")
      .map((patient) => patient.bed),
  );

  let bedNumber = 1;
  while (usedBeds.has(`WD-${bedNumber}`)) bedNumber += 1;
  return `WD-${bedNumber}`;
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function isLikelyToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  const shortDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fullDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return value.includes(shortDate) || value.includes(fullDate);
}

export default function NursesWardPage() {
  const { getByUnit, procedures } = useNursesStore();
  const { admissionOrders } = useDoctorsStore();
  const { getAmount } = useBillingPresets();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Ward Nurse";

  const wardPatients = getByUnit("Ward").filter((patient) => patient.status === "Active");
  const wardProcedures = procedures.filter((entry) => entry.unit === "Ward");
  const proceduresToday = wardProcedures.filter((entry) => isLikelyToday(entry.performedAt));
  const watchList = wardPatients.filter((patient) => patient.priority === "Watch" || patient.priority === "High" || patient.priority === "Critical");
  const pendingWardAdmissions = admissionOrders.filter(
    (order) =>
      order.unit === "Ward" &&
      order.status === "Pending" &&
      !wardPatients.some((patient) => patient.patientId === order.patientId),
  );

  const [vitalsTarget, setVitalsTarget] = useState<WardPatient | null>(null);
  const [procedureTarget, setProcedureTarget] = useState<WardPatient | null>(null);
  const [dischargeTarget, setDischargeTarget] = useState<WardPatient | null>(null);
  const [admissionTarget, setAdmissionTarget] = useState<AdmissionOrder | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [vitalsNurse, setVitalsNurse] = useState(staffName);

  const [procedureType, setProcedureType] = useState<NursingProcedureType>("Injection");
  const [procedureDescription, setProcedureDescription] = useState("");
  const [procedureNurse, setProcedureNurse] = useState(staffName);

  const [admissionPriority, setAdmissionPriority] = useState<WardPatient["priority"]>("Watch");
  const [admissionNotes, setAdmissionNotes] = useState("");
  const [admissionNurse, setAdmissionNurse] = useState(staffName);

  const [consumableTarget, setConsumableTarget] = useState<WardPatient | null>(null);

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
    setProcedureType("Injection");
    setProcedureDescription("");
    setProcedureNurse(staffName);
  }

  function openAdmission(order: AdmissionOrder) {
    setAdmissionTarget(order);
    setAdmissionPriority("Watch");
    setAdmissionNotes(order.reason ?? "");
    setAdmissionNurse(staffName);
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

    setToast({ message: `Vitals recorded for ${vitalsTarget.patientName}.`, type: "success" });
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
    const description = procedureDescription.trim() || `${procedureType} for ${procedureTarget.patientName}`;
    const amount = getAmount("procedure", procedureType);
    const procedureId = createLocalId("NP");

    let preauthNote = "";
    try {
      const preauth = await checkHmoPreauthStatus(procedureTarget.patientId, "procedure");
      if (preauth.required && preauth.hasEnrollment && !preauth.approved) {
        if (!preauth.pending) {
          await createHmoPreauthorization({
            patientRef: procedureTarget.patientId,
            patientName: procedureTarget.patientName,
            serviceCategory: "procedure",
            serviceName: `${procedureType} — ${description}`,
            amountCap: amount,
            referenceType: "nursing_procedure",
            referenceId: procedureId,
          });
        }
        preauthNote = " HMO pre-auth pending — collect full fee until NHIS approves.";
      }
    } catch {
      /* non-HMO — continue */
    }

    const procedure: NursingProcedure = {
      id: procedureId,
      patientName: procedureTarget.patientName,
      patientId: procedureTarget.patientId,
      unit: "Ward",
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
        message: `${procedureType} recorded for ${procedureTarget.patientName}. Billing is now in Accounts.${preauthNote}`,
        type: preauthNote ? "info" : "success",
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

  function openConsumable(patient: WardPatient) {
    setConsumableTarget(patient);
  }

  function handleDischarge() {
    if (!dischargeTarget) return;

    void (async () => {
      updateWardPatient(dischargeTarget.id, { status: "Discharged" });
      const relatedOrder = admissionOrders.find(
        (order) => order.patientId === dischargeTarget.patientId && order.unit === "Ward" && order.status === "Admitted",
      );
      if (relatedOrder) await updateAdmissionOrder(relatedOrder.id, { status: "Discharged" });

      try {
        await dischargeInpatientStay({
          patientId: dischargeTarget.patientId,
          unit: "Ward",
        });
      } catch {
        // Ward discharge still succeeds locally if billing sync fails.
      }

      setToast({ message: `${dischargeTarget.patientName} discharged from Ward.`, type: "info" });
      setDischargeTarget(null);
    })();
  }

  function handleAcceptAdmission() {
    if (!admissionTarget) return;

    void (async () => {
      try {
        const preauth = await checkHmoPreauthStatus(admissionTarget.patientId, "admission");
        if (preauth.required && preauth.hasEnrollment && !preauth.approved) {
          setToast({
            message: preauth.pending
              ? `${admissionTarget.patientName} has HMO admission pre-auth pending at NHIS. Approve before ward intake.`
              : `${admissionTarget.patientName} needs HMO admission pre-authorization. Ask the doctor to submit an admission order.`,
            type: "error",
          });
          return;
        }
      } catch {
        /* continue for non-HMO */
      }

      const nurseLabel = admissionNurse.trim() || staffName;
      const wardPatientId = createLocalId("WP-WD");
      const bed = buildWardBed(wardPatients);

      addWardPatient({
        id: wardPatientId,
        patientName: admissionTarget.patientName,
        patientId: admissionTarget.patientId,
        unit: "Ward",
        bed,
        diagnosis: admissionTarget.reason || "Doctor admission order",
        admittedAt: new Date().toISOString(),
        assignedNurse: nurseLabel,
        priority: admissionPriority,
        status: "Active",
        doctorInCharge: admissionTarget.orderedBy,
        notes: admissionNotes.trim() || undefined,
      });
      await updateAdmissionOrder(admissionTarget.id, { status: "Admitted" });

      const stayResult = await openInpatientStay({
        patientId: admissionTarget.patientId,
        patientName: admissionTarget.patientName,
        unit: "Ward",
        bed,
        admissionOrderId: admissionTarget.id,
        wardPatientId,
        doctorInCharge: admissionTarget.orderedBy,
      });
      if ("error" in stayResult) {
        const isPreauth = stayResult.error.includes("pre-authorization");
        setToast({
          message: isPreauth
            ? `${admissionTarget.patientName}: ${stayResult.error}. Review at NHIS → Pre-authorizations.`
            : `${admissionTarget.patientName} admitted, but inpatient billing stay was not opened: ${stayResult.error}.`,
          type: "error",
        });
      } else {
        setToast({ message: `${admissionTarget.patientName} admitted into Ward.`, type: "success" });
      }

      setAdmissionTarget(null);
      setAdmissionNotes("");
    })();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward / Inpatient Unit"
        description="Admitted patient care, bed monitoring, medication administration, and nursing observations."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Admitted Patients",
            value: wardPatients.length,
            sub: "Current active ward census",
            href: `${INTERNAL_PREFIX}/nurses/ward`,
            color: "text-emerald-700",
          },
          {
            label: "On Watch",
            value: watchList.length,
            sub: "Patients needing closer nursing review",
            href: `${INTERNAL_PREFIX}/nurses/ward`,
            color: "text-amber-700",
          },
          {
            label: "Meds Scheduled",
            value: wardPatients.reduce((sum, patient) => sum + (patient.medsScheduled ?? 0), 0),
            sub: "Inpatient medication workload",
            href: `${INTERNAL_PREFIX}/nurses/medication-administration`,
            color: "text-violet-700",
          },
          {
            label: "Procedures Today",
            value: proceduresToday.length,
            sub: `${pendingWardAdmissions.length} pending ward admission order(s)`,
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

      {pendingWardAdmissions.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-slate-900">Pending Ward Admissions</h3>
              <p className="text-xs text-slate-400">Doctor admission orders waiting for nursing intake into the ward.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {pendingWardAdmissions.length} pending
            </span>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {pendingWardAdmissions.map((order) => (
              <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{order.patientName}</p>
                    <p className="truncate text-[11px] text-slate-400">{order.patientId} / {order.orderedBy}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    {order.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <MobileMeta label="Reason" value={order.reason || "No admission note provided"} />
                  <MobileMeta label="Requested" value={fmtDateTime(order.orderedAt)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openAdmission(order)}>Admit to Ward</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(order.patientId)}`}
                  >
                    Open record
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden divide-y divide-slate-100 md:block">
            {pendingWardAdmissions.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{order.patientName}</p>
                  <p className="text-xs text-slate-500">{order.patientId} / Ordered by {order.orderedBy}</p>
                  <p className="mt-1 text-xs text-slate-400">{order.reason || "No admission note provided"}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{fmtDateTime(order.orderedAt)}</p>
                  <p>{order.status}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openAdmission(order)}>
                    Admit to Ward
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(order.patientId)}`}
                  >
                    Open record
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Ward Patients</h3>
            <p className="text-xs text-slate-400">Work from nurse-safe patient records and ward actions only.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Link href={`${INTERNAL_PREFIX}/nurses/medication-administration`} className="text-sm font-semibold text-accent hover:underline">
              Medication Administration {"->"}
            </Link>
            <Link href={`${INTERNAL_PREFIX}/nurses/procedure-charges`} className="text-sm font-semibold text-accent hover:underline">
              Procedure Charges {"->"}
            </Link>
          </div>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {wardPatients.map((patient) => (
            <div key={patient.id} className={patient.priority === "Critical" ? "rounded-xl border border-red-200 bg-red-50/40 p-4 shadow-sm" : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                    className="truncate text-sm font-semibold text-slate-900 hover:text-[var(--accent)]"
                  >
                    {patient.patientName}
                  </Link>
                  <p className="truncate text-[11px] text-slate-400">{patient.patientId} / Bed {patient.bed}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                  {patient.priority}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <MobileMeta label="Diagnosis" value={patient.diagnosis || "—"} />
                <MobileMeta label="Doctor" value={patient.doctorInCharge || "—"} />
                <MobileMeta label="Nurse" value={patient.assignedNurse || "—"} />
                <MobileMeta label="Vitals" value={patient.vitals?.bp || patient.vitals?.pulse ? `BP ${patient.vitals?.bp || "-"} / HR ${patient.vitals?.pulse || "-"}` : "Not recorded"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openVitals(patient)}>Vitals</Button>
                <Button size="sm" variant="outline" onClick={() => openProcedure(patient)}>Procedure</Button>
                <Button size="sm" variant="outline" onClick={() => openConsumable(patient)}>Materials</Button>
                <Button
                  size="sm"
                  variant="outline"
                  href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                >
                  Open record
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDischargeTarget(patient)}>Discharge</Button>
              </div>
            </div>
          ))}
          {wardPatients.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              No admitted patients in Ward yet.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Bed", "Patient", "Diagnosis", "Doctor", "Nurse", "Last Vitals", "Priority", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wardPatients.map((patient) => (
                <tr key={patient.id} className={patient.priority === "Critical" ? "bg-red-50/20 hover:bg-red-50/30" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{patient.bed}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                      className="font-semibold text-slate-900 hover:text-[var(--accent)] hover:underline"
                    >
                      {patient.patientName}
                    </Link>
                    <p className="text-xs text-slate-400">{patient.patientId}</p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-slate-600">
                    <p className="truncate">{patient.diagnosis || "--"}</p>
                    <p className="mt-1 truncate text-slate-400">{patient.notes || "No ward notes yet"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{patient.doctorInCharge || "--"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{patient.assignedNurse || "--"}</td>
                  <td className="px-4 py-3">
                    {patient.vitals?.bp || patient.vitals?.pulse ? (
                      <div className="text-xs">
                        <p className="font-medium text-slate-700">BP: {patient.vitals?.bp || "-"} / HR: {patient.vitals?.pulse || "-"}</p>
                        <p className="text-slate-400">Temp: {patient.vitals?.temp || "-"} / SpO2: {patient.vitals?.spo2 || "-"}</p>
                        <p className="text-slate-400">{fmtClock(patient.lastVitalsAt || patient.vitals?.recordedAt)}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600">Not recorded</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                      {patient.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openVitals(patient)}>
                        Vitals
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openProcedure(patient)}>
                        Procedure
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openConsumable(patient)}>
                        Materials
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        href={`${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patient.patientId)}`}
                      >
                        Open record
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDischargeTarget(patient)}>
                        Discharge
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {wardPatients.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">No admitted patients in Ward yet.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      New ward patients appear here after nurses accept doctor admission orders or transfer a patient into Ward.
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
            <h3 className="font-bold text-slate-900">Recent Ward Procedures</h3>
            <Link href={`${INTERNAL_PREFIX}/nurses/procedure-charges`} className="text-sm font-semibold text-accent hover:underline">
              Billing Queue {"->"}
            </Link>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {wardProcedures.slice(0, 6).map((procedure) => (
              <div key={procedure.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{procedure.patientName}</p>
                    <p className="truncate text-[11px] text-slate-400">{procedure.procedureType} / {procedure.performedBy}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${procedure.billStatus === "Billed" || procedure.billStatus === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {procedure.billStatus}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <MobileMeta label="Description" value={procedure.description} />
                  <MobileMeta label="Amount" value={`NGN ${procedure.amount.toLocaleString()}`} />
                  <MobileMeta label="Performed" value={fmtDateTime(procedure.performedAt)} />
                </div>
              </div>
            ))}
            {wardProcedures.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No ward procedures recorded yet.</div>
            )}
          </div>

          <div className="hidden divide-y divide-slate-100 md:block">
            {wardProcedures.slice(0, 6).map((procedure) => (
              <div key={procedure.id} className="flex items-center gap-4 px-5 py-4">
                <div className={`h-2.5 w-2.5 rounded-full ${procedure.billStatus === "Billed" || procedure.billStatus === "Paid" ? "bg-emerald-500" : "bg-amber-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {procedure.patientName} / {procedure.procedureType}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {procedure.description} / {procedure.performedBy}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">NGN {procedure.amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{fmtDateTime(procedure.performedAt)}</p>
                </div>
              </div>
            ))}
            {wardProcedures.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No ward procedures recorded yet.</div>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900">Ward Actions</h3>
            <p className="mt-1 text-sm text-slate-500">Stay inside nurse-safe workflow pages while managing inpatients.</p>
          </div>
          <div className="space-y-3">
            {[
              {
                label: "Medication Administration",
                sub: "MAR and inpatient medication tracking",
                href: `${INTERNAL_PREFIX}/nurses/medication-administration`,
              },
              {
                label: "Sample Collection",
                sub: "Follow up lab samples without opening Lab dashboards",
                href: `${INTERNAL_PREFIX}/nurses/sample-collection`,
              },
              {
                label: "Procedure Charges",
                sub: "Review billed nursing procedures",
                href: `${INTERNAL_PREFIX}/nurses/procedure-charges`,
              },
              {
                label: "Handover Notes",
                sub: "Document shift and ward handover updates",
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

      <Modal open={!!admissionTarget} onClose={() => setAdmissionTarget(null)} title={`Admit to Ward - ${admissionTarget?.patientName ?? ""}`}>
        {admissionTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">{admissionTarget.patientId}</span> / Ordered by {admissionTarget.orderedBy}</p>
              <p className="mt-1 text-xs text-slate-500">{admissionTarget.reason || "No reason provided"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Assigned Nurse</label>
                <input value={admissionNurse} onChange={(event) => setAdmissionNurse(event.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Priority</label>
                <select value={admissionPriority} onChange={(event) => setAdmissionPriority(event.target.value as WardPatient["priority"])} className={inputCls}>
                  {["Stable", "Watch", "High", "Critical"].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ward Notes</label>
              <textarea
                rows={3}
                value={admissionNotes}
                onChange={(event) => setAdmissionNotes(event.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Initial ward handover, admission note, or bed preparation notes"
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setAdmissionTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleAcceptAdmission}>Confirm Ward Admission</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!vitalsTarget} onClose={() => setVitalsTarget(null)} title={`Record Vitals - ${vitalsTarget?.patientName ?? ""}`}>
        {vitalsTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">{vitalsTarget.bed}</span> / {vitalsTarget.diagnosis || "No diagnosis recorded"}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Blood Pressure *</label>
                <input value={bp} onChange={(event) => setBp(event.target.value)} placeholder="120/80" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Pulse *</label>
                <input value={pulse} onChange={(event) => setPulse(event.target.value)} placeholder="72" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Temperature</label>
                <input value={temp} onChange={(event) => setTemp(event.target.value)} placeholder="37.0" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">SpO2</label>
                <input value={spo2} onChange={(event) => setSpo2(event.target.value)} placeholder="99" className={inputCls} />
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
          <Button size="md" disabled={!bp.trim() || !pulse.trim()} onClick={handleRecordVitals}>Save Vitals</Button>
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
              <select value={procedureType} onChange={(event) => setProcedureType(event.target.value as NursingProcedureType)} className={inputCls}>
                {NURSING_PROCEDURE_TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry} (NGN {getAmount("procedure", entry).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
              <input
                value={procedureDescription}
                onChange={(event) => setProcedureDescription(event.target.value)}
                placeholder="Short procedure description"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Performed By</label>
              <input value={procedureNurse} onChange={(event) => setProcedureNurse(event.target.value)} className={inputCls} />
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              This procedure will create a nursing procedure record and a billed Accounts charge immediately.
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setProcedureTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleAddProcedure}>Record Procedure</Button>
        </ModalFooter>
      </Modal>

      <RecordConsumableModal
        open={!!consumableTarget}
        patientName={consumableTarget?.patientName ?? ""}
        patientId={consumableTarget?.patientId ?? ""}
        bed={consumableTarget?.bed}
        onClose={() => setConsumableTarget(null)}
        onSuccess={(message) => setToast({ message, type: "success" })}
        onError={(message) => setToast({ message, type: "error" })}
      />

      <Modal open={!!dischargeTarget} onClose={() => setDischargeTarget(null)} title="Discharge Patient">
        {dischargeTarget && (
          <p className="text-sm text-slate-700">
            Discharge <strong>{dischargeTarget.patientName}</strong> from <strong>{dischargeTarget.bed}</strong>? This updates the ward record and closes any active ward admission order.
          </p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setDischargeTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleDischarge}>Confirm Discharge</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
