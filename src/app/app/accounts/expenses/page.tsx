"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";

type ExpenseRow = {
  id: string;
  kind: "Supplier Payment" | "Payroll";
  reference: string;
  beneficiary: string;
  amount: number;
  timestamp: string;
  status: string;
  href: string;
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Submitted: "bg-amber-50 text-amber-700",
  Approved: "bg-sky-50 text-sky-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Draft: "bg-slate-100 text-slate-500",
};

function formatExpenseTimestamp(value?: string) {
  if (!value) return "—";
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

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AccountsExpensesPage() {
  const { supplierPayments, payrollBatches, metrics } = useAccountsStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Paid">("All");

  const expenseRows = useMemo<ExpenseRow[]>(() => {
    const supplierRows = supplierPayments.map((payment) => ({
      id: `supplier-${payment.id}`,
      kind: "Supplier Payment" as const,
      reference: payment.poId,
      beneficiary: payment.supplier,
      amount: payment.amount,
      timestamp: payment.paidAt ?? payment.submittedAt,
      status: payment.status,
      href: "/app/accounts/supplier-payments",
    }));

    const payrollRows = payrollBatches.map((batch) => ({
      id: `payroll-${batch.id}`,
      kind: "Payroll" as const,
      reference: batch.period,
      beneficiary: batch.department ?? "All Departments",
      amount: batch.totalAmount,
      timestamp: batch.paidAt ?? batch.approvedAt ?? batch.preparedAt,
      status: batch.status,
      href: "/app/accounts/payroll",
    }));

    return [...supplierRows, ...payrollRows].sort((a, b) => {
      const left = new Date(a.timestamp).getTime();
      const right = new Date(b.timestamp).getTime();
      return Number.isNaN(right) || Number.isNaN(left) ? 0 : right - left;
    });
  }, [supplierPayments, payrollBatches]);

  const totalExpenses = supplierPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0)
    + payrollBatches.filter((b) => b.status === "Paid").reduce((s, b) => s + b.totalAmount, 0);

  const filteredRows = filter === "All"
    ? expenseRows
    : expenseRows.filter((row) => (filter === "Pending" ? row.status !== "Paid" : row.status === "Paid"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track supplier disbursements and payroll outflows."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/accounts/supplier-payments">
              <Button variant="ghost">Supplier Payments</Button>
            </Link>
            <Link href="/app/accounts/payroll">
              <Button>Payroll</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Pending Approvals", value: metrics.supplierPendingCount + metrics.payrollPendingCount, sub: `₦${(metrics.supplierPendingValue + metrics.payrollPendingValue).toLocaleString()} awaiting approval`, color: "text-amber-600" },
          { label: "Paid This Month", value: expenseRows.filter((r) => r.status === "Paid").length, sub: `₦${totalExpenses.toLocaleString()} disbursed`, color: "text-emerald-700" },
          { label: "Expense Entries", value: expenseRows.length, sub: "Supplier and payroll records", color: "text-slate-900" },
          { label: "Total Outflow", value: `₦${totalExpenses.toLocaleString()}`, sub: "All time paid expenses", color: "text-red-600" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {filteredRows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{row.kind}</p>
                <p className="text-xs text-slate-500">{row.beneficiary}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[row.status] ?? STATUS_STYLES.Draft}`}>
                {row.status}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <MobileMeta label="Reference" value={row.reference} />
              <MobileMeta label="Amount" value={`â‚¦${row.amount.toLocaleString()}`} />
              <MobileMeta label="Date" value={formatExpenseTimestamp(row.timestamp)} />
            </div>

            <div className="mt-4">
              <Link href={row.href} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                Open source
              </Link>
            </div>
          </Card>
        ))}
        {filteredRows.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-400">No expense records found.</Card>
        )}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Expense Ledger</h3>
            <p className="text-xs text-slate-500">Paid and pending outflows grouped from supplier payments and payroll.</p>
          </div>
          <div className="flex gap-2">
            {(["All", "Pending", "Paid"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === value
                    ? "bg-accent text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Type", "Beneficiary", "Reference", "Amount", "Date", "Status", "Action"].map((header) => (
                  <th key={header} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{row.kind}</td>
                  <td className="px-5 py-3 text-slate-700">{row.beneficiary}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.reference}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{row.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatExpenseTimestamp(row.timestamp)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[row.status] ?? STATUS_STYLES.Draft}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={row.href} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                      Open source
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Supplier requests or payroll batches are created in their source pages, then the paid disbursements appear here in the expense ledger.
      </div>
    </div>
  );
}
