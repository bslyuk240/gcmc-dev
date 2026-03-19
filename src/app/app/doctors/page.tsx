"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  canDoctorAccessConsultation,
  canDoctorAccessPatient,
  getCurrentDoctorSpecialty,
} from "@/lib/utils/doctor-routing";

const CONSULT_STATUS_STYLES: Record<string, string> = {
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  "Awaiting Results": "bg-amber-50 text-amber-700",
  Admitted: "bg-red-50 text-red-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-50 text-emerald-700",
};

function matchesDoctorName(left?: string, right?: string) {
  return (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

function isSameCalendarDay(value: string | undefined, today: Date) {
  if (!value) return false;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return (
      parsed.getFullYear() === today.getFullYear() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getDate() === today.getDate()
    );
  }

  const normalized = value.trim().toLowerCase();
  const accepted = [
    today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase(),
    today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase(),
  ];
  return accepted.includes(normalized);
}

function fmtDateTime(value?: string) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sumConsultationFees(statuses: string[], fees: Array<{ fee: number; status: string }>) {
  return fees.filter((entry) => statuses.includes(entry.status)).reduce((sum, entry) => sum + entry.fee, 0);
}

export default function DoctorsDashboardPage() {
  const { consultations, doctors, admissionOrders } = useDoctorsStore();
  const { prescriptions } = usePharmacyStore();
  const { tests } = useLabStore();
  const { consultationFees } = useAccountsStore();
  const { allPatients } = useNursesStore();
  const session = useHMSSession();

  const doctorName = session?.full_name ?? "";
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const doctorProfile = doctors.find((entry) => matchesDoctorName(entry.name, doctorName));
  const doctorSpecialty = getCurrentDoctorSpecialty(doctors, doctorName);

  const myConsultations = consultations.filter((entry) => canDoctorAccessConsultation(entry, doctorName));
  const todayConsults = myConsultations.filter((entry) => isSameCalendarDay(entry.date, today));
  const activeConsults = myConsultations.filter((entry) => entry.status === "In Progress" || entry.status === "Awaiting Results");
  const awaitingResults = myConsultations.filter((entry) => entry.status === "Awaiting Results");

  const myPrescriptions = prescriptions.filter((entry) => matchesDoctorName(entry.doctorName, doctorName));
  const myPendingLabOrders = tests.filter(
    (entry) =>
      entry.status !== "Completed" &&
      entry.status !== "Cancelled" &&
      matchesDoctorName(entry.orderedBy, doctorName),
  );

  const myAdmittedPatients = allPatients.filter(
    (entry) =>
      entry.status === "Active" &&
      (entry.unit === "Ward" || entry.unit === "ICU") &&
      canDoctorAccessPatient(entry, doctorName, doctorSpecialty),
  );

  const todayFees = consultationFees.filter(
    (entry) => matchesDoctorName(entry.doctorName, doctorName) && isSameCalendarDay(entry.consultedAt, today),
  );

  const feesCollected = sumConsultationFees(["Paid"], todayFees);
  const feesPending = sumConsultationFees(["Pending", "Billed", "Partial"], todayFees);
  const rxWrittenToday = myPrescriptions.filter((entry) => isSameCalendarDay(entry.createdAt, today)).length;
  const admissionsToday = admissionOrders.filter(
    (entry) => matchesDoctorName(entry.orderedBy, doctorName) && isSameCalendarDay(entry.orderedAt, today),
  ).length;

  const onDutyDoctors = [...doctors]
    .filter((entry) => entry.status === "On Duty")
    .sort((left, right) => {
      if (matchesDoctorName(left.name, doctorName)) return -1;
      if (matchesDoctorName(right.name, doctorName)) return 1;
      if (doctorSpecialty && left.specialty === doctorSpecialty && right.specialty !== doctorSpecialty) return -1;
      if (doctorSpecialty && right.specialty === doctorSpecialty && left.specialty !== doctorSpecialty) return 1;
      return left.name.localeCompare(right.name);
    });

  const dashboardAlerts = [
    !doctorName
      ? {
          type: "error" as const,
          message: "Doctor session is missing a display name. Dashboard data may not route correctly until the session is fixed.",
        }
      : null,
    doctorName && !doctorProfile
      ? {
          type: "error" as const,
          message: `Doctor profile for ${doctorName} was not found in the active staff list. Direct/specialty routing may be incomplete.`,
        }
      : null,
    doctorProfile && !doctorSpecialty
      ? {
          type: "info" as const,
          message: `${doctorName} has no normalized specialty set yet. Only directly assigned patients are guaranteed to appear.`,
        }
      : null,
    awaitingResults.length > 0
      ? {
          type: "warn" as const,
          message: `${awaitingResults.length} consultation${awaitingResults.length > 1 ? "s are" : " is"} awaiting lab results for your review.`,
        }
      : null,
  ].filter(Boolean) as Array<{ type: "error" | "warn" | "info"; message: string }>;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Doctors Dashboard"
        description={
          doctorName
            ? `${doctorName}${doctorSpecialty ? ` - ${doctorSpecialty}` : ""}. Clinical overview for your consultations, lab orders, prescriptions, and admitted patients as of ${todayLabel}.`
            : "Clinical overview for consultations, lab orders, prescriptions, and admitted patients."
        }
      />

      {dashboardAlerts.map((alert, index) => (
        <div
          key={`${alert.type}-${index}`}
          className={`rounded-xl border px-4 py-3 text-sm ${
            alert.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : alert.type === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
          }`}
        >
          {alert.message}
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
        {[
          { label: "Consultations Today", value: todayConsults.length, color: "text-slate-900", href: `${INTERNAL_PREFIX}/doctors/consultations`, sub: "Open consult list" },
          { label: "Active Now", value: activeConsults.length, color: "text-violet-700", href: `${INTERNAL_PREFIX}/doctors/queue`, sub: "Visible queue work" },
          { label: "Awaiting Results", value: awaitingResults.length, color: awaitingResults.length > 0 ? "text-amber-600" : "text-slate-400", href: `${INTERNAL_PREFIX}/doctors/lab-results`, sub: "Review returned labs" },
          { label: "Rx Written Today", value: rxWrittenToday, color: "text-emerald-700", href: `${INTERNAL_PREFIX}/doctors/prescriptions`, sub: "Open prescriptions" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="block flex-1">
            <Card className="flex h-full items-center gap-2.5 px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50 sm:px-4">
              <p className={`shrink-0 text-xl font-bold sm:text-2xl ${item.color}`}>{item.value}</p>
              <div>
                <p className="text-[10px] font-semibold leading-tight text-slate-500 sm:text-xs">{item.label}</p>
                <p className="text-[10px] text-slate-400 sm:text-xs">{item.sub}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Today&apos;s Consultations</h3>
                <p className="mt-1 text-xs text-slate-400">Only consultations assigned to you are shown here.</p>
              </div>
              <Link href={`${INTERNAL_PREFIX}/doctors/consultations`} className="text-sm font-semibold text-blue-600 hover:underline">
                Open all -&gt;
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {todayConsults.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {entry.patientName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{entry.patientName}</p>
                      <span className="text-xs text-slate-400">{entry.patientId}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{entry.consultType}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {entry.time} • {entry.doctorName}
                    </p>
                    {entry.chiefComplaint ? (
                      <p className="max-w-xl truncate text-xs text-slate-400">{entry.chiefComplaint}</p>
                    ) : null}
                    <div className="mt-0.5 flex gap-2">
                      {entry.rxWritten ? <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">Rx</span> : null}
                      {entry.labOrdered ? <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">Lab</span> : null}
                      {entry.admissionOrdered ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">Admitted</span> : null}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONSULT_STATUS_STYLES[entry.status]}`}>{entry.status}</span>
                </div>
              ))}
              {todayConsults.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-slate-400">
                  No consultations for you today yet. Patients routed to you will appear in the waiting queue.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Pending Lab Orders</h3>
                <p className="mt-1 text-xs text-slate-400">Doctor-scoped lab orders you created that are still in flight.</p>
              </div>
              <Link href={`${INTERNAL_PREFIX}/doctors/lab-orders`} className="text-sm font-semibold text-blue-600 hover:underline">
                View all -&gt;
              </Link>
            </div>
            {myPendingLabOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Patient", "Test", "Priority", "Status"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myPendingLabOrders.slice(0, 5).map((entry) => (
                      <tr key={entry.id} className={`hover:bg-slate-50 ${entry.priority === "STAT" ? "bg-red-50/20" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{entry.patientName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{entry.testName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              entry.priority === "STAT"
                                ? "bg-red-100 text-red-700"
                                : entry.priority === "Urgent"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {entry.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              entry.status === "In Progress"
                                ? "bg-violet-50 text-violet-700"
                                : entry.status === "Sample Collected"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-400">
                No pending lab orders are assigned to you right now.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 font-bold text-slate-900">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Start Consult", href: `${INTERNAL_PREFIX}/doctors/consultations` },
                { label: "Queue", href: `${INTERNAL_PREFIX}/doctors/queue` },
                { label: "Lab Orders", href: `${INTERNAL_PREFIX}/doctors/lab-orders` },
                { label: "Lab Results", href: `${INTERNAL_PREFIX}/doctors/lab-results` },
                { label: "Prescriptions", href: `${INTERNAL_PREFIX}/doctors/prescriptions` },
                { label: "Admitted", href: `${INTERNAL_PREFIX}/doctors/admitted-patients` },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Doctors On Duty</h3>
              <span className="text-xs text-slate-400">{onDutyDoctors.length} active</span>
            </div>
            <div className="space-y-2.5">
              {onDutyDoctors.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {entry.name.split(" ").slice(-1)[0].charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {entry.name}
                      {matchesDoctorName(entry.name, doctorName) ? " (You)" : ""}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">{entry.specialty || "Direct Assignment Only"}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-indigo-700">{entry.consultationsToday}</span>
                </div>
              ))}
              {onDutyDoctors.length === 0 ? (
                <p className="text-xs text-slate-400">No on-duty doctors are available in the current roster.</p>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Admitted Patients</h3>
              <Link href={`${INTERNAL_PREFIX}/doctors/admitted-patients`} className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {myAdmittedPatients.length > 0 ? (
              <div className="space-y-2">
                {myAdmittedPatients.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.patientName}</p>
                      <p className="text-slate-400">
                        {entry.unit} • {entry.bed}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[entry.priority]}`}>{entry.priority}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No admitted patients are currently routed to you or your specialty.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-bold text-slate-900">Billing Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Fees collected</span>
                <span className="font-bold text-emerald-700">NGN {feesCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fees pending</span>
                <span className={`font-bold ${feesPending > 0 ? "text-amber-600" : "text-slate-400"}`}>NGN {feesPending.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admissions today</span>
                <span className="font-bold text-slate-800">{admissionsToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lab tests ordered</span>
                <span className="font-bold text-violet-700">{myPendingLabOrders.length}</span>
              </div>
            </div>
          </Card>

          {myPrescriptions.length > 0 ? (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Recent Prescriptions</h3>
                <Link href={`${INTERNAL_PREFIX}/doctors/prescriptions`} className="text-xs text-blue-600 hover:underline">
                  Open all
                </Link>
              </div>
              <div className="space-y-2">
                {myPrescriptions.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{entry.patientName}</p>
                        <p className="truncate text-slate-400">{fmtDateTime(entry.createdAt)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
