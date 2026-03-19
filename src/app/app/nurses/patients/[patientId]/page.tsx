"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import {
  fetchMAREntries,
  fetchPatientByDisplayId,
  fetchPatientObservations,
  fetchVisitsByPatientId,
  type MAREntry,
  type PatientObservation,
  type PatientRegistration,
  type VisitRow,
} from "@/lib/supabase/db";

const STATUS_STYLES: Record<string, string> = {
  Waiting: "bg-amber-50 text-amber-700",
  "In Consultation": "bg-sky-50 text-sky-700",
  Discharged: "bg-emerald-50 text-emerald-700",
  Referred: "bg-violet-50 text-violet-700",
  Billing: "bg-orange-50 text-orange-700",
  Active: "bg-emerald-50 text-emerald-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-yellow-50 text-yellow-700",
  Stable: "bg-emerald-50 text-emerald-700",
};

function calcAge(dob?: string): string {
  if (!dob) return "--";
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "--";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age--;
  return `${age} yrs`;
}

function fmtDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

function money(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

export default function NursesPatientRecordPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = decodeURIComponent(params?.patientId ?? "");

  const { allPatients, procedures, sampleRequests, icuVitals } = useNursesStore();
  const { nursingCharges } = useAccountsStore();
  const { prescriptions, nurseRequests } = usePharmacyStore();
  const { tests } = useLabStore();

  const [patient, setPatient] = useState<PatientRegistration | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [observations, setObservations] = useState<PatientObservation[]>([]);
  const [marEntries, setMarEntries] = useState<MAREntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRecord() {
      setLoading(true);
      try {
        const [frontDeskPatient, visitRows, observationRows, marRows] = await Promise.all([
          fetchPatientByDisplayId(patientId),
          fetchVisitsByPatientId(patientId),
          fetchPatientObservations(patientId),
          fetchMAREntries(patientId),
        ]);

        if (cancelled) return;
        setPatient(frontDeskPatient);
        setVisits(visitRows);
        setObservations(observationRows);
        setMarEntries(marRows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (patientId) void loadRecord();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const nursingPatient = useMemo(
    () => allPatients.find((entry) => entry.patientId === patientId) ?? null,
    [allPatients, patientId],
  );

  const patientName = patient?.patientName ?? nursingPatient?.patientName ?? "Unknown Patient";
  const patientStatus = patient?.status ?? nursingPatient?.status ?? "Active";
  const latestVisit = visits[0] ?? null;
  const patientProcedures = procedures.filter((entry) => entry.patientId === patientId);
  const patientNursingCharges = nursingCharges.filter((entry) => entry.patientId === patientId);
  const patientSampleRequests = sampleRequests.filter((entry) => entry.patientId === patientId);
  const patientLabTests = tests.filter((entry) => entry.patientId === patientId);
  const patientPrescriptions = prescriptions.filter((entry) => entry.patientId === patientId);
  const patientMedRequests = nurseRequests.filter((entry) => entry.patientId === patientId);
  const patientIcuVitals = icuVitals.filter((entry) => entry.patientId === patientId);
  const latestIcuVitals = patientIcuVitals[0] ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!patientId || (!patient && !nursingPatient)) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-lg font-bold text-slate-800">Patient record not found</p>
        <p className="text-sm text-slate-500">No nursing or Front Desk data was found for this patient reference.</p>
        <Link href={`${INTERNAL_PREFIX}/nurses`} className="text-sm font-semibold text-accent hover:underline">
          Back to Nurses Bay
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`${INTERNAL_PREFIX}/nurses`} className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
            Back to Nurses Bay
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Patient Care Record</h1>
          <p className="mt-1 text-sm text-slate-500">
            Front Desk registration data with nursing context for {patientName}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {nursingPatient?.unit ? (
            <Link
              href={`${INTERNAL_PREFIX}/nurses/${nursingPatient.unit === "Outpatient" ? "triage" : nursingPatient.unit.toLowerCase()}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open {nursingPatient.unit} unit
            </Link>
          ) : null}
          <Link
            href={`${INTERNAL_PREFIX}/nurses/medication-administration`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Medication
          </Link>
          <Link
            href={`${INTERNAL_PREFIX}/nurses/sample-collection`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Sample Collection
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent-foreground">
            {(patientName.slice(0, 2) || "PT").toUpperCase()}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{patientName}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[patientStatus] ?? "bg-slate-100 text-slate-600"}`}>
                {patientStatus}
              </span>
              {nursingPatient?.priority ? (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[nursingPatient.priority] ?? "bg-slate-100 text-slate-600"}`}>
                  {nursingPatient.priority}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient ID</p>
                <p className="mt-1 font-semibold text-slate-900">{patientId}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Age / Sex</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {calcAge(patient?.dateOfBirth)}
                  {patient?.gender ? ` / ${patient.gender}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Unit</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {nursingPatient ? `${nursingPatient.unit} / ${nursingPatient.bed}` : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last Visit</p>
                <p className="mt-1 font-semibold text-slate-900">{fmtDate(latestVisit?.visitDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Visit History",
            value: visits.length,
            sub: latestVisit ? latestVisit.visitType : "No visits yet",
            color: "text-slate-900",
          },
          {
            label: "Nursing Procedures",
            value: patientProcedures.length,
            sub: `${patientNursingCharges.filter((entry) => entry.status === "Pending" || entry.status === "Billed").length} with Accounts`,
            color: patientProcedures.length > 0 ? "text-amber-600" : "text-slate-900",
          },
          {
            label: "Lab Requests",
            value: patientLabTests.length,
            sub: `${patientSampleRequests.length} sample request(s)`,
            color: patientLabTests.length > 0 ? "text-sky-700" : "text-slate-900",
          },
          {
            label: "Medication Items",
            value: patientPrescriptions.length + patientMedRequests.length + marEntries.length,
            sub: `${marEntries.filter((entry) => entry.status === "Scheduled").length} scheduled in MAR`,
            color: "text-violet-700",
          },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Front Desk Registration</h3>
            {patient ? (
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="mt-1 text-slate-900">{patient.contact || "--"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 text-slate-900">{patient.email || "--"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</p>
                  <p className="mt-1 text-slate-900">{patient.address || "--"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next of Kin</p>
                  <p className="mt-1 text-slate-900">
                    {patient.nextOfKinName || "--"}
                    {patient.nextOfKinPhone ? ` / ${patient.nextOfKinPhone}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Blood Group</p>
                  <p className="mt-1 text-slate-900">{patient.bloodGroup || "--"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registered</p>
                  <p className="mt-1 text-slate-900">{fmtDateTime(patient.registeredAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Front Desk registration details are not available for this patient yet.</p>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Doctor Context</h3>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Doctor In Charge</p>
                  <p className="mt-2 font-semibold text-slate-900">{nursingPatient?.doctorInCharge || latestVisit?.assignedTo || "--"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest Visit Type</p>
                  <p className="mt-2 font-semibold text-slate-900">{latestVisit?.visitType || "--"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Visit Count</p>
                  <p className="mt-2 font-semibold text-slate-900">{visits.length}</p>
                </div>
              </div>

              {visits.length === 0 ? (
                <p className="text-sm text-slate-400">No visit history found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Date", "Visit Type", "Assigned To", "Status"].map((heading) => (
                          <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visits.map((visit) => (
                        <tr key={visit.id}>
                          <td className="px-4 py-3 text-slate-700">{fmtDateTime(visit.visitDate)}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{visit.visitType || "--"}</td>
                          <td className="px-4 py-3 text-slate-600">{visit.assignedTo || "--"}</td>
                          <td className="px-4 py-3 text-slate-600">{visit.status || "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Nursing Activity</h3>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Procedures</p>
                {patientProcedures.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No nursing procedures recorded.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {patientProcedures.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{entry.procedureType}</p>
                            <p className="text-xs text-slate-500">{entry.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{money(entry.amount)}</p>
                            <p className="text-xs text-slate-400">{fmtDateTime(entry.performedAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Observations</p>
                {observations.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No saved patient observations found.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {observations.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-sm text-slate-900">{entry.observation}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.recordedBy} / {fmtDateTime(entry.recordedAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Current Nursing Status</h3>
            {nursingPatient ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Unit</span>
                  <span className="font-semibold text-slate-900">{nursingPatient.unit}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Bed</span>
                  <span className="font-semibold text-slate-900">{nursingPatient.bed}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Assigned Nurse</span>
                  <span className="font-semibold text-slate-900">{nursingPatient.assignedNurse || "--"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Doctor in Charge</span>
                  <span className="font-semibold text-slate-900">{nursingPatient.doctorInCharge || "--"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Last Vitals</span>
                  <span className="font-semibold text-slate-900">{fmtDateTime(nursingPatient.lastVitalsAt)}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnosis / Notes</p>
                  <p className="mt-2 text-sm text-slate-700">{nursingPatient.diagnosis || nursingPatient.notes || "--"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active nursing admission record is currently attached to this patient.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">ICU Monitoring</h3>
            {patientIcuVitals.length === 0 ? (
              <p className="text-sm text-slate-500">No ICU-specific monitoring entries have been recorded for this patient.</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["BP", latestIcuVitals?.bp || "--"],
                    ["Pulse", latestIcuVitals?.pulse ? `${latestIcuVitals.pulse} bpm` : "--"],
                    ["Temp", latestIcuVitals?.temp && latestIcuVitals.temp !== "-" ? `${latestIcuVitals.temp} C` : "--"],
                    ["SpO2", latestIcuVitals?.spo2 || "--"],
                    ["GCS", latestIcuVitals?.gcs || "--"],
                    ["Urine", latestIcuVitals?.urine || "--"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-2 font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest ICU Entry</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {latestIcuVitals?.recordedBy || "--"} / {fmtDateTime(latestIcuVitals?.recordedAt)}
                  </p>
                  {latestIcuVitals?.rrRate ? (
                    <p className="mt-1 text-xs text-slate-500">Respiratory Rate: {latestIcuVitals.rrRate}</p>
                  ) : null}
                  {latestIcuVitals?.notes ? (
                    <p className="mt-2 text-xs text-slate-500">{latestIcuVitals.notes}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent ICU History</p>
                  <div className="mt-2 space-y-2">
                    {patientIcuVitals.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            BP {entry.bp} / Pulse {entry.pulse} / SpO2 {entry.spo2}
                          </p>
                          <span className="text-xs text-slate-500">{fmtDateTime(entry.recordedAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.recordedBy}
                          {entry.gcs ? ` / GCS ${entry.gcs}` : ""}
                          {entry.urine ? ` / Urine ${entry.urine}` : ""}
                          {entry.rrRate ? ` / RR ${entry.rrRate}` : ""}
                        </p>
                        {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Pharmacy Context</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prescriptions</p>
                {patientPrescriptions.length === 0 ? (
                  <p className="mt-1 text-slate-700">No prescription records.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {patientPrescriptions.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-900">{entry.doctorName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.drugs.map((drug) => drug.name).join(", ") || "No drugs listed"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{entry.status} / {fmtDateTime(entry.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pharmacy Requests</p>
                {patientMedRequests.length === 0 ? (
                  <p className="mt-1 text-slate-700">No nurse medication requests.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {patientMedRequests.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-900">{entry.drug}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.status} / {entry.urgency}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">MAR Entries</p>
                {marEntries.length === 0 ? (
                  <p className="mt-1 text-slate-700">No medication administration records.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {marEntries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.drug} / {entry.dose}
                          </p>
                          <span className="text-xs text-slate-500">{entry.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.route} / Scheduled {fmtDateTime(entry.scheduledAt || entry.createdAt)}
                        </p>
                        {entry.givenAt ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Given {fmtDateTime(entry.givenAt)}
                            {entry.givenBy ? ` / ${entry.givenBy}` : ""}
                          </p>
                        ) : null}
                        {entry.notes ? <p className="mt-1 text-xs text-slate-500">{entry.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Lab Context</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lab Requests</p>
                {patientLabTests.length === 0 ? (
                  <p className="mt-1 text-slate-700">No lab tests linked to this patient.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {patientLabTests.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-900">{entry.testName}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.status} / {entry.priority}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sample Workflow</p>
                {patientSampleRequests.length === 0 ? (
                  <p className="mt-1 text-slate-700">No sample collection requests.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {patientSampleRequests.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-900">{entry.testName}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.status} / {entry.priority}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Accounts Context</h3>
            {patientNursingCharges.length === 0 ? (
              <p className="text-sm text-slate-500">No nursing charges linked to this patient.</p>
            ) : (
              <div className="space-y-3">
                {patientNursingCharges.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.procedureType}</p>
                      <p className="text-xs text-slate-500">{entry.status}</p>
                    </div>
                    <span className="font-bold text-slate-900">{money(entry.amount)}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  Only the patient-specific billing snapshot is shown here. No Accounts dashboard routing is exposed from Nurses.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
