import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function ProfilePermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions & Access"
        description="Your role and system access."
      />
      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Role</p>
            <p className="mt-1 text-sm font-medium text-slate-900">—</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Department access</p>
            <p className="mt-1 text-sm text-slate-600">—</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
