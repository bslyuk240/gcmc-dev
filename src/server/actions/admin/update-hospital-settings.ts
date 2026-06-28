"use server";

import { getServerSession } from "@/lib/auth/session";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import {
  hospitalToBranding,
  sanitizeSettingsInput,
  type HospitalSettingsInput,
  type TenantBranding,
} from "@/lib/tenant/branding";
import { logAuditEvent } from "@/lib/audit/log-event";

export type UpdateHospitalSettingsInput = {
  name?: string;
  short_name?: string;
  settings?: HospitalSettingsInput;
};

export type UpdateHospitalSettingsResult =
  | { success: true; branding: TenantBranding }
  | { success: false; error: string };

export async function updateHospitalSettingsAction(
  input: UpdateHospitalSettingsInput,
): Promise<UpdateHospitalSettingsResult> {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Admin access required." };
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return { success: false, error: "Service not configured." };
  }

  const { admin, hospitalId } = scoped;

  if (session.hospital_id && session.hospital_id !== hospitalId) {
    return { success: false, error: "Tenant mismatch." };
  }

  const { data: existing, error: fetchError } = await admin
    .from("hospitals")
    .select("*")
    .eq("id", hospitalId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { success: false, error: fetchError?.message ?? "Hospital not found." };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { success: false, error: "Hospital name is required." };
    patch.name = name.slice(0, 200);
  }

  if (input.short_name !== undefined) {
    const short = input.short_name.trim();
    patch.short_name = short ? short.slice(0, 20) : null;
  }

  if (input.settings) {
    const currentSettings =
      existing.settings && typeof existing.settings === "object" && !Array.isArray(existing.settings)
        ? (existing.settings as Record<string, unknown>)
        : {};
    const sanitized = sanitizeSettingsInput(input.settings);
    patch.settings = { ...currentSettings, ...sanitized };
  }

  const { data: updated, error: updateError } = await admin
    .from("hospitals")
    .update(patch)
    .eq("id", hospitalId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return { success: false, error: updateError?.message ?? "Update failed." };
  }

  await logAuditEvent({
    action: "hospital.settings.update",
    portal: "management",
    actorId: session.staff_id,
    actorName: session.full_name,
    hospitalId,
    department: session.department,
    entityType: "hospital",
    entityId: hospitalId,
    payload: {
      role: session.role,
      fields: Object.keys(patch).filter((k) => k !== "updated_at"),
    },
  });

  const row = updated as Record<string, unknown>;
  const branding = hospitalToBranding({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    short_name: row.short_name != null ? String(row.short_name) : null,
    status: row.status as "active" | "suspended" | "provisioning",
    plan: row.plan as "starter" | "standard" | "enterprise",
    settings:
      row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
        ? (row.settings as import("@/lib/tenant/types").HospitalSettings)
        : {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  });

  return { success: true, branding };
}

export async function removeHospitalLogoAction(): Promise<UpdateHospitalSettingsResult> {
  return updateHospitalSettingsAction({ settings: { logo_url: null } });
}
