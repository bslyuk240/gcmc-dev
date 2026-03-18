import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function AccountsExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and approve expenses."
        action={<Button>Add Expense</Button>}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No records yet.</p>
        <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
      </div>
    </div>
  );
}
