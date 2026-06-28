import { requireSession } from "@/lib/auth/session";
import { fetchHospitalAuditLogs } from "@/lib/audit/fetch-hospital-logs";
import { AuditLogsPanel } from "@/components/audit/audit-logs-panel";

export default async function ITAuditLogsPage() {
  const session = await requireSession();
  const logs = await fetchHospitalAuditLogs(session.hospital_id);
  return <AuditLogsPanel scope="it" logs={logs} />;
}
