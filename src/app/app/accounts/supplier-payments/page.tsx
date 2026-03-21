"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { updateSupplierPaymentStatus, type SupplierPayment } from "@/lib/data/accounts-store";

function toStr(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v: { name?: string; qty?: string; quantity?: string }) => `${v.name ?? ""}${v.qty || v.quantity ? ` × ${v.qty ?? v.quantity}` : ""}`).join(", ");
  return value != null ? String(value) : "—";
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-sky-50 text-sky-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

function formatSupplierTimestamp(value?: string) {
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

export default function AccountsSupplierPaymentsPage() {
  const { supplierPayments, metrics } = useAccountsStore();

  const [actionTarget, setActionTarget] = useState<{ payment: SupplierPayment; action: "approve" | "pay" | "reject" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  // Optimistic local state — key: id, value: new status
  const [optimisticStatuses, setOptimisticStatuses] = useState<Map<string, string>>(new Map());

  function effectiveStatus(p: SupplierPayment) {
    return optimisticStatuses.get(p.id) ?? p.status;
  }

  function handleAction() {
    if (!actionTarget) return;
    const { payment, action } = actionTarget;
    if (action === "approve") {
      // Instant optimistic update
      setOptimisticStatuses((prev) => new Map([...prev, [payment.id, "Approved"]]));
      setToast({ message: `Payment for ${payment.supplier} approved.`, type: "success" });
      updateSupplierPaymentStatus(payment.id, "Approved");
      window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
    } else if (action === "pay") {
      const paidAt = new Date().toISOString();
      // Instant optimistic update
      setOptimisticStatuses((prev) => new Map([...prev, [payment.id, "Paid"]]));
      setToast({ message: `₦${payment.amount.toLocaleString()} paid to ${payment.supplier}.`, type: "success" });
      updateSupplierPaymentStatus(payment.id, "Paid", { paidAt });
      window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
    } else {
      // Instant optimistic update
      setOptimisticStatuses((prev) => new Map([...prev, [payment.id, "Rejected"]]));
      setToast({ message: `Payment to ${payment.supplier} rejected.`, type: "info" });
      updateSupplierPaymentStatus(payment.id, "Rejected");
      window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
    }
    setActionTarget(null);
    setRejectReason("");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Payments"
        description="Payment requests from Store procurement. Approve and disburse supplier invoices."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Approval", value: metrics.supplierPendingCount, sub: `₦${metrics.supplierPendingValue.toLocaleString()} to process`, color: "text-amber-600" },
          { label: "Paid This Month", value: supplierPayments.filter((p) => p.status === "Paid").length, sub: `₦${metrics.supplierPaidMTD.toLocaleString()} disbursed`, color: "text-emerald-700" },
          { label: "Total Requests", value: supplierPayments.length, sub: "All time", color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Supplier Payment Requests</h3>
          <p className="text-xs text-slate-500 mt-0.5">Submitted by Store after goods are received. Approve → then Pay to disburse funds to supplier.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["PO #", "Supplier", "Items", "Description", "Amount", "Due Date", "Submitted", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplierPayments.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${effectiveStatus(p) === "Pending" ? "bg-amber-50/20" : ""}`}>
                  <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">{p.poId}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{p.supplier}</td>
                  <td className="px-5 py-3 text-slate-600">{toStr(p.items)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-[180px] truncate">{toStr(p.description)}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{p.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-600">{formatSupplierTimestamp(p.dueDate)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatSupplierTimestamp(p.submittedAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[effectiveStatus(p)]}`}>{effectiveStatus(p)}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {effectiveStatus(p) === "Pending" && (
                        <>
                          <Button size="sm" onClick={() => setActionTarget({ payment: p, action: "approve" })}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setActionTarget({ payment: p, action: "reject" }); setRejectReason(""); }}>Reject</Button>
                        </>
                      )}
                      {effectiveStatus(p) === "Approved" && (
                        <Button size="sm" onClick={() => setActionTarget({ payment: p, action: "pay" })}>
                          Pay Supplier
                        </Button>
                      )}
                      {effectiveStatus(p) === "Paid" && (
                        <span className="text-xs font-semibold text-emerald-700">✓ Paid {formatSupplierTimestamp(p.paidAt)}</span>
                      )}
                      {effectiveStatus(p) === "Rejected" && (
                        <span className="text-xs text-slate-400">Rejected</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {supplierPayments.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No supplier payment requests yet. Store submits these when POs are received.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Store creates purchase order → marks received → submits payment request → appears here → Accounts approves → Accounts pays supplier.
      </div>

      {/* Action modal */}
      <Modal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={
          actionTarget?.action === "approve" ? "Approve Supplier Payment"
          : actionTarget?.action === "pay" ? "Pay Supplier"
          : "Reject Payment Request"
        }
      >
        {actionTarget && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span className="font-semibold">{actionTarget.payment.supplier}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">PO Reference</span><span>{actionTarget.payment.poId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Submitted</span><span className="text-slate-700">{formatSupplierTimestamp(actionTarget.payment.submittedAt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Due Date</span><span className="text-slate-700">{formatSupplierTimestamp(actionTarget.payment.dueDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Description</span><span className="text-right text-xs">{toStr(actionTarget.payment.description)}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-slate-600">Amount</span><span className="font-bold text-xl text-slate-900">₦{actionTarget.payment.amount.toLocaleString()}</span></div>
            </div>
            {actionTarget.action === "pay" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                ✓ This will mark the payment as disbursed to the supplier and close the request.
              </div>
            )}
            {actionTarget.action === "reject" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
                <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this being rejected?" className={inputCls} />
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button
            size="md"
            className={actionTarget?.action === "reject" ? "bg-red-600 text-white hover:opacity-95" : ""}
            onClick={handleAction}
          >
            {actionTarget?.action === "approve" ? "Approve Payment"
              : actionTarget?.action === "pay" ? "Confirm Payment Sent"
              : "Reject"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
