"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  fetchPatientRegistrations,
  fetchStaffMembers,
  fetchTodayVisits,
  insertVisit,
  type PatientRegistration,
  type VisitRow,
} from "@/lib/supabase/db";
import type { StaffMember } from "@/lib/data/hr-store";
import { addFrontDeskCharge } from "@/lib/data/accounts-store";
import { addWardPatient } from "@/lib/data/nurses-store";
import { useBillingPresets } from "@/lib/hooks/use-billing-presets";

const STATUS_STYLES: Record<string, string> = {
  "Checked In": "bg-sky-50 text-sky-700",
  "In Queue":   "bg-amber-50 text-amber-700",
  "With Doctor": "bg-violet-50 text-violet-700",
  Completed:    "bg-emerald-50 text-emerald-700",
  Waiting:      "bg-amber-50 text-amber-700",
  Scheduled:    "bg-blue-50 text-blue-700",
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const selCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

export default function FrontdeskVisitsPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("patient") ?? "";  // P-XXXXX from patient detail

  const { getByCategory, getAmount } = useBillingPresets();
  const visitPresets = getByCategory("visit");
  const visitTypes   = visitPresets.length > 0
    ? visitPresets.map((p) => p.name)
    : ["Outpatient Consultation", "Emergency", "Follow-up", "Routine Check-up", "Specialist Referral", "Antenatal", "Lab/Diagnostics"];

  // Real data
  const [patients,   setPatients]   = useState<PatientRegistration[]>([]);
  const [doctors,    setDoctors]    = useState<StaffMember[]>([]);
  const [todayVisits, setTodayVisits] = useState<VisitRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selPatient,  setSelPatient]  = useState(preselectedId);
  const [visitType,   setVisitType]   = useState("");
  const [complaint,   setComplaint]   = useState("");
  const [assignedTo,  setAssignedTo]  = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState<ToastData | null>(null);

  useEffect(() => {
    Promise.all([
      fetchPatientRegistrations(),
      fetchStaffMembers(),
      fetchTodayVisits(),
    ]).then(([pats, staff, visits]) => {
      setPatients(pats);
      setDoctors(staff.filter((s) => s.department === "Doctors" && s.status === "Active"));
      setTodayVisits(visits);
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
  }, []);

  // Pre-select patient if coming from patient detail page
  useEffect(() => {
    if (preselectedId && patients.length > 0) {
      const match = patients.find((p) => p.patientId === preselectedId);
      if (match) setSelPatient(match.id); // use UUID as select value
    }
  }, [preselectedId, patients]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selPatient || !visitType || !assignedTo) return;

    const patientRecord = patients.find((p) => p.id === selPatient);
    if (!patientRecord) return;

    setSubmitting(true);

    const assigneeLabel = assignedTo.startsWith("__")
      ? assignedTo.replace("__", "")
      : (doctors.find((d) => d.id === assignedTo)?.name ?? assignedTo);

    const isEmergency = visitType === "Emergency";
    const dept = isEmergency ? "Emergency" : "Doctors";

    // Save to Supabase visits table
    await insertVisit({
      patientId:   patientRecord.patientId,
      patientName: patientRecord.patientName,
      visitType,
      department:  dept,
      assignedTo:  assigneeLabel,
    });

    // Reload today's visits to show the new entry
    const updated = await fetchTodayVisits();
    setTodayVisits(updated);

    // Push charge to Accounts (localStorage store)
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const todayStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const chargeType = isEmergency ? "Emergency"
      : visitType === "Follow-up" ? "Follow-up"
      : visitType === "Antenatal" ? "Antenatal"
      : visitType === "Lab/Diagnostics" ? "Lab"
      : "Consultation";
    addFrontDeskCharge({
      id: `FDC-${Date.now()}`,
      patientName: patientRecord.patientName,
      patientId:   patientRecord.patientId,
      chargeType:  chargeType as import("@/lib/data/accounts-store").FrontDeskCharge["chargeType"],
      amount: getAmount("visit", visitType, 80),
      description: `${visitType}${complaint ? ` — ${complaint}` : ""}`,
      createdAt: `${now} · ${todayStr}`,
      createdBy: "Front Desk (Auto)",
      visitId: `V-${Date.now()}`,
      status: "Pending",
    });

    // Send patient to Nurses queue (localStorage store)
    addWardPatient({
      id: `WP-FD-${Date.now()}`,
      patientName: patientRecord.patientName,
      patientId:   patientRecord.patientId,
      unit:        isEmergency ? "Emergency" : "Outpatient",
      bed:         isEmergency ? `ER-${Date.now() % 10}` : `OPD-${Date.now() % 100}`,
      diagnosis:   `${visitType}${complaint ? ` — ${complaint}` : ""}`,
      admittedAt:  new Date().toISOString(),
      assignedNurse: "Triage Nurse",
      priority:    isEmergency ? "High" : "Stable",
      status:      "Active",
      doctorInCharge: assigneeLabel,
    });

    setToast({
      message: `Visit created for ${patientRecord.patientName} → sent to Nurses ${isEmergency ? "Emergency" : "Outpatient"} queue.`,
      type: "success",
    });

    setSelPatient(""); setVisitType(""); setComplaint(""); setAssignedTo("");
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visits / Check-in"
        description="Create a visit record, capture the complaint, and route to the doctor's queue."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Visit form ── */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="mb-5 font-bold text-slate-900">New Visit</h3>

          {loadingData ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Patient */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select value={selPatient} onChange={(e) => setSelPatient(e.target.value)} required className={selCls}>
                  <option value="">— Select patient —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.patientName} ({p.patientId || "No ID"})
                    </option>
                  ))}
                </select>
                {patients.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">No patients registered yet.</p>
                )}
              </div>

              {/* Visit type */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Visit Type <span className="text-red-500">*</span>
                </label>
                <select value={visitType} onChange={(e) => setVisitType(e.target.value)} required className={selCls}>
                  <option value="">— Select type —</option>
                  {visitTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Complaint */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Complaint Summary</label>
                <textarea
                  rows={3}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Briefly describe the patient's presenting complaint…"
                  className={`${selCls} resize-none`}
                />
              </div>

              {/* Assign doctor */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required className={selCls}>
                  <option value="">— Select doctor or queue —</option>
                  <optgroup label="Doctors">
                    {doctors.length > 0
                      ? doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                      : <option disabled>No active doctors on file</option>}
                  </optgroup>
                  <optgroup label="Queues">
                    <option value="__Triage Queue">→ Triage Queue (Nurses)</option>
                    <option value="__Emergency Team">→ Emergency Team</option>
                  </optgroup>
                </select>
              </div>

              {/* Fee preview */}
              {visitType && (
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
                  Visit fee: <strong>₦{getAmount("visit", visitType, 80)}</strong> — will be sent to Accounts automatically.
                </div>
              )}

              <Button type="submit" size="md" className="w-full" disabled={submitting}>
                {submitting ? "Creating visit…" : "Create Visit Record"}
              </Button>
            </form>
          )}
        </Card>

        {/* ── Today's visits ── */}
        <Card className="lg:col-span-3 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Today&apos;s Visits{" "}
              <span className="ml-1 text-sm font-normal text-slate-400">
                ({loadingData ? "…" : todayVisits.length})
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
                    {["Patient", "Type", "Assigned To", "Check-in", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{v.patientName}</td>
                      <td className="px-5 py-3 text-slate-600">{v.visitType || "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{v.assignedTo || "—"}</td>
                      <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{fmtTime(v.checkedInAt)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {v.status}
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
