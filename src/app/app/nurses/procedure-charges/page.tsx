"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { updateProcedureBillStatus } from "@/lib/data/nurses-store";
import { addNursingCharge } from "@/lib/data/accounts-store";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Billed: "bg-sky-50 text-sky-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Waived: "bg-slate-100 text-slate-500",
};

const UNIT_STYLES: Record<string, string> = {
  Ward: "bg-emerald-50 text-emerald-700",
  Emergency: "bg-amber-50 text-amber-700",
  ICU: "bg-red-50 text-red-700",
  Outpatient: "bg-sky-50 text-sky-700",
};

export default function NursesProcedureChargesPage() {
  const { procedures, metrics } = useNursesStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Billed" | "Paid">("All");
  const [toast, setToast] = useState<ToastData | null>(null);

  function handleSendToAccounts(id: string, patientName: string) {
    const proc = procedures.find((p) => p.id === id);
    if (!proc) return;
    updateProcedureBillStatus(id, "Billed");
    addNursingCharge({
      id: `NC-ACC-${Date.now()}`,
      patientName: proc.patientName,
      patientId: proc.patientId,
      unit: proc.unit,
      procedureType: proc.procedureType,
      description: proc.description,
      performedBy: proc.performedBy,
      performedAt: proc.performedAt,
      amount: proc.amount,
      status: "Billed",
    });
    setToast({ message: `Procedure charge for ${patientName} sent to Accounts.`, type: "success" });
  }

  const filtered = filter === "All" ? procedures : procedures.filter((p) => p.billStatus === filter);
  const totalPending = procedures.filter((p) => p.billStatus === "Pending").reduce((s, p) => s + p.amount, 0);
  const totalBilled = procedures.filter((p) => p.billStatus === "Billed" || p.billStatus === "Paid").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procedure Charges"
        description="Nursing procedure billing — injections, dressings, IV access, and more. Send charges to Accounts."
      />

      <div className="flex gap-3">
        {[
          { label: "Pending (unbilled)", value: metrics.pendingProcedureBills, sub: `₦${totalPending} to send`, color: "text-amber-600" },
          { label: "Billed to Accounts", value: procedures.filter((p) => p.billStatus === "Billed").length, sub: `₦${procedures.filter((p) => p.billStatus === "Billed").reduce((s, p) => s + p.amount, 0)} outstanding`, color: "text-sky-700" },
          { label: "Paid / Collected", value: procedures.filter((p) => p.billStatus === "Paid").length, sub: `₦${procedures.filter((p) => p.billStatus === "Paid").reduce((s, p) => s + p.amount, 0)} collected`, color: "text-emerald-700" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <div>
              <p className="text-xs font-semibold text-slate-600 leading-tight">{s.label}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Nursing Procedure Charges</h3>
          <div className="flex gap-2">
            {(["All", "Pending", "Billed", "Paid"] as const).map((f) => (
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
                {["Patient", "Unit", "Procedure", "Description", "Performed By", "Time", "Amount", "Status", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((proc) => (
                <tr key={proc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{proc.patientName}</p>
                    <p className="text-xs text-slate-400">{proc.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${UNIT_STYLES[proc.unit]}`}>{proc.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{proc.procedureType}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{proc.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{proc.performedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{proc.performedAt}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">₦{proc.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[proc.billStatus]}`}>{proc.billStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    {proc.billStatus === "Pending" && (
                      <Button size="sm" onClick={() => handleSendToAccounts(proc.id, proc.patientName)}>
                        Send to Accounts
                      </Button>
                    )}
                    {proc.billStatus === "Billed" && <span className="text-xs text-sky-700 font-semibold">Sent ✓</span>}
                    {proc.billStatus === "Paid" && <span className="text-xs text-emerald-700 font-semibold">Paid ✓</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No procedure charges found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Nurse performs procedure → records it in Ward/Emergency/ICU page → charge appears here with "Pending" status → nurse sends to Accounts → Accounts collects payment from patient.
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
