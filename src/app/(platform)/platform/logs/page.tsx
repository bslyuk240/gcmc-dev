import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { PageHeader } from "@/components/platform/page-shell";
import { LogsClient } from "./logs-client";

export default async function AuditLogsPage() {
  await requirePlatformAccess();

  const admin = createAdminClient();
  const { data: rawLogs } = admin
    ? await admin
        .from("platform_audit_log")
        .select(
          "id, action, entity_type, entity_id, payload, actor_id, actor_name, hospital_id, portal, department, ip_address, created_at, hospitals(name, slug)",
        )
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] };

  const actorIds = [
    ...new Set(
      (rawLogs ?? [])
        .filter((r) => r.actor_id && !r.actor_name)
        .map((r) => r.actor_id),
    ),
  ];

  let actorNames: Record<string, string> = {};
  if (admin && actorIds.length > 0) {
    const { data: profiles } = await admin
      .from("staff_profiles")
      .select("id, full_name, email")
      .in("id", actorIds as string[]);
    actorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? String(p.id).slice(0, 8)]),
    );
  }

  const logs = (rawLogs ?? []).map((r) => {
    const hospitalJoined = r.hospitals as { name: string; slug: string } | { name: string; slug: string }[] | null;
    const hospitalRow = Array.isArray(hospitalJoined) ? hospitalJoined[0] : hospitalJoined;
    const actorId = r.actor_id ? String(r.actor_id) : null;
    const storedName = r.actor_name ? String(r.actor_name) : null;
    return {
      id: String(r.id),
      action: String(r.action),
      entity_type: r.entity_type ? String(r.entity_type) : null,
      entity_id: r.entity_id ? String(r.entity_id) : null,
      payload: r.payload
        ? typeof r.payload === "string"
          ? r.payload
          : JSON.stringify(r.payload)
        : null,
      actor_id: actorId,
      actor_name: storedName ?? (actorId ? (actorNames[actorId] ?? null) : null),
      hospital_id: r.hospital_id ? String(r.hospital_id) : null,
      hospital_name: hospitalRow?.name ?? null,
      hospital_slug: hospitalRow?.slug ?? null,
      portal: r.portal ? String(r.portal) : "platform",
      department: r.department ? String(r.department) : null,
      ip_address: r.ip_address ? String(r.ip_address) : null,
      created_at: String(r.created_at),
    };
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="All activity across platform admin, hospital management (/app), and staff portal (/staff)."
      />
      <LogsClient logs={logs} />
    </div>
  );
}
