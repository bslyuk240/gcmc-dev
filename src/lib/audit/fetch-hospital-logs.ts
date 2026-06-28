import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditLogRow } from "@/components/audit/audit-logs-panel";

export async function fetchHospitalAuditLogs(
  hospitalId: string,
  limit = 200,
): Promise<AuditLogRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("audit_log")
    .select("id, action, entity_type, entity_id, actor_name, department, portal, ip_address, created_at")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[fetchHospitalAuditLogs]", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: String(r.id),
    action: String(r.action),
    entity_type: r.entity_type ? String(r.entity_type) : null,
    entity_id: r.entity_id ? String(r.entity_id) : null,
    actor_name: r.actor_name ? String(r.actor_name) : null,
    department: r.department ? String(r.department) : null,
    portal: String(r.portal ?? "management"),
    payload: null,
    ip_address: r.ip_address ? String(r.ip_address) : null,
    created_at: String(r.created_at),
  }));
}
