import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function ProfileEmploymentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employment Info"
        description="Your job details, department, and contract information."
      />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {["Job title", "Department", "Start date", "Contract type", "Manager", "Work location"].map((label) => (
            <div key={label}>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-medium text-slate-900">—</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
