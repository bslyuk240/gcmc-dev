"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { updateLabTest, type LabTest } from "@/lib/data/lab-store";

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

const TECH_OPTIONS = ["Lab Tech James", "Lab Tech Abena", "Nurse Sandra", "Nurse Patricia"];

export default function LabSampleCollectionPage() {
  const { tests } = useLabStore();
  const [collectTarget, setCollectTarget] = useState<LabTest | null>(null);
  const [collectedBy, setCollectedBy] = useState(TECH_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);

  const pendingCollection = tests.filter((t) => t.status === "Pending");
  const recentlyCollected = tests.filter((t) => t.status === "Sample Collected");

  function handleRecord() {
    if (!collectTarget) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const today = "Mar 15, 2026";
    updateLabTest(collectTarget.id, {
      status: "Sample Collected",
      sampleCollectedBy: collectedBy,
      sampleCollectedAt: `${now} · ${today}`,
    });
    setToast({ message: `Sample collected for ${collectTarget.patientName} — ${collectTarget.testName}.`, type: "success" });
    setCollectTarget(null);
    setNotes("");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Collection"
        description="Record sample collection from patients. Updates test status to 'Sample Collected'."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 bg-amber-50 border-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting Sample Collection</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{pendingCollection.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Tests with status: Pending</p>
        </Card>
        <Card className="p-5 bg-sky-50 border-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Samples Collected Today</p>
          <p className="mt-1 text-3xl font-bold text-sky-700">{recentlyCollected.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Awaiting lab processing</p>
        </Card>
      </div>

      {/* Pending collection */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Tests Awaiting Sample Collection</h3>
          <p className="text-xs text-slate-400 mt-0.5">Ordered by doctors — collect sample from patient before processing begins</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Test", "Sample Type", "Ordered By", "Time", "Priority", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingCollection.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/30" : t.priority === "Urgent" ? "bg-amber-50/20" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="text-xs text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{t.testName}</p>
                    <p className="text-xs text-slate-400">{t.category}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{t.sampleType}</td>
                  <td className="px-5 py-3 text-slate-500 text-sm">{t.orderedBy}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{t.orderedAt}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" onClick={() => { setCollectTarget(t); setCollectedBy(TECH_OPTIONS[0]); setNotes(""); }}>
                      Record Collection
                    </Button>
                  </td>
                </tr>
              ))}
              {pendingCollection.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">All samples have been collected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Already collected */}
      {recentlyCollected.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Samples Collected — Awaiting Processing</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentlyCollected.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{t.patientName} — {t.testName}</p>
                  <p className="text-xs text-slate-400">Collected by {t.sampleCollectedBy} · {t.sampleCollectedAt}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Record collection modal */}
      <Modal open={!!collectTarget} onClose={() => setCollectTarget(null)} title="Record Sample Collection">
        {collectTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{collectTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Test</span><span>{collectTarget.testName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sample Type</span><span>{collectTarget.sampleType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Priority</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[collectTarget.priority]}`}>{collectTarget.priority}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Collected By *</label>
              <select value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} className={inputCls}>
                {TECH_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Collection Notes (optional)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Patient fasted for 8 hours, sample volume adequate..." className={inputCls} />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setCollectTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleRecord}>Confirm Sample Collected</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
