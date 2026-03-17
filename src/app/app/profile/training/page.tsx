import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function ProfileTrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Training & Compliance"
        description="Completed training and compliance records."
      />
      <Card>
        <p className="text-sm text-slate-600">No training records yet.</p>
      </Card>
    </div>
  );
}
