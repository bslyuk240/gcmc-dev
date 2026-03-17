import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const expenses = [
  { id: "EXP-001", category: "Supplies", amount: "NGN 45,000", date: "2024-03-14", status: "approved" },
  { id: "EXP-002", category: "Equipment", amount: "NGN 120,000", date: "2024-03-10", status: "pending" },
];

export default function AccountsExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and approve expenses."
        action={<Button>Add Expense</Button>}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-3 font-semibold text-slate-500">Ref</th>
                <th className="pb-3 font-semibold text-slate-500">Category</th>
                <th className="pb-3 font-semibold text-slate-500">Amount</th>
                <th className="pb-3 font-semibold text-slate-500">Date</th>
                <th className="pb-3 font-semibold text-slate-500">Status</th>
                <th className="pb-3 text-right font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {expenses.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-mono text-xs text-slate-600">{row.id}</td>
                  <td className="py-3 font-medium text-slate-900">{row.category}</td>
                  <td className="py-3 text-slate-600">{row.amount}</td>
                  <td className="py-3 text-slate-600">{row.date}</td>
                  <td className="py-3 text-slate-600">{row.status}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="outline">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
