"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { updateLabTest, type LabTest } from "@/lib/data/lab-store";
import { addLabCharge } from "@/lib/data/accounts-store";
import { fetchStaffMembers } from "@/lib/supabase/db";

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function LabResultsEntryPage() {
  const { tests } = useLabStore();
  const [techOptions, setTechOptions] = useState<string[]>(["Lab Technician"]);
  const [entryTarget, setEntryTarget] = useState<LabTest | null>(null);
  const [resultValue, setResultValue] = useState("");
  const [resultUnit, setResultUnit] = useState("");
  const [refRange, setRefRange] = useState("");
  const [interpretation, setInterpretation] = useState<"Normal" | "Abnormal" | "Critical">("Normal");
  const [notes, setNotes] = useState("");
  const [enteredBy, setEnteredBy] = useState("Lab Technician");
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    fetchStaffMembers().then((staff) => {
      const labStaff = staff.filter((s) => s.department === "Lab");
      const names = labStaff.length > 0 ? labStaff.map((s) => s.name) : ["Lab Technician"];
      setTechOptions(names);
      setEnteredBy(names[0]);
    }).catch(() => {});
  }, []);

  // Local status overrides — ensures instant UI update independent of store pub/sub
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const displayTests = tests.map((t) =>
    localStatuses[t.id] ? { ...t, status: localStatuses[t.id] as LabTest["status"] } : t
  );
  const inProgress = displayTests.filter((t) => t.status === "In Progress");

  function handleSubmitResult() {
    if (!entryTarget || !resultValue) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    setLocalStatuses((prev) => ({ ...prev, [entryTarget.id]: "Completed" }));
    updateLabTest(entryTarget.id, {
      status: "Completed",
      resultValue,
      resultUnit,
      referenceRange: refRange,
      interpretation,
      resultNotes: notes,
      resultEnteredBy: enteredBy,
      completedAt: `${now} · ${today}`,
      billStatus: "Billed",
    });
    // Send billing charge to Accounts
    addLabCharge({
      id: `LAB-BILL-${entryTarget.id}`,
      patientName: entryTarget.patientName,
      patientId: entryTarget.patientId,
      testName: entryTarget.testName,
      testId: entryTarget.id,
      amount: entryTarget.price,
      orderedBy: entryTarget.orderedBy,
      completedAt: `${now} · ${today}`,
      status: "Pending",
    });
    setToast({ message: `Result entered for ${entryTarget.patientName} — ${entryTarget.testName}. Bill sent to Accounts.`, type: "success" });
    setEntryTarget(null);
    resetForm();
  }

  function resetForm() {
    setResultValue("");
    setResultUnit("");
    setRefRange("");
    setInterpretation("Normal");
    setNotes("");
    setEnteredBy(techOptions[0] ?? "Lab Technician");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results Entry"
        description="Enter test result values for tests currently in progress. Results are sent to the doctor."
      />

      {/* Billing rates note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        <span>Lab test billing rates are configured in <strong>Admin → Settings → Billing Rates</strong></span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Tests In Progress — Ready for Results</h3>
          <p className="text-xs text-slate-400 mt-0.5">These tests are being processed. Enter result values once analysis is complete.</p>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {inProgress.map((t) => (
            <Card key={t.id} className={`p-4 ${t.priority === "STAT" ? "border-red-200 bg-red-50/40" : t.priority === "Urgent" ? "bg-amber-50/30" : "bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.patientName}</p>
                  <p className="text-xs text-slate-400">{t.patientId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <MobileMeta label="Test" value={t.testName} />
                <MobileMeta label="Category" value={t.category} />
                <MobileMeta label="Technician" value={t.technicianName ?? "—"} />
                <MobileMeta label="Started" value={t.processingStartedAt ?? "—"} />
              </div>
              <div className="mt-3">
                <Button size="sm" className="w-full" onClick={() => { setEntryTarget(t); resetForm(); }}>Enter Result</Button>
              </div>
            </Card>
          ))}
          {inProgress.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-slate-400">No tests are currently in progress. Start processing samples first.</p>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Test", "Category", "Technician", "Equipment", "Started", "Priority", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inProgress.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/30" : t.priority === "Urgent" ? "bg-amber-50/20" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="text-xs text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{t.testName}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{t.category}</td>
                  <td className="px-5 py-3 text-slate-600">{t.technicianName ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-[140px] truncate">{t.equipmentUsed ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{t.processingStartedAt ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" onClick={() => { setEntryTarget(t); resetForm(); }}>Enter Result</Button>
                  </td>
                </tr>
              ))}
              {inProgress.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No tests are currently in progress. Start processing samples first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> When you submit a result, the test status becomes <strong>Completed</strong>, the result is visible to the doctor, and a billing charge is automatically sent to <strong>Accounts</strong>.
      </div>

      {/* Result entry modal */}
      <Modal open={!!entryTarget} onClose={() => setEntryTarget(null)} title={`Enter Result — ${entryTarget?.testName}`}>
        {entryTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
              <div><span className="text-slate-500">Patient: </span><strong>{entryTarget.patientName}</strong></div>
              <div><span className="text-slate-500">Ordered by: </span><span>{entryTarget.orderedBy}</span></div>
              <div><span className="text-slate-500">Sample: </span><span>{entryTarget.sampleType}</span></div>
              <div><span className="text-slate-500">Price: </span><strong>₦{entryTarget.price}</strong></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Result Value *</label>
              <input value={resultValue} onChange={(e) => setResultValue(e.target.value)}
                placeholder="e.g. Hb: 12.4 g/dL, WBC: 6.2×10⁹/L" className={inputCls} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit (optional)</label>
                <input value={resultUnit} onChange={(e) => setResultUnit(e.target.value)}
                  placeholder="e.g. g/dL, U/L" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Range</label>
                <input value={refRange} onChange={(e) => setRefRange(e.target.value)}
                  placeholder="e.g. 12–16 g/dL" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interpretation *</label>
              <div className="flex gap-3">
                {(["Normal", "Abnormal", "Critical"] as const).map((i) => (
                  <label key={i} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition ${
                    interpretation === i
                      ? i === "Critical" ? "border-red-400 bg-red-50 text-red-700"
                        : i === "Abnormal" ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                    <input type="radio" className="sr-only" value={i} checked={interpretation === i}
                      onChange={() => setInterpretation(i)} />
                    {i}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Add interpretation notes, recommendations, or observations..." className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Result Entered By</label>
              <select value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} className={inputCls}>
                {techOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setEntryTarget(null)}>Cancel</Button>
          <Button size="md" disabled={!resultValue} onClick={handleSubmitResult}>Submit Result</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
