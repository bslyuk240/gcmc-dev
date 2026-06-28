import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function ItSystemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Infrastructure Settings"
        description="Hospital infrastructure controls are not managed here."
      />
      <Card className="p-6 space-y-4">
        <p className="text-sm text-slate-600">
          Backup schedules, data retention, and platform infrastructure are managed by your SaaS provider through the platform console — not by hospital IT staff.
        </p>
        <p className="text-sm text-slate-600">
          For hospital-internal technical support, use{" "}
          <Link href={`${INTERNAL_PREFIX}/it/tickets`} className="font-semibold text-[var(--accent)] hover:underline">Support Tickets</Link>
          {" "}and{" "}
          <Link href={`${INTERNAL_PREFIX}/it/chat`} className="font-semibold text-[var(--accent)] hover:underline">Chat Inbox</Link>.
        </p>
        <p className="text-sm text-slate-600">
          Access and authentication audit activity is available in{" "}
          <Link href={`${INTERNAL_PREFIX}/it/audit-logs`} className="font-semibold text-[var(--accent)] hover:underline">Audit Logs</Link>.
        </p>
      </Card>
    </div>
  );
}
