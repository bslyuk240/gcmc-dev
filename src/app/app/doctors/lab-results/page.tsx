"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import { updateConsultation } from "@/lib/data/doctors-store";

const INTERP_STYLES: Record<string, string> = {
  Normal: "bg-emerald-50 text-emerald-700",
  Abnormal: "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700 font-bold",
  Pending: "bg-slate-100 text-slate-500",
};

function MobileMeta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export default function DoctorLabResultsPage() {
  const session = useHMSSession();
  const doctorName = session?.full_name ?? "";
  const { tests } = useLabStore();
  const { consultations } = useDoctorsStore();
  const [viewResult, setViewResult] = useState<typeof tests[0] | null>(null);
  const [filterInterp, setFilterInterp] = useState("All");

  const completedTests = tests.filter(
    (test) =>
      test.status === "Completed" &&
      test.orderedBy.trim().toLowerCase() === doctorName.trim().toLowerCase(),
  );
  const criticalResults = completedTests.filter((t) => t.interpretation === "Critical");

  const filtered = filterInterp === "All"
    ? completedTests
    : completedTests.filter((t) => (t.interpretation ?? "Pending") === filterInterp);

  function markReviewed(patientName: string) {
    // Mark the linked consultation as no longer awaiting
    const linked = consultations.find((c) =>
      c.patientName === patientName && c.status === "Awaiting Results"
    );
    if (linked) {
      updateConsultation(linked.id, { status: "Completed" });
    }
    setViewResult(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Results"
        description={
          doctorName
            ? `Completed results for tests ordered by ${doctorName}.`
            : "Completed diagnostic results returned from the Laboratory."
        }
      />

      {criticalResults.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-red-800">
            {criticalResults.length} critical result{criticalResults.length > 1 ? "s" : ""} — immediate review required.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:flex">
        {[
          { label: "Completed Results", value: completedTests.length, color: "text-emerald-700" },
          { label: "Critical", value: criticalResults.length, color: criticalResults.length > 0 ? "text-red-700" : "text-slate-400" },
          { label: "Abnormal", value: completedTests.filter((t) => t.interpretation === "Abnormal").length, color: "text-amber-600" },
          { label: "Normal", value: completedTests.filter((t) => t.interpretation === "Normal").length, color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Completed Results from Lab</h3>
          <div className="flex gap-1.5">
            {["All", "Critical", "Abnormal", "Normal"].map((f) => (
              <button key={f} onClick={() => setFilterInterp(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterInterp === f ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 md:hidden">
          {filtered.map((t) => (
            <div key={t.id} className={`space-y-3 border-b border-slate-100 px-4 py-4 last:border-b-0 ${t.interpretation === "Critical" ? "bg-red-50/20" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{t.patientName}</p>
                  <p className="text-[10px] text-slate-400">{t.testName}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${INTERP_STYLES[t.interpretation ?? "Pending"]}`}>
                  {t.interpretation ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <MobileMeta label="Lab ID" value={t.id} />
                <MobileMeta label="Priority" value={t.priority} />
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <MobileMeta label="Ordered By" value={t.orderedBy} />
                <MobileMeta label="Date" value={t.completedAt ?? t.orderedAt} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  {t.resultValue ? <strong>{t.resultValue} {t.resultUnit}</strong> : <span className="text-slate-400">—</span>}
                </div>
                <Button size="sm" variant="outline" onClick={() => setViewResult(t)}>View</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-slate-400">No completed results in this category.</p>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Lab ID", "Patient", "Test", "Result", "Interpretation", "Ordered By", "Date", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.interpretation === "Critical" ? "bg-red-50/20" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.patientName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.testName}</td>
                  <td className="px-4 py-3 text-sm">
                    {t.resultValue ? <strong>{t.resultValue} {t.resultUnit}</strong> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${INTERP_STYLES[t.interpretation ?? "Pending"]}`}>
                      {t.interpretation ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.orderedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.completedAt ?? t.orderedAt}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setViewResult(t)}>View</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No completed results in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Result Detail Modal */}
      <Modal open={!!viewResult} onClose={() => setViewResult(null)}
        title={`Lab Result — ${viewResult?.testName}`}>
        {viewResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${INTERP_STYLES[viewResult.interpretation ?? "Pending"]}`}>
                {viewResult.interpretation ?? "Pending"}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${viewResult.priority === "STAT" ? "bg-red-100 text-red-700" : viewResult.priority === "Urgent" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {viewResult.priority}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {[
                { label: "Patient", value: viewResult.patientName },
                { label: "Test", value: viewResult.testName },
                { label: "Category", value: viewResult.category },
                { label: "Sample Type", value: viewResult.sampleType },
                { label: "Result", value: viewResult.resultValue ? `${viewResult.resultValue} ${viewResult.resultUnit ?? ""}` : "—" },
                { label: "Reference Range", value: viewResult.referenceRange ?? "See lab notes" },
                { label: "Ordered By", value: viewResult.orderedBy },
                { label: "Date", value: viewResult.completedAt ?? viewResult.orderedAt },
              ].map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wide">{row.label}</p>
                  <p className="font-semibold text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>
            {viewResult.resultNotes && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <strong>Lab Notes:</strong> {viewResult.resultNotes}
              </div>
            )}
            {viewResult.interpretation === "Critical" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 font-semibold">
                Critical result — immediate clinical action required. Consider admission or urgent intervention.
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setViewResult(null)}>Close</Button>
          <Button size="md" onClick={() => viewResult && markReviewed(viewResult.patientName)}>
            Mark Reviewed
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
