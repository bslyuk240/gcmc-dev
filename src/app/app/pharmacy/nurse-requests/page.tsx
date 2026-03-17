"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { updateNurseRequestStatus } from "@/lib/data/pharmacy-store";

const STATUS_COLOR: Record<string, string> = {
  Requested:  "bg-sky-100 text-sky-700",
  Preparing:  "bg-amber-100 text-amber-800",
  Ready:      "bg-violet-100 text-violet-800",
  Collected:  "bg-emerald-100 text-emerald-700",
  Cancelled:  "bg-slate-100 text-slate-500",
};

type Filter = "All" | "Requested" | "Preparing" | "Ready" | "Collected" | "Cancelled";

export default function PharmacyNurseRequestsPage() {
  const { nurseRequests } = usePharmacyStore();
  const [filter, setFilter] = useState<Filter>("All");
  const [toast, setToast] = useState<ToastData | null>(null);

  const filtered = filter === "All" ? nurseRequests : nurseRequests.filter((r) => r.status === filter);

  const pendingCount  = nurseRequests.filter((r) => r.status === "Requested").length;
  const preparingCount = nurseRequests.filter((r) => r.status === "Preparing").length;
  const readyCount    = nurseRequests.filter((r) => r.status === "Ready").length;

  function handlePrepare(id: string, drug: string, patient: string) {
    updateNurseRequestStatus(id, "Preparing");
    setToast({ message: `Preparing ${drug} for ${patient}…`, type: "info" });
  }

  function handleReady(id: string, drug: string, patient: string) {
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    updateNurseRequestStatus(id, "Ready", {
      preparedAt: `${now} · ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
      preparedBy: "Pharmacist (You)",
    });
    setToast({ message: `${drug} for ${patient} is ready for collection.`, type: "success" });
  }

  function handleCancel(id: string, drug: string) {
    updateNurseRequestStatus(id, "Cancelled");
    setToast({ message: `${drug} request cancelled.`, type: "info" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nurse Medication Requests"
        description="Medication requests from nursing units. Prepare and mark ready for ward collection."
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Awaiting Preparation", value: pendingCount,  color: "text-sky-600" },
          { label: "Being Prepared",       value: preparingCount, color: "text-amber-600" },
          { label: "Ready for Collection", value: readyCount,    color: "text-violet-700" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["All", "Requested", "Preparing", "Ready", "Collected", "Cancelled"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f}
            {f === "Requested" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Req ID", "Patient", "Ward", "Drug / Dosage", "Route", "Qty", "Urgency", "Requested By", "Time", "Status", "Action"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    req.urgency === "STAT" ? "bg-red-50/40" :
                    req.status === "Requested" ? "bg-sky-50/20" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{req.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{req.patientName}</td>
                  <td className="px-4 py-3 text-slate-500">{req.ward}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{req.drug}</p>
                    <p className="text-xs text-slate-400">{req.dosage}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{req.route}</td>
                  <td className="px-4 py-3 text-slate-600">{req.qty}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      req.urgency === "STAT"   ? "bg-red-100 text-red-700" :
                      req.urgency === "Urgent" ? "bg-orange-100 text-orange-700" :
                                                 "bg-slate-100 text-slate-600"
                    }`}>
                      {req.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{req.requestedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{req.requestedAt}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLOR[req.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {req.status === "Requested" && (
                        <>
                          <Button size="sm" onClick={() => handlePrepare(req.id, req.drug, req.patientName)}>
                            Start Preparing
                          </Button>
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-600" onClick={() => handleCancel(req.id, req.drug)}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {req.status === "Preparing" && (
                        <Button size="sm" onClick={() => handleReady(req.id, req.drug, req.patientName)}>
                          Mark Ready ✓
                        </Button>
                      )}
                      {req.status === "Ready" && (
                        <span className="text-xs font-semibold text-violet-700">Awaiting collection</span>
                      )}
                      {req.status === "Collected" && (
                        <span className="text-xs font-semibold text-emerald-600">✓ Collected</span>
                      )}
                      {req.status === "Cancelled" && (
                        <span className="text-xs text-slate-400">Cancelled</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-sm text-slate-400">
                    No {filter === "All" ? "" : filter.toLowerCase() + " "}requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">{filtered.length} request{filtered.length !== 1 ? "s" : ""} shown</p>
        </div>
      </Card>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
