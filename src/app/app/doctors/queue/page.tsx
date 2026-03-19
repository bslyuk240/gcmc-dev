"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { addConsultation, type ConsultType } from "@/lib/data/doctors-store";
import { addConsultationFee } from "@/lib/data/accounts-store";
import { useBillingPresets } from "@/lib/hooks/use-billing-presets";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 font-bold",
  High: "bg-amber-100 text-amber-700",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-100 text-emerald-700",
};

export default function DoctorsQueuePage() {
  const { allPatients } = useNursesStore();
  const { getAmount } = useBillingPresets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [consultingId, setConsultingId] = useState<string | null>(null);
  const [consultType, setConsultType] = useState<ConsultType>("General");
  const [assignedDoctor, setAssignedDoctor] = useState("Dr. Chen Lin");

  // Outpatient queue from Nurses Bay — populated when Front Desk registers patients
  const outpatientQueue = allPatients.filter((p) => p.unit === "Outpatient" && p.status === "Active");
  const emergencyQueue = allPatients.filter((p) => p.unit === "Emergency" && p.status === "Active");

  function handleStartConsult(patient: typeof outpatientQueue[0]) {
    const type: ConsultType = consultType;
    const fee = getAmount("consultation", type, 100);
    const consultId = `CON-${Date.now().toString().slice(-5)}`;

    addConsultation({
      id: consultId,
      patientName: patient.patientName,
      patientId: patient.patientId,
      doctorName: assignedDoctor,
      consultType: type,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      status: "In Progress",
      chiefComplaint: patient.diagnosis,
      rxWritten: false,
      labOrdered: false,
      admissionOrdered: false,
      consultFee: fee,
      feePaid: false,
    });

    const accountsType = (["General","Specialist","Emergency","Follow-up","Antenatal"].includes(type) ? type : "General") as "General" | "Specialist" | "Emergency" | "Follow-up" | "Antenatal";
    addConsultationFee({
      id: `CF-${Date.now().toString().slice(-5)}`,
      patientName: patient.patientName,
      patientId: patient.patientId,
      doctorName: assignedDoctor,
      consultationType: accountsType,
      fee,
      status: "Pending",
      consultedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    });

    setToast({ message: `Consultation started for ${patient.patientName} — fee ₦${fee} sent to Accounts.`, type: "success" });
    setConsultingId(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Waiting Queue"
        description="Outpatient and Emergency patients ready for consultation — populated when Front Desk registers visits."
      />

      <div className="flex gap-3">
        {[
          { label: "Outpatient Queue", value: outpatientQueue.length, color: outpatientQueue.length > 0 ? "text-amber-600" : "text-slate-400" },
          { label: "Emergency Queue", value: emergencyQueue.length, color: emergencyQueue.length > 0 ? "text-red-700" : "text-slate-400" },
          { label: "Total Waiting", value: outpatientQueue.length + emergencyQueue.length, color: "text-slate-900" },
          { label: "Total Active Patients", value: allPatients.filter((p) => p.status === "Active").length, color: "text-indigo-700" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Outpatient Queue */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Outpatient Queue</h3>
          <p className="text-xs text-slate-400">Routed from Front Desk via Nurses Bay</p>
        </div>
        {outpatientQueue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Patient", "Patient ID", "Bed/Slot", "Triage", "Priority", "Assigned Nurse", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outpatientQueue.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.patientName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.patientId}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{p.bed}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{p.diagnosis}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.assignedNurse}</td>
                    <td className="px-4 py-3">
                      {consultingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <select value={consultType} onChange={(e) => setConsultType(e.target.value as ConsultType)}
                            className={inputCls + " w-32 py-1"}>
                            {["General", "Specialist", "Emergency", "Follow-up", "Antenatal", "Paediatric"].map((t) => <option key={t}>{t}</option>)}
                          </select>
                          <Button size="sm" onClick={() => handleStartConsult(p)}>Start</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConsultingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => setConsultingId(p.id)}>Start Consult</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-400 text-sm">No patients in outpatient queue.</p>
            <p className="mt-1 text-xs text-slate-300">Patients are routed here after Front Desk registration and Nurse triage.</p>
          </div>
        )}
      </Card>

      {/* Emergency Queue */}
      {emergencyQueue.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-5 py-4">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-bold text-red-900">Emergency Queue — {emergencyQueue.length} Patient{emergencyQueue.length > 1 ? "s" : ""}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {emergencyQueue.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{p.patientName}</p>
                  <p className="text-xs text-slate-400">{p.bed} · {p.diagnosis}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                <Button size="sm" onClick={() => {
                  setConsultType("Emergency");
                  handleStartConsult(p);
                }}>Start Emergency Consult</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
