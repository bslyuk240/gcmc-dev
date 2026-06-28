"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { updateProcedureBillStatus } from "@/lib/data/nurses-store";
import { addNursingCharge, getNursingCharges } from "@/lib/data/accounts-store";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The action could not be completed.";
}

export default function NursesProcedureChargesPage() {
  const { procedures, metrics } = useNursesStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Billed" | "Paid">("All");
  const [toast, setToast] = useState<ToastData | null>(null);

  async function handleSendToAccounts(id: string, patientName: string) {
    const proc = procedures.find((entry) => entry.id === id);
    if (!proc) {
      setToast({
        message: `Procedure charge send failed: ${patientName} was not found in the nursing ledger.`,
        type: "error",
      });
      return;
    }

    try {
      await addNursingCharge({
        id: proc.id,
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

      const storedCharge = getNursingCharges().find((charge) => charge.id === proc.id);
      if (!storedCharge) {
        throw new Error("Accounts recipient did not receive the nursing charge record.");
      }

      await updateProcedureBillStatus(id, "Billed");
      setToast({ message: `Procedure charge for ${patientName} sent to Accounts.`, type: "success" });
    } catch (error) {
      setToast({ message: `Send to Accounts failed: ${getErrorMessage(error)}`, type: "error" });
    }
  }

  const filtered = filter === "All" ? procedures : procedures.filter((entry) => entry.billStatus === filter);
  const totalPending = procedures
    .filter((entry) => entry.billStatus === "Pending")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalAccountsOutstanding = procedures
    .filter((entry) => entry.billStatus === "Billed")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid = procedures
    .filter((entry) => entry.billStatus === "Paid")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procedure Charges"
        description="Nursing procedure billing for injections, dressings, IV access, and more. Charges only report success after Accounts receives the billing record."
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        Procedure rates are managed by authorised Admin staff. Nurses can send charges to Accounts but do not manage billing-rate settings from this portal.
      </div>

      <div className="flex gap-3">
        {[
          { label: "Pending (unbilled)", value: metrics.pendingProcedureBills, sub: `NGN ${totalPending} to send`, color: "text-amber-600" },
          { label: "Billed to Accounts", value: procedures.filter((entry) => entry.billStatus === "Billed").length, sub: `NGN ${totalAccountsOutstanding} outstanding`, color: "text-sky-700" },
          { label: "Paid / Collected", value: procedures.filter((entry) => entry.billStatus === "Paid").length, sub: `NGN ${totalPaid} collected`, color: "text-emerald-700" },
        ].map((stat) => (
          <Card key={stat.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <div>
              <p className="text-xs font-semibold leading-tight text-slate-600">{stat.label}</p>
              <p className="text-xs text-slate-400">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Nursing Procedure Charges</h3>
          <div className="flex gap-2">
            {(["All", "Pending", "Billed", "Paid"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === value ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 px-4 py-4 md:hidden">
          {filtered.map((proc) => (
            <div key={proc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{proc.patientName}</p>
                  <p className="text-xs text-slate-400">{proc.patientId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[proc.billStatus]}`}>{proc.billStatus}</span>
              </div>
              <div className="mt-3 space-y-2">
                <MobileMeta label="Unit" value={proc.unit} />
                <MobileMeta label="Procedure" value={proc.procedureType} />
                <MobileMeta label="Description" value={proc.description} />
                <MobileMeta label="Performed by" value={proc.performedBy} />
                <MobileMeta label="Time" value={proc.performedAt} />
                <MobileMeta label="Amount" value={`NGN ${proc.amount}`} />
              </div>
              <div className="mt-3">
                {proc.billStatus === "Pending" ? (
                  <Button size="sm" className="w-full" onClick={() => void handleSendToAccounts(proc.id, proc.patientName)}>
                    Send to Accounts
                  </Button>
                ) : proc.billStatus === "Billed" ? (
                  <span className="text-xs font-semibold text-sky-700">Sent</span>
                ) : proc.billStatus === "Paid" ? (
                  <span className="text-xs font-semibold text-emerald-700">Paid</span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Waived</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              No procedure charges found.
            </div>
          ) : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Patient", "Unit", "Procedure", "Description", "Performed By", "Time", "Amount", "Status", "Action"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
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
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500">{proc.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{proc.performedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{proc.performedAt}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">NGN {proc.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[proc.billStatus]}`}>{proc.billStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    {proc.billStatus === "Pending" ? (
                      <Button size="sm" onClick={() => void handleSendToAccounts(proc.id, proc.patientName)}>
                        Send to Accounts
                      </Button>
                    ) : null}
                    {proc.billStatus === "Billed" ? <span className="text-xs font-semibold text-sky-700">Sent</span> : null}
                    {proc.billStatus === "Paid" ? <span className="text-xs font-semibold text-emerald-700">Paid</span> : null}
                    {proc.billStatus === "Waived" ? <span className="text-xs font-semibold text-slate-500">Waived</span> : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                    No procedure charges found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Nurse performs procedure in Ward, Emergency, or ICU -&gt; charge is sent to Accounts immediately from the unit page -&gt; the procedure also appears here as &quot;Billed&quot; for tracking -&gt; Accounts collects payment on the Nursing Billing screen.
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
