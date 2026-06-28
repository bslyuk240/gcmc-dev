import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log-event";
import type { PlatformAuditAction } from "@/lib/platform/types";

export async function logPlatformAudit(input: {
  action: PlatformAuditAction;
  actorId: string;
  actorName?: string | null;
  hospitalId?: string | null;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await logAuditEvent({
    action: input.action,
    portal: "platform",
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    hospitalId: input.hospitalId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

export async function verifyPlatformAdmin(userId: string): Promise<{
  id: string;
  email: string;
  full_name: string;
} | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("staff_profiles")
    .select("id, email, full_name, role, hospital_id, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (
    profile &&
    profile.role === "platform_admin" &&
    profile.hospital_id == null &&
    profile.is_active !== false
  ) {
    return {
      id: String(profile.id),
      email: String(profile.email),
      full_name: String(profile.full_name),
    };
  }

  const { data, error } = await admin
    .from("platform_admins")
    .select("id, email, full_name, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;
  return {
    id: String(data.id),
    email: String(data.email),
    full_name: String(data.full_name),
  };
}
