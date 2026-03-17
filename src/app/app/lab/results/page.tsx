"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import type { LabTest } from "@/lib/data/lab-store";

const INTERP_STYLES: Record<string, string> = {
  Normal: "bg-emerald-50 text-emerald-700",
  Abnormal: "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700 font-bold",
};

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

export default function LabResultsPage() {
  const { tests } = useLabStore();
  const [viewTest, setViewTest] = useState<LabTest | null>(null);
  const [filter, setFilter] = useState<"All" | "Normal" | "Abnormal" | "Critical">("All");

  const completed = tests.filter((t) => t.status === "Completed");
  const filtered = filter === "All" ? completed : completed.filter((t) => t.interpretation === filter);

  const abnormalCount = completed.filter((t) => t.interpretation === "Abnormal").length;
  const criticalCount = completed.filter((t) => t.interpretation === "Critical").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Results"
        description="Completed test results. Doctors and nurses can view and review diagnostic results."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Normal", value: completed.filter((t) => t.interpretation === "Normal").length, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Abnormal", value: abnormalCount, color: abnormalCount > 0 ? "text-amber-700" : "text-slate-600", bg: "bg-amber-50" },
          { label: "Critical", value: criticalCount, color: criticalCount > 0 ? "text-red-700" : "text-slate-600", bg: criticalCount > 0 ? "bg-red-50" : "bg-slate-50" },
        ].map((s) => (
          <Card key={s.label} className={`p-5 ${s.bg} border-0`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label} Results</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          {criticalCount} critical result{criticalCount > 1 ? "s" : ""} — notify the ordering doctor immediately.
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Completed Test Results</h3>
          <div className="flex gap-2">
            {(["All", "Normal", "Abnormal", "Critical"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Test", "Result", "Interpretation", "Ordered By", "Technician", "Completed", "Priority", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.interpretation === "Critical" ? "bg-red-50/20" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="text-xs text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.testName}</p>
                    <p className="text-xs text-slate-400">{t.category}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-slate-700 text-xs font-medium truncate">{t.resultValue}</p>
                    {t.resultUnit && <p className="text-xs text-slate-400">{t.resultUnit}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {t.interpretation ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${INTERP_STYLES[t.interpretation]}`}>{t.interpretation}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.orderedBy}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{t.technicianName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.completedAt}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setViewTest(t)}>View</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No results match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Result detail modal */}
      {viewTest && (
        <Modal open={true} onClose={() => setViewTest(null)} title={`Result — ${viewTest.testName}`}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div><p className="text-xs text-slate-500">Patient</p><p className="font-semibold">{viewTest.patientName}</p></div>
              <div><p className="text-xs text-slate-500">Patient ID</p><p className="font-mono text-xs">{viewTest.patientId}</p></div>
              <div><p className="text-xs text-slate-500">Test</p><p className="font-semibold">{viewTest.testName}</p></div>
              <div><p className="text-xs text-slate-500">Ordered By</p><p>{viewTest.orderedBy}</p></div>
              <div><p className="text-xs text-slate-500">Technician</p><p>{viewTest.technicianName}</p></div>
              <div><p className="text-xs text-slate-500">Equipment</p><p className="text-xs">{viewTest.equipmentUsed}</p></div>
            </div>

            <div className={`rounded-lg border p-4 ${
              viewTest.interpretation === "Critical" ? "border-red-200 bg-red-50"
              : viewTest.interpretation === "Abnormal" ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2">{viewTest.interpretation ?? "Result"}</p>
              <p className="text-lg font-bold text-slate-900">{viewTest.resultValue}</p>
              {viewTest.resultUnit && <p className="text-xs text-slate-500">Unit: {viewTest.resultUnit}</p>}
              {viewTest.referenceRange && <p className="text-xs text-slate-500 mt-1">Reference range: {viewTest.referenceRange}</p>}
              {viewTest.resultNotes && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <p className="text-xs font-semibold mb-0.5">Clinical Notes</p>
                  <p className="text-sm">{viewTest.resultNotes}</p>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Completed: {viewTest.completedAt} · Entered by: {viewTest.resultEnteredBy}
            </div>
          </div>
          <ModalFooter>
            <Button size="md" onClick={() => setViewTest(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
