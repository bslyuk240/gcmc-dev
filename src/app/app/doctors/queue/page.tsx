"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import { addConsultation, type ConsultType } from "@/lib/data/doctors-store";
import { addConsultationFee } from "@/lib/data/accounts-store";
import { useBillingPresets } from "@/lib/hooks/use-billing-presets";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import {
  canDoctorAccessPatient,
  describeDoctorRoute,
  getCurrentDoctorSpecialty,
} from "@/lib/utils/doctor-routing";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 font-bold",
  High: "bg-amber-100 text-amber-700",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-100 text-emerald-700",
};

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-5)}`;
}

function MobileMeta({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export default function DoctorsQueuePage() {
  const { allPatients } = useNursesStore();
  const { doctors, consultations } = useDoctorsStore();
  const { getAmount } = useBillingPresets();
  const session = useHMSSession();
  const router = useRouter();
  const doctorName = session?.full_name ?? "Doctor";
  const doctorSpecialty = getCurrentDoctorSpecialty(doctors, doctorName);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [consultingId, setConsultingId] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<ConsultType>("General");

  const activeConsultPatientIds = new Set(
    consultations
      .filter(
        (consultation) =>
          consultation.doctorName.trim().toLowerCase() === doctorName.trim().toLowerCase() &&
          (consultation.status === "In Progress" || consultation.status === "Awaiting Results"),
      )
      .map((consultation) => consultation.patientId),
  );

  const outpatientQueue = allPatients.filter(
    (patient) =>
      patient.unit === "Outpatient" &&
      patient.status === "Active" &&
      !activeConsultPatientIds.has(patient.patientId) &&
      canDoctorAccessPatient(patient, doctorName, doctorSpecialty),
  );
  const emergencyQueue = allPatients.filter(
    (patient) =>
      patient.unit === "Emergency" &&
      patient.status === "Active" &&
      !activeConsultPatientIds.has(patient.patientId) &&
      canDoctorAccessPatient(patient, doctorName, doctorSpecialty),
  );

  async function handleStartConsult(patient: typeof outpatientQueue[number]) {
    if (!doctorName || doctorName === "Doctor") {
      setToast({ message: "Doctor session is missing. Sign in again before starting a consultation.", type: "error" });
      return;
    }

    const type: ConsultType = consultType;
    const fee = getAmount("consultation", type, 100);
    const consultId = createLocalId("CON");

    const consultationRecord = {
      id: consultId,
      patientName: patient.patientName,
      patientId: patient.patientId,
      doctorName,
      consultType: type,
      date: new Date().toISOString(),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      status: "In Progress" as const,
      chiefComplaint: patient.diagnosis,
      rxWritten: false,
      labOrdered: false,
      admissionOrdered: false,
      consultFee: fee,
      feePaid: false,
    };

    const accountsType = (
      ["General", "Specialist", "Emergency", "Follow-up", "Antenatal"].includes(type) ? type : "General"
    ) as "General" | "Specialist" | "Emergency" | "Follow-up" | "Antenatal";

    const feeRecord = {
      id: createLocalId("CF"),
      patientName: patient.patientName,
      patientId: patient.patientId,
      doctorName,
      consultationType: accountsType,
      fee,
      status: "Pending" as const,
      consultedAt: new Date().toISOString(),
    };

    try {
      await addConsultation(consultationRecord);
      await addConsultationFee(feeRecord);
      setToast({ message: `Consultation started for ${patient.patientName}. Fee N${fee} sent to Accounts.`, type: "success" });
      setConsultingId(null);
      router.push(`${INTERNAL_PREFIX}/doctors/consultations`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setToast({ message: `Could not start consultation for ${patient.patientName}: ${message}`, type: "error" });
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Waiting Queue"
        description={
          doctorSpecialty
            ? `Patients routed to ${doctorSpecialty} or directly to ${doctorName}.`
            : `Patients routed directly to ${doctorName}.`
        }
      />

      <div className="flex gap-3">
        {[
          { label: "Outpatient Queue", value: outpatientQueue.length, color: outpatientQueue.length > 0 ? "text-amber-600" : "text-slate-400", kind: "metric" as const },
          { label: "Emergency Queue", value: emergencyQueue.length, color: emergencyQueue.length > 0 ? "text-red-700" : "text-slate-400", kind: "metric" as const },
          { label: "Visible To You", value: outpatientQueue.length + emergencyQueue.length, color: "text-slate-900", kind: "metric" as const },
          { label: doctorSpecialty ? "My Specialty" : "Routing Mode", value: doctorSpecialty || "Direct Assignment Only", color: "text-indigo-700", kind: "text" as const },
        ].map((stat) => (
          <Card key={stat.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            {stat.kind === "metric" ? (
              <>
                <p className={`shrink-0 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs font-semibold leading-tight text-slate-500">{stat.label}</p>
              </>
            ) : (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className={`truncate text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Outpatient Queue</h3>
          <p className="text-xs text-slate-400">Filtered by direct doctor assignment or specialty route</p>
        </div>
        {outpatientQueue.length > 0 ? (
          <div className="space-y-0">
            <div className="grid gap-3 p-4 md:hidden">
              {outpatientQueue.map((patient) => (
                <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{patient.patientName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">{patient.patientId}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                      {patient.priority}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <MobileMeta label="Bed/Slot" value={patient.bed} />
                    <MobileMeta label="Triage" value={patient.diagnosis} />
                    <MobileMeta label="Route" value={describeDoctorRoute(patient)} />
                    <MobileMeta label="Nurse" value={patient.assignedNurse} />
                  </div>
                  {patient.notes ? (
                    <p className="mt-3 line-clamp-2 text-xs text-slate-500">
                      Latest nursing note: {patient.notes.split("\n")[0]}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    {consultingId === patient.id ? (
                      <div className="space-y-2">
                        <select
                          value={consultType}
                          onChange={(event) => setConsultType(event.target.value as ConsultType)}
                          className={`${inputCls} w-full py-2`}
                        >
                          {["General", "Specialist", "Emergency", "Follow-up", "Antenatal", "Paediatric"].map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => void handleStartConsult(patient)}>
                            Start
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => setConsultingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full" onClick={() => setConsultingId(patient.id)}>
                        Start Consult
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Patient", "Patient ID", "Bed/Slot", "Triage", "Route", "Priority", "Assigned Nurse", "Action"].map((heading) => (
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
                  {outpatientQueue.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{patient.patientName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{patient.patientId}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{patient.bed}</td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-slate-500">
                        <p className="truncate">{patient.diagnosis}</p>
                        {patient.notes ? (
                          <p className="mt-1 line-clamp-2 text-[11px] text-amber-700">
                            Latest nursing note: {patient.notes.split("\n")[0]}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{describeDoctorRoute(patient)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                          {patient.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{patient.assignedNurse}</td>
                      <td className="px-4 py-3">
                        {consultingId === patient.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={consultType}
                              onChange={(event) => setConsultType(event.target.value as ConsultType)}
                              className={`${inputCls} w-32 py-1`}
                            >
                              {["General", "Specialist", "Emergency", "Follow-up", "Antenatal", "Paediatric"].map((type) => (
                                <option key={type}>{type}</option>
                              ))}
                            </select>
                            <Button size="sm" onClick={() => void handleStartConsult(patient)}>
                              Start
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConsultingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setConsultingId(patient.id)}>
                            Start Consult
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-400">No outpatient patients routed to you.</p>
            <p className="mt-1 text-xs text-slate-300">Patients appear here only when assigned to your name or specialty.</p>
          </div>
        )}
      </Card>

      {emergencyQueue.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-5 py-4">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <h3 className="font-bold text-red-900">Emergency Queue - {emergencyQueue.length} Patient{emergencyQueue.length > 1 ? "s" : ""}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {emergencyQueue.map((patient) => (
              <div key={patient.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{patient.patientName}</p>
                  <p className="text-xs text-slate-400">{patient.bed} - {patient.diagnosis}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                  {patient.priority}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setConsultType("Emergency");
                    void handleStartConsult(patient);
                  }}
                >
                  Start Emergency Consult
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
