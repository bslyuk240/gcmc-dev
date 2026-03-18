import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

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
          <p className="mt-1 text-2xl font-bold text-slate-900">—</p>
        </Card>
        <Card className="card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Payments</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">—</p>
        </Card>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No records yet.</p>
        <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
      </div>
    </div>
  );
}
