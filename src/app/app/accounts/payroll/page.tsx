"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { updatePayrollStatus, type PayrollBatch } from "@/lib/data/accounts-store";

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-sky-50 text-sky-700",
  Approved: "bg-violet-50 text-violet-700",
  Paid: "bg-emerald-50 text-emerald-700",
};

export default function AccountsPayrollPage() {
  const { payrollBatches, metrics } = useAccountsStore();

  const [viewBatch, setViewBatch] = useState<PayrollBatch | null>(null);
  const [actionTarget, setActionTarget] = useState<{ batch: PayrollBatch; action: "approve" | "pay" } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  function handleAction() {
    if (!actionTarget) return;
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (actionTarget.action === "approve") {
      updatePayrollStatus(actionTarget.batch.id, "Approved", { approvedAt: today });
      setToast({ message: `Payroll for ${actionTarget.batch.period} approved. Ready for disbursement.`, type: "success" });
    } else {
      updatePayrollStatus(actionTarget.batch.id, "Paid", { paidAt: today });
      setToast({ message: `₦${actionTarget.batch.totalAmount.toLocaleString()} disbursed for ${actionTarget.batch.period} payroll.`, type: "success" });
    }
    setActionTarget(null);
  }

  const submittedBatches = payrollBatches.filter((b) => b.status === "Submitted");
  const approvedBatches = payrollBatches.filter((b) => b.status === "Approved");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Disbursement"
        description="HR-prepared payroll batches submitted for approval and salary disbursement."
      />

      {/* Alerts */}
      {submittedBatches.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
          <svg className="h-4 w-4 shrink-0 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sky-800">
            <strong>{submittedBatches.length}</strong> payroll batch(es) awaiting your approval.
            Total: <strong>₦{submittedBatches.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()}</strong>
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Awaiting Approval", value: metrics.payrollPendingCount, sub: `₦${metrics.payrollPendingValue.toLocaleString()} pending`, color: "text-sky-700" },
          { label: "Paid This Period", value: payrollBatches.filter((b) => b.status === "Paid").length, sub: `₦${metrics.payrollPaidMTD.toLocaleString()} disbursed`, color: "text-emerald-700" },
          { label: "Total Batches", value: payrollBatches.length, color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            {s.sub && <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Payroll Batches from HR</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Period", "Staff", "Total Amount", "Prepared By", "Submitted", "Approved", "Paid", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollBatches.map((batch) => (
                <tr key={batch.id} className={`hover:bg-slate-50 ${batch.status === "Submitted" ? "bg-sky-50/20" : ""}`}>
                  <td className="px-5 py-3 font-semibold text-slate-900">{batch.period}</td>
                  <td className="px-5 py-3 text-slate-600">{batch.totalStaff}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{batch.totalAmount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-500">{batch.preparedBy}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{batch.preparedAt}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{batch.approvedAt ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{batch.paidAt ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[batch.status]}`}>{batch.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewBatch(batch)}>View</Button>
                      {batch.status === "Submitted" && (
                        <Button size="sm" onClick={() => setActionTarget({ batch, action: "approve" })}>Approve</Button>
                      )}
                      {batch.status === "Approved" && (
                        <Button size="sm" onClick={() => setActionTarget({ batch, action: "pay" })}>Disburse Salaries</Button>
                      )}
                      {batch.status === "Paid" && (
                        <span className="text-xs font-semibold text-emerald-700">✓ Paid</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payrollBatches.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No payroll batches received from HR yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> HR prepares payroll → submits to Accounts → Accounts approves → Accounts disbursed salaries → status updates to Paid.
      </div>

      {/* Action modal */}
      <Modal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.action === "approve" ? "Approve Payroll" : "Disburse Salaries"}
      >
        {actionTarget && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-semibold">{actionTarget.batch.period}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Staff Count</span><span>{actionTarget.batch.totalStaff} staff members</span></div>
              <div className="flex justify-between"><span className="font-semibold text-slate-600">Total Amount</span><span className="font-bold text-xl text-slate-900">₦{actionTarget.batch.totalAmount.toLocaleString()}</span></div>
            </div>
            {actionTarget.action === "pay" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                ✓ Confirming will mark all {actionTarget.batch.totalStaff} staff salaries as disbursed for {actionTarget.batch.period}.
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleAction}>
            {actionTarget?.action === "approve" ? "Approve Payroll" : "Confirm Disbursement"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* View batch detail */}
      {viewBatch && (
        <Modal open={true} onClose={() => setViewBatch(null)} title={`Payroll Detail — ${viewBatch.period}`}>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-bold">{viewBatch.period}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Staff</span><span>{viewBatch.totalStaff}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Amount</span><span className="font-bold">₦{viewBatch.totalAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[viewBatch.status]}`}>{viewBatch.status}</span>
              </div>
            </div>
            {viewBatch.entries && viewBatch.entries.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {["Name", "Dept", "Base", "Allow.", "Deduct.", "Net Pay"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewBatch.entries.map((e, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{e.staffName}</td>
                        <td className="px-3 py-2 text-slate-500">{e.department}</td>
                        <td className="px-3 py-2 text-slate-700">{e.baseSalary.toLocaleString()}</td>
                        <td className="px-3 py-2 text-emerald-600">+{e.allowances.toLocaleString()}</td>
                        <td className="px-3 py-2 text-red-500">−{e.deductions.toLocaleString()}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{e.netPay.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <ModalFooter>
            <Button size="md" onClick={() => setViewBatch(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
