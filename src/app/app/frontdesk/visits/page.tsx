"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { addFrontDeskCharge } from "@/lib/data/accounts-store";
import { addWardPatient } from "@/lib/data/nurses-store";

const PATIENTS = ["Kwame Asante (P-10491)", "Ama Owusu (P-10382)", "Kofi Mensah (P-10271)", "Efua Boateng (P-10155)", "Yaw Darko (P-10133)"];
const DOCTORS = ["Dr. Amaka Osei", "Dr. Kwame Mensah", "Dr. Chen", "Dr. Robert Smith", "Dr. Emily White"];
const VISIT_TYPES = ["Outpatient Consultation", "Emergency", "Follow-up", "Routine Check-up", "Specialist Referral", "Antenatal", "Lab/Diagnostics"];

type Visit = {
  id: string;
  patient: string;
  type: string;
  complaint: string;
  assignedTo: string;
  time: string;
  status: "Checked In" | "In Queue" | "With Doctor" | "Completed";
};

export default function FrontdeskVisitsPage() {
  const [patient, setPatient] = useState("");
  const [visitType, setVisitType] = useState("");
  const [complaint, setComplaint] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [visits, setVisits] = useState<Visit[]>([
    { id: "V-5825", patient: "Abena Kyei (P-10122)", type: "Antenatal", complaint: "Routine antenatal visit, week 28", assignedTo: "Dr. Amaka Osei", time: "10:20", status: "With Doctor" },
    { id: "V-5824", patient: "Yaw Darko (P-10133)", type: "Emergency", complaint: "High fever and difficulty breathing", assignedTo: "Dr. Kwame Mensah", time: "10:05", status: "With Doctor" },
    { id: "V-5823", patient: "Efua Boateng (P-10155)", type: "Follow-up", complaint: "Blood pressure review", assignedTo: "Dr. Chen", time: "09:50", status: "In Queue" },
  ]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient || !visitType || !assignedTo) return;
    setSubmitting(true);
    setTimeout(() => {
      const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const visitId = `V-${5826 + visits.length}`;
      const newVisit: Visit = {
        id: visitId,
        patient,
        type: visitType,
        complaint: complaint || "No complaint noted",
        assignedTo,
        time: now,
        status: "Checked In",
      };
      setVisits((prev) => [newVisit, ...prev]);

      // Emit charge to Accounts
      const FEE_MAP: Record<string, number> = {
        "Outpatient Consultation": 80, "Emergency": 150, "Follow-up": 40,
        "Routine Check-up": 60, "Specialist Referral": 200, "Antenatal": 120, "Lab/Diagnostics": 100,
      };
      const chargeType = visitType === "Emergency" ? "Emergency"
        : visitType === "Follow-up" ? "Follow-up"
        : visitType === "Antenatal" ? "Antenatal"
        : visitType === "Lab/Diagnostics" ? "Lab"
        : "Consultation";
      const patientName = patient.split(" (")[0];
      const patientIdMatch = patient.match(/\((.+?)\)/);
      addFrontDeskCharge({
        id: `FDC-${Date.now()}`,
        patientName,
        patientId: patientIdMatch?.[1] ?? "PT-0000",
        chargeType: chargeType as import("@/lib/data/accounts-store").FrontDeskCharge["chargeType"],
        amount: FEE_MAP[visitType] ?? 80,
        description: `${visitType} — assigned to ${assignedTo}`,
        createdAt: `${now} · Mar 15, 2026`,
        createdBy: "Front Desk (Auto)",
        visitId,
        status: "Pending",
      });

      // Send patient to Nurses Outpatient/Triage queue
      const isEmergency = visitType === "Emergency";
      addWardPatient({
        id: `WP-FD-${Date.now()}`,
        patientName,
        patientId: patientIdMatch?.[1] ?? `PT-${Date.now()}`,
        unit: isEmergency ? "Emergency" : "Outpatient",
        bed: isEmergency ? `ER-${Date.now() % 10}` : `OPD-${Date.now() % 100}`,
        diagnosis: `${visitType} — ${complaint || "No complaint noted"}`,
        admittedAt: `Mar 15, 2026`,
        assignedNurse: "Triage Nurse",
        priority: isEmergency ? "High" : "Stable",
        status: "Active",
        doctorInCharge: assignedTo,
      });

      setToast({ message: `Visit created for ${patientName} — sent to Nurses ${isEmergency ? "Emergency" : "Outpatient"} queue.`, type: "success" });
      setPatient(""); setVisitType(""); setComplaint(""); setAssignedTo("");
      setSubmitting(false);
    }, 600);
  }

  const STATUS_STYLES: Record<string, string> = {
    "Checked In": "bg-sky-50 text-sky-700",
    "In Queue": "bg-amber-50 text-amber-700",
    "With Doctor": "bg-violet-50 text-violet-700",
    Completed: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visits / Check-in"
        description="Create a visit record, capture the complaint, and route to the doctor's queue."
      />

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Visit form */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-bold text-slate-900 mb-5">New Visit</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient <span className="text-red-500">*</span></label>
              <select
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
              >
                <option value="">Select patient…</option>
                {PATIENTS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Visit Type <span className="text-red-500">*</span></label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
              >
                <option value="">Select type…</option>
                {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Complaint Summary</label>
              <textarea
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Briefly describe the patient's presenting complaint…"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Assign Doctor / Queue <span className="text-red-500">*</span></label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
              >
                <option value="">Select doctor…</option>
                {DOCTORS.map((d) => <option key={d}>{d}</option>)}
                <option value="Triage Queue">→ Triage Queue (Nurses)</option>
                <option value="Emergency Team">→ Emergency Team</option>
              </select>
            </div>
            <Button type="submit" size="md" className="w-full" disabled={submitting}>
              {submitting ? "Creating visit…" : "Create Visit Record"}
            </Button>
          </form>
        </Card>

        {/* Today's visits */}
        <Card className="lg:col-span-3 overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Today&apos;s Visits <span className="ml-1 text-sm font-normal text-slate-400">({visits.length})</span></h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {["Visit ID", "Patient", "Type", "Assigned To", "Time", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{v.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{v.patient.split(" (")[0]}</td>
                    <td className="px-5 py-3 text-slate-600">{v.type}</td>
                    <td className="px-5 py-3 text-slate-600">{v.assignedTo}</td>
                    <td className="px-5 py-3 text-slate-400">{v.time}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[v.status]}`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No visits yet today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
