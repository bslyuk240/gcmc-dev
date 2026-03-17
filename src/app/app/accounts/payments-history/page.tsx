import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

const payments = [
  { date: "2024-03-15", invoiceId: "INV-0081", patient: "Mary Ibrahim", amount: "NGN 36,000", method: "card" as const, status: "completed" as const },
  { date: "2024-03-14", invoiceId: "INV-0080", patient: "John Doe", amount: "NGN 24,000", method: "cash" as const, status: "completed" as const },
];

export default function AccountsPaymentsHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="All received payments and methods."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Payments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">NGN 1.2M</p>
        </Card>
        <Card className="card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Payments</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">NGN 96,500</p>
        </Card>
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search..."
            className="min-w-[200px] rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-3 font-semibold text-slate-500">Date</th>
                <th className="pb-3 font-semibold text-slate-500">Invoice ID</th>
                <th className="pb-3 font-semibold text-slate-500">Patient</th>
                <th className="pb-3 font-semibold text-slate-500">Amount</th>
                <th className="pb-3 font-semibold text-slate-500">Method</th>
                <th className="pb-3 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.map((row, i) => (
                <tr key={i}>
                  <td className="py-3 text-slate-600">{row.date}</td>
                  <td className="py-3 font-mono text-xs text-slate-600">{row.invoiceId}</td>
                  <td className="py-3 font-medium text-slate-900">{row.patient}</td>
                  <td className="py-3 text-slate-600">{row.amount}</td>
                  <td className="py-3 text-slate-600">{row.method}</td>
                  <td className="py-3">
                    <StatusBadge variant="success">{row.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="outline" size="sm">Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </Card>
    </div>
  );
}
