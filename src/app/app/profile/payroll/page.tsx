import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function ProfilePayrollPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Payslips and payment history."
      />
      <Card>
        <p className="text-sm text-slate-600">Payslips will appear here.</p>
      </Card>
    </div>
  );
}
