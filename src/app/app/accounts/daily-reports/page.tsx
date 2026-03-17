import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountsDailyReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Daily and periodic financial reports."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-hover">
          <h3 className="font-bold text-slate-900">Daily Summary</h3>
          <p className="mt-1 text-sm text-slate-500">Revenue, payments, and outstanding for the day.</p>
          <Button variant="outline" size="sm" className="mt-4">Generate</Button>
        </Card>
        <Card className="card-hover">
          <h3 className="font-bold text-slate-900">Monthly Revenue</h3>
          <p className="mt-1 text-sm text-slate-500">Trend and breakdown by department.</p>
          <Button variant="outline" size="sm" className="mt-4">Generate</Button>
        </Card>
        <Card className="card-hover">
          <h3 className="font-bold text-slate-900">Outstanding Invoices</h3>
          <p className="mt-1 text-sm text-slate-500">Aged receivables report.</p>
          <Button variant="outline" size="sm" className="mt-4">Generate</Button>
        </Card>
      </div>
    </div>
  );
}
