"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  fetchDoctors,
  fetchPatientRegistrations,
  fetchTodayVisits,
  insertVisit,
  type PatientRegistration,
  type VisitRow,
} from "@/lib/supabase/db";
import type { DoctorProfile } from "@/lib/data/doctors-store";
import { addFrontDeskCharge } from "@/lib/data/accounts-store";
import { addWardPatient } from "@/lib/data/nurses-store";
import { useBillingPresets } from "@/lib/hooks/use-billing-presets";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import {
  buildDoctorRoutingChoices,
  resolveDoctorRoute,
} from "@/lib/utils/doctor-routing";

const STATUS_STYLES: Record<string, string> = {
  "Checked In": "bg-sky-50 text-sky-700",
  "In Queue": "bg-amber-50 text-amber-700",
  "With Doctor": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Waiting: "bg-amber-50 text-amber-700",
  Scheduled: "bg-blue-50 text-blue-700",
};

function fmtTime(iso?: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const selCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

export default function FrontdeskVisitsPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("patient") ?? "";
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Front Desk";

  const { allPatients: wardPatients } = useNursesStore();
  const { getByCategory, getAmount } = useBillingPresets();
  const visitPresets = getByCategory("visit");
  const visitTypes =
    visitPresets.length > 0
      ? visitPresets.map((preset) => preset.name)
      : [
          "Outpatient Consultation",
          "Emergency",
          "Follow-up",
          "Routine Check-up",
          "Specialist Referral",
          "Antenatal",
          "Lab/Diagnostics",
        ];

  const [patients, setPatients] = useState<PatientRegistration[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [todayVisits, setTodayVisits] = useState<VisitRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selPatient, setSelPatient] = useState(preselectedId);
  const [visitType, setVisitType] = useState("");
  const [complaint, setComplaint] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  async function loadVisits() {
    const visits = await fetchTodayVisits().catch((err) => {
      console.error("[visits] fetchTodayVisits failed:", err);
      return null;
    });
    if (visits !== null) setTodayVisits(visits);
  }

  useEffect(() => {
    async function loadAll() {
      setLoadingData(true);
      const [patientRows, doctorProfiles] = await Promise.all([
        fetchPatientRegistrations().catch((err) => {
          console.error("[visits] fetchPatientRegistrations:", err);
          return [];
        }),
        fetchDoctors().catch((err) => {
          console.error("[visits] fetchDoctors:", err);
          return [];
        }),
      ]);

      setPatients(patientRows);
      if (preselectedId) {
        const match = patientRows.find((patient) => patient.patientId === preselectedId);
        if (match) setSelPatient(match.id);
      }
      setDoctors(doctorProfiles as DoctorProfile[]);
      await loadVisits();
      setLoadingData(false);
    }

    void loadAll();

    const timer = setInterval(() => {
      void loadVisits();
    }, 30_000);

    return () => clearInterval(timer);
  }, [preselectedId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selPatient || !visitType || !assignedTo) return;

    const patientRecord = patients.find((patient) => patient.id === selPatient);
    if (!patientRecord) return;

    setSubmitting(true);

    const route = resolveDoctorRoute(assignedTo, doctors);
    if (!route.routeLabel) {
      setToast({ message: "Choose a valid specialty, doctor, or queue.", type: "error" });
      setSubmitting(false);
      return;
    }

    const isEmergency = visitType === "Emergency";
    const unit = isEmergency ? "Emergency" : "Outpatient";
    const dept = isEmergency ? "Emergency" : "Doctors";

    const prefix = isEmergency ? "ER" : "OPD";
    const usedBeds = wardPatients
      .filter((patient) => patient.unit === unit && patient.status === "Active")
      .map((patient) => patient.bed);

    let bedNum = 1;
    while (usedBeds.includes(`${prefix}-${bedNum}`)) bedNum += 1;
    const bed = `${prefix}-${bedNum}`;

    let visitId: string | null = null;
    try {
      visitId = await insertVisit({
        patientId: patientRecord.patientId,
        patientName: patientRecord.patientName,
        visitType,
        department: dept,
        assignedTo: route.routeLabel,
        doctorSpecialty: route.doctorSpecialty,
      });
    } catch (err) {
      console.error("[visits] insertVisit threw:", err);
    }

    if (!visitId) {
      setToast({ message: "Database error: visit was not saved. Check console and try again.", type: "error" });
      setSubmitting(false);
      return;
    }

    await loadVisits();

    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const todayStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const chargeType = isEmergency
      ? "Emergency"
      : visitType === "Follow-up"
        ? "Follow-up"
        : visitType === "Antenatal"
          ? "Antenatal"
          : visitType === "Lab/Diagnostics"
            ? "Lab"
            : "Consultation";

    addFrontDeskCharge({
      id: `FDC-${Date.now()}`,
      patientName: patientRecord.patientName,
      patientId: patientRecord.patientId,
      chargeType: chargeType as import("@/lib/data/accounts-store").FrontDeskCharge["chargeType"],
      amount: getAmount("visit", visitType, 80),
      description: `${visitType}${complaint ? ` - ${complaint}` : ""}`,
      createdAt: `${now} - ${todayStr}`,
      createdBy: staffName,
      visitId,
      status: "Pending",
    });

    addWardPatient({
      id: `WP-FD-${Date.now()}`,
      patientName: patientRecord.patientName,
      patientId: patientRecord.patientId,
      unit,
      bed,
      diagnosis: `${visitType}${complaint ? ` - ${complaint}` : ""}`,
      admittedAt: new Date().toISOString(),
      assignedNurse: "Triage",
      priority: isEmergency ? "High" : "Stable",
      status: "Active",
      doctorInCharge: route.doctorName,
      doctorSpecialty: route.doctorSpecialty,
    });

    setToast({
      message: `Visit created for ${patientRecord.patientName} (Bed ${bed}) and sent to the ${unit} queue.`,
      type: "success",
    });

    setSelPatient("");
    setVisitType("");
    setComplaint("");
    setAssignedTo("");
    setSubmitting(false);
  }

  const { activeDoctors, specialties } = buildDoctorRoutingChoices(doctors);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visits / Check-in"
        description="Create a visit record, capture the complaint, and route the patient to the correct doctor lane."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-5 font-bold text-slate-900">New Visit</h3>

          {loadingData ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select value={selPatient} onChange={(event) => setSelPatient(event.target.value)} required className={selCls}>
                  <option value="">- Select patient -</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.patientName} ({patient.patientId || "No ID"})
                    </option>
                  ))}
                </select>
                {patients.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">No patients registered yet.</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Visit Type <span className="text-red-500">*</span>
                </label>
                <select value={visitType} onChange={(event) => setVisitType(event.target.value)} required className={selCls}>
                  <option value="">- Select type -</option>
                  {visitTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Complaint Summary</label>
                <textarea
                  rows={3}
                  value={complaint}
                  onChange={(event) => setComplaint(event.target.value)}
                  placeholder="Briefly describe the patient's presenting complaint..."
                  className={`${selCls} resize-none`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Route To <span className="text-red-500">*</span>
                </label>
                <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} required className={selCls}>
                  <option value="">- Select specialty, doctor, or queue -</option>
                  <optgroup label="Doctor Specialties">
                    {specialties.length > 0 ? (
                      specialties.map((specialty) => (
                        <option key={specialty} value={`specialty:${specialty}`}>
                          {specialty} Queue
                        </option>
                      ))
                    ) : (
                      <option disabled>No specialty routes available</option>
                    )}
                  </optgroup>
                  <optgroup label="On-Duty Doctors">
                    {activeDoctors.length > 0 ? (
                      activeDoctors.map((doctor) => (
                        <option key={doctor.id} value={`doctor:${doctor.id}`}>
                          {doctor.name} ({doctor.specialty})
                        </option>
                      ))
                    ) : (
                      <option disabled>No on-duty doctors on file</option>
                    )}
                  </optgroup>
                  <optgroup label="Queues">
                    <option value="queue:triage">Triage Queue (Nurses)</option>
                    <option value="queue:emergency">Emergency Team</option>
                  </optgroup>
                </select>
              </div>

              {visitType && (
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
                  Visit fee: <strong>N{getAmount("visit", visitType, 80)}</strong> - this will be sent to Accounts automatically.
                </div>
              )}

              <Button type="submit" size="md" className="w-full" disabled={submitting}>
                {submitting ? "Creating visit..." : "Create Visit Record"}
              </Button>
            </form>
          )}
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Today&apos;s Visits{" "}
              <span className="ml-1 text-sm font-normal text-slate-400">
                ({loadingData ? "..." : todayVisits.length})
              </span>
            </h3>
          </div>
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {["Patient", "Type", "Assigned To", "Check-in", "Status"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{visit.patientName}</td>
                      <td className="px-5 py-3 text-slate-600">{visit.visitType || "-"}</td>
                      <td className="px-5 py-3 text-slate-600">{visit.assignedTo || visit.doctorSpecialty || "-"}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-400">{fmtTime(visit.checkedInAt)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[visit.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {visit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {todayVisits.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                        No visits today yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
