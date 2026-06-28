import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditPortal = "platform" | "management" | "staff" | "hospital";

export type AuditEventInput = {
  action: string;
  portal: AuditPortal;
  actorId?: string | null;
  actorName?: string | null;
  hospitalId?: string | null;
  department?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function auditIpFromRequest(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export function auditUserAgentFromRequest(request: Request): string | null {
  return request.headers.get("user-agent");
}

/** Central audit writer — all portals log here for the platform admin dashboard. */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("platform_audit_log").insert({
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    hospital_id: input.hospitalId ?? null,
    portal: input.portal,
    department: input.department ?? null,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    payload: input.payload ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (input.hospitalId) {
    const { error } = await admin.from("audit_log").insert({
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      hospital_id: input.hospitalId,
      actor_id: input.actorId ?? null,
      payload: {
        ...(input.payload ?? {}),
        portal: input.portal,
        department: input.department ?? null,
        actor_name: input.actorName ?? null,
      },
    });
    if (error) {
      // Tenant audit_log may be unavailable on older schemas — platform log is authoritative.
      console.warn("[logAuditEvent] audit_log mirror skipped:", error.message);
    }
  }
}
