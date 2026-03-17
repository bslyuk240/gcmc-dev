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

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  "Sample Collected": "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

type FilterStatus = "All" | LabTest["status"];

export default function LabTestRequestsPage() {
  const { tests } = useLabStore();
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "Routine" | "Urgent" | "STAT">("All");
  const [viewTest, setViewTest] = useState<LabTest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LabTest | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const filtered = tests
    .filter((t) => filter === "All" || t.status === filter)
    .filter((t) => priorityFilter === "All" || t.priority === priorityFilter);

  function handleCancel() {
    if (!cancelTarget) return;
    updateLabTest(cancelTarget.id, { status: "Cancelled" });
    setToast({ message: `Test "${cancelTarget.testName}" for ${cancelTarget.patientName} cancelled.`, type: "info" });
    setCancelTarget(null);
  }

  const statuses: FilterStatus[] = ["All", "Pending", "Sample Collected", "In Progress", "Completed", "Cancelled"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Requests"
        description="All lab test orders from doctors. Track, process, and manage diagnostic requests."
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === s ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {s} {s !== "All" && `(${tests.filter((t) => t.status === s).length})`}
              </button>
            ))}
          </div>
          <div className="h-auto w-px bg-slate-200 mx-1 hidden sm:block" />
          <div className="flex gap-2">
            {(["All", "Routine", "Urgent", "STAT"] as const).map((p) => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${priorityFilter === p ? "bg-slate-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} test{filtered.length !== 1 ? "s" : ""} shown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["ID", "Patient", "Test", "Category", "Ordered By", "Time", "Price", "Priority", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/30" : t.priority === "Urgent" ? "bg-amber-50/20" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{t.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="text-xs text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.testName}</p>
                    <p className="text-xs text-slate-400">{t.sampleType}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.category}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.orderedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.orderedAt}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">₦{t.price}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewTest(t)}>View</Button>
                      {t.status !== "Completed" && t.status !== "Cancelled" && (
                        <Button size="sm" variant="ghost" onClick={() => setCancelTarget(t)}>Cancel</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-400">No tests match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View test modal */}
      {viewTest && (
        <Modal open={true} onClose={() => setViewTest(null)} title={`Test Detail — ${viewTest.id}`}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div><p className="text-xs text-slate-500">Patient</p><p className="font-semibold">{viewTest.patientName}</p></div>
              <div><p className="text-xs text-slate-500">Patient ID</p><p className="font-mono text-xs">{viewTest.patientId}</p></div>
              <div><p className="text-xs text-slate-500">Test</p><p className="font-semibold">{viewTest.testName}</p></div>
              <div><p className="text-xs text-slate-500">Category</p><p>{viewTest.category}</p></div>
              <div><p className="text-xs text-slate-500">Ordered By</p><p>{viewTest.orderedBy}</p></div>
              <div><p className="text-xs text-slate-500">Ordered At</p><p>{viewTest.orderedAt}</p></div>
              <div><p className="text-xs text-slate-500">Sample Type</p><p>{viewTest.sampleType}</p></div>
              <div><p className="text-xs text-slate-500">Price</p><p className="font-bold text-slate-900">₦{viewTest.price}</p></div>
              <div><p className="text-xs text-slate-500">Priority</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[viewTest.priority]}`}>{viewTest.priority}</span>
              </div>
              <div><p className="text-xs text-slate-500">Status</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[viewTest.status]}`}>{viewTest.status}</span>
              </div>
            </div>
            {viewTest.sampleCollectedBy && (
              <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                <p className="text-xs font-bold text-sky-700 mb-1">Sample Collection</p>
                <p>Collected by: <strong>{viewTest.sampleCollectedBy}</strong></p>
                <p className="text-xs text-slate-500">{viewTest.sampleCollectedAt}</p>
              </div>
            )}
            {viewTest.resultValue && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-bold text-emerald-700 mb-1">Result</p>
                <p className="font-semibold">{viewTest.resultValue} {viewTest.resultUnit}</p>
                <p className="text-xs text-slate-500">Ref: {viewTest.referenceRange}</p>
                <p className="text-xs mt-1 text-slate-600">{viewTest.resultNotes}</p>
              </div>
            )}
          </div>
          <ModalFooter>
            <Button size="md" onClick={() => setViewTest(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Cancel modal */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Test">
        {cancelTarget && (
          <p className="text-sm text-slate-700">Cancel <strong>{cancelTarget.testName}</strong> for <strong>{cancelTarget.patientName}</strong>? This cannot be undone.</p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setCancelTarget(null)}>Keep Test</Button>
          <Button size="md" className="bg-red-600 text-white hover:opacity-95" onClick={handleCancel}>Cancel Test</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
