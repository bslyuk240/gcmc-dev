"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import { updateLabTest, type LabTest } from "@/lib/data/lab-store";
import { fetchStaffMembers } from "@/lib/supabase/db";

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

const EQUIPMENT_OPTIONS = [
  "Sysmex XN-550 (Haematology Analyser)",
  "Mindray BS-240 (Chemistry Analyser)",
  "Microscope Leica DM500",
  "Roche Cobas e411 (Immunology)",
  "BioMerieux VITEK 2 (Microbiology)",
  "Urine Analyser Dirui H-800",
  "Manual Microscopy",
];

export default function LabProcessingPage() {
  const { tests } = useLabStore();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Lab Technician";
  const [techOptions, setTechOptions] = useState<string[]>([]);
  const [processTarget, setProcessTarget] = useState<LabTest | null>(null);
  const [techName, setTechName] = useState("");
  const [equipment, setEquipment] = useState(EQUIPMENT_OPTIONS[0]);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    fetchStaffMembers()
      .then((staff) => {
        const labStaff = staff.filter((s) => s.department === "Lab");
        const names = labStaff.length > 0 ? labStaff.map((s) => s.name) : [staffName];
        setTechOptions(names);
        // Pre-select current user if in list, else first option
        setTechName(names.includes(staffName) ? staffName : names[0]);
      })
      .catch(() => {
        setTechOptions([staffName]);
        setTechName(staffName);
      });
  }, [staffName]);

  // Local overrides — ensures instant UI update independent of store pub/sub
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<LabTest>>>({});
  const displayTests = tests.map((t) => localOverrides[t.id] ? { ...t, ...localOverrides[t.id] } : t);
  const readyToProcess = displayTests.filter((t) => t.status === "Sample Collected");
  const inProgress = displayTests.filter((t) => t.status === "In Progress");

  function handleStartProcessing() {
    if (!processTarget) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const processingStartedAt = `${now} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    const overrides: Partial<LabTest> = {
      status: "In Progress",
      technicianName: techName,
      equipmentUsed: equipment,
      processingStartedAt,
    };
    setLocalOverrides((prev) => ({ ...prev, [processTarget.id]: overrides }));
    updateLabTest(processTarget.id, overrides);
    setToast({ message: `Processing started: ${processTarget.testName} for ${processTarget.patientName}.`, type: "success" });
    setProcessTarget(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Processing"
        description="Start processing samples that have been collected. Assign technician and equipment."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 bg-sky-50 border-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready to Process</p>
          <p className="mt-1 text-3xl font-bold text-sky-700">{readyToProcess.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Sample collected, awaiting analysis</p>
        </Card>
        <Card className="p-5 bg-violet-50 border-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Currently In Progress</p>
          <p className="mt-1 text-3xl font-bold text-violet-700">{inProgress.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Being processed right now</p>
        </Card>
      </div>

      {/* Ready to process */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Samples Ready for Processing</h3>
          <p className="text-xs text-slate-400 mt-0.5">Sample has been collected — assign technician and start processing</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Test", "Sample Type", "Collected By", "Collection Time", "Priority", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {readyToProcess.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/30" : t.priority === "Urgent" ? "bg-amber-50/20" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="text-xs text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{t.testName}</td>
                  <td className="px-5 py-3 text-slate-500">{t.sampleType}</td>
                  <td className="px-5 py-3 text-slate-600">{t.sampleCollectedBy ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{t.sampleCollectedAt ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" onClick={() => { setProcessTarget(t); setTechName(techOptions.includes(staffName) ? staffName : (techOptions[0] ?? staffName)); setEquipment(EQUIPMENT_OPTIONS[0]); }}>
                      Start Processing
                    </Button>
                  </td>
                </tr>
              ))}
              {readyToProcess.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No samples ready for processing. Collect samples first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* In progress */}
      {inProgress.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Currently In Progress</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {inProgress.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-2 w-2 shrink-0 rounded-full bg-violet-400 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{t.patientName} — {t.testName}</p>
                  <p className="text-xs text-slate-400">
                    Technician: {t.technicianName} · Equipment: {t.equipmentUsed} · Started: {t.processingStartedAt}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Next step:</strong> After processing, go to <strong>Results Entry</strong> to input test result values.
      </div>

      {/* Start processing modal */}
      <Modal open={!!processTarget} onClose={() => setProcessTarget(null)} title="Start Lab Processing">
        {processTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{processTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Test</span><span>{processTarget.testName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sample</span><span>{processTarget.sampleType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Priority</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[processTarget.priority]}`}>{processTarget.priority}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Technician *</label>
              <select value={techName} onChange={(e) => setTechName(e.target.value)} className={inputCls}>
                {techOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Used *</label>
              <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
                {EQUIPMENT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setProcessTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleStartProcessing}>Start Processing</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
