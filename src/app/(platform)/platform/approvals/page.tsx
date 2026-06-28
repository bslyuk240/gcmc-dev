import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { listSignupRequestsAction } from "@/server/actions/platform/approvals";
import { PageHeader } from "@/components/platform/page-shell";
import { ApprovalsClient } from "./approvals-client";

export default async function ApprovalsPage() {
  await requirePlatformAccess();

  const [pending, reviewed] = await Promise.all([
    listSignupRequestsAction("pending"),
    listSignupRequestsAction("approved"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        subtitle="Review hospital registration requests and approve or reject them."
      />

      <ApprovalsClient
        pending={pending.success ? pending.data : []}
        recentlyApproved={reviewed.success ? reviewed.data.slice(0, 5) : []}
      />
    </div>
  );
}
