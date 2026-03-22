"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollEntryBreakdown } from "@/components/payroll/payroll-entry-breakdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { updatePayrollStatus, type PayrollBatch } from "@/lib/data/accounts-store";
import { updatePayslipWorkflowByBatch } from "@/lib/data/hr-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { summarisePayrollEntries } from "@/lib/payroll/utils";

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-sky-50 text-sky-700",
  Approved: "bg-violet-50 text-violet-700",
  Paid: "bg-emerald-50 text-emerald-700",
};

function money(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

function formatPayrollTimestamp(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountsPayrollPage() {
  const { payrollBatches, metrics } = useAccountsStore();

  const [viewBatch, setViewBatch] = useState<PayrollBatch | null>(null);
  const [actionTarget, setActionTarget] = useState<{ batch: PayrollBatch; action: "approve" | "pay" } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const submittedBatches = useMemo(
    () => payrollBatches.filter((batch) => batch.status === "Submitted"),
    [payrollBatches],
  );
  const approvedBatches = useMemo(
    () => payrollBatches.filter((batch) => batch.status === "Approved"),
    [payrollBatches],
  );

  async function handleAction() {
    if (!actionTarget) return;

    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    try {
      if (actionTarget.action === "approve") {
        await updatePayslipWorkflowByBatch(actionTarget.batch.id, "Approved");
        await updatePayrollStatus(actionTarget.batch.id, "Approved", { approvedAt: today });
        window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
        setToast({
          message: `${actionTarget.batch.department ?? "Department"} payroll for ${actionTarget.batch.period} approved and ready for disbursement.`,
          type: "success",
        });
      } else {
        await updatePayslipWorkflowByBatch(actionTarget.batch.id, "Paid", { paymentStatus: "Paid", paidAt: today });
        await updatePayrollStatus(actionTarget.batch.id, "Paid", { paidAt: today });
        window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
        setToast({
          message: `${money(actionTarget.batch.totalAmount)} disbursed for ${actionTarget.batch.department ?? "department"} - ${actionTarget.batch.period}.`,
          type: "success",
        });
      }
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Failed to update payroll status.",
        type: "error",
      });
    }

    setActionTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Disbursement"
        description="Review HR payroll details, approve submitted batches, and mark salary disbursement as completed."
      />

      {submittedBatches.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
          <svg className="h-4 w-4 shrink-0 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sky-800">
            <strong>{submittedBatches.length}</strong> payroll batch(es) awaiting approval.
            Total pending disbursement: <strong>{money(submittedBatches.reduce((sum, batch) => sum + batch.totalAmount, 0))}</strong>
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Awaiting Approval", value: metrics.payrollPendingCount, sub: `${money(metrics.payrollPendingValue)} pending`, color: "text-sky-700" },
          { label: "Approved Batches", value: approvedBatches.length, sub: `${money(approvedBatches.reduce((sum, batch) => sum + batch.totalAmount, 0))} ready`, color: "text-violet-700" },
          { label: "Paid This Period", value: payrollBatches.filter((batch) => batch.status === "Paid").length, sub: `${money(metrics.payrollPaidMTD)} disbursed`, color: "text-emerald-700" },
          { label: "Total Batches", value: payrollBatches.length, color: "text-slate-900" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            {card.sub && <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>}
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Payroll Batches from HR</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Department", "Period", "Staff", "Gross", "Deductions", "Net Amount", "Prepared By", "Submitted", "Approved", "Paid", "Status", "Action"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollBatches.map((batch) => {
                const totals = summarisePayrollEntries(batch.entries ?? []);

                return (
                  <tr key={batch.id} className={`hover:bg-slate-50 ${batch.status === "Submitted" ? "bg-sky-50/30" : ""}`}>
                    <td className="px-5 py-3 font-medium text-slate-800">{batch.department ?? "-"}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{batch.period}</td>
                    <td className="px-5 py-3 text-slate-600">{batch.totalStaff}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{money(totals.gross)}</td>
                    <td className="px-5 py-3 text-rose-600">{money(totals.deductions)}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{money(batch.totalAmount)}</td>
                    <td className="px-5 py-3 text-slate-500">{batch.preparedBy}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatPayrollTimestamp(batch.preparedAt)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatPayrollTimestamp(batch.approvedAt)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatPayrollTimestamp(batch.paidAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[batch.status]}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewBatch(batch)}>
                          View
                        </Button>
                        {batch.status === "Submitted" && (
                          <Button size="sm" onClick={() => setActionTarget({ batch, action: "approve" })}>
                            Approve
                          </Button>
                        )}
                        {batch.status === "Approved" && (
                          <Button size="sm" onClick={() => setActionTarget({ batch, action: "pay" })}>
                            Disburse Salaries
                          </Button>
                        )}
                        {batch.status === "Paid" && (
                          <span className="text-xs font-semibold text-emerald-700">Paid</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {payrollBatches.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-10 text-center text-sm text-slate-400">
                    No payroll batches received from HR yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> HR submits staff-level payroll details, Accounts verifies the breakdown, approves, and disburses.
      </div>

      <Modal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.action === "approve" ? "Approve Payroll" : "Disburse Salaries"}
      >
        {actionTarget && (
          <div className="space-y-3 text-sm">
            {(() => {
              const totals = summarisePayrollEntries(actionTarget.batch.entries ?? []);

              return (
                <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-500">Period</span><span className="font-semibold">{actionTarget.batch.period}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Department</span><span>{actionTarget.batch.department ?? "-"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Staff Count</span><span>{actionTarget.batch.totalStaff} staff members</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Prepared At</span><span>{formatPayrollTimestamp(actionTarget.batch.preparedAt)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Approved At</span><span>{formatPayrollTimestamp(actionTarget.batch.approvedAt)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Paid At</span><span>{formatPayrollTimestamp(actionTarget.batch.paidAt)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Gross Payroll</span><span>{money(totals.gross)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Allowances</span><span>{money(totals.allowances)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Deductions</span><span>{money(totals.deductions)}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-slate-600">Net Amount</span><span className="font-bold text-xl text-slate-900">{money(actionTarget.batch.totalAmount)}</span></div>
                </div>
              );
            })()}
            {actionTarget.action === "pay" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Confirming will mark all {actionTarget.batch.totalStaff} salaries as disbursed for {actionTarget.batch.period}.
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

      {viewBatch && (
        <Modal open={true} onClose={() => setViewBatch(null)} title={`Payroll Detail - ${viewBatch.department ?? "Department"} - ${viewBatch.period}`} className="max-w-6xl">
          <div className="space-y-4">
            {(() => {
              const totals = summarisePayrollEntries(viewBatch.entries ?? []);

              return (
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</p>
                    <p className="font-semibold text-slate-900">{viewBatch.department ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Period</p>
                    <p className="font-semibold text-slate-900">{viewBatch.period}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Staff Count</p>
                    <p className="font-semibold text-slate-900">{viewBatch.totalStaff}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gross</p>
                    <p className="font-semibold text-slate-900">{money(totals.gross)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Allowances</p>
                    <p className="font-semibold text-slate-900">{money(totals.allowances)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deductions</p>
                    <p className="font-semibold text-slate-900">{money(totals.deductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[viewBatch.status]}`}>
                      {viewBatch.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prepared At</p>
                    <p className="font-semibold text-slate-900">{formatPayrollTimestamp(viewBatch.preparedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Approved At</p>
                    <p className="font-semibold text-slate-900">{formatPayrollTimestamp(viewBatch.approvedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paid At</p>
                    <p className="font-semibold text-slate-900">{formatPayrollTimestamp(viewBatch.paidAt)}</p>
                  </div>
                </div>
              );
            })()}

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {viewBatch.entries?.map((entry) => (
                <PayrollEntryBreakdown key={entry.staffId ?? entry.staffName} entry={entry} />
              ))}
            </div>
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
