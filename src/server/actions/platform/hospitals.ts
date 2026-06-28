"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logPlatformAudit } from "@/lib/platform/audit";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import type { Hospital, HospitalPlan, HospitalStatus } from "@/lib/tenant/types";
import { sanitizeSettingsInput } from "@/lib/tenant/branding";
import { notifyHospitalStatusChanged } from "@/lib/email/notifications";

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function mapHospital(row: Record<string, unknown>): Hospital {
  const settings =
    row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
      ? (row.settings as Hospital["settings"])
      : {};

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    short_name: row.short_name != null ? String(row.short_name) : null,
    status: row.status as HospitalStatus,
    plan: row.plan as HospitalPlan,
    settings,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listPlatformHospitalsAction() {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data, error } = await db
      .from("hospitals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data ?? []).map((row) => mapHospital(row as Record<string, unknown>)),
    };
  });
}

export type CreateHospitalInput = {
  slug: string;
  name: string;
  short_name?: string;
  plan?: HospitalPlan;
  address?: string;
  phone?: string;
  email?: string;
};

export async function createPlatformHospitalAction(input: CreateHospitalInput) {
  return guardPlatformAction(async ({ profile }) => {
    const slug = input.slug.trim().toLowerCase();
    const name = input.name.trim();

    if (!SLUG_PATTERN.test(slug)) {
      return { success: false, error: "Invalid slug format." };
    }
    if (!name) {
      return { success: false, error: "Hospital name is required." };
    }

    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const settings = sanitizeSettingsInput({
      address: input.address,
      phone: input.phone,
      email: input.email,
    });

    const { data, error } = await db
      .from("hospitals")
      .insert({
        slug,
        name: name.slice(0, 200),
        short_name: input.short_name?.trim().slice(0, 20) ?? null,
        plan: input.plan ?? "standard",
        status: "provisioning",
        settings,
      })
      .select("*")
      .single();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        return { success: false, error: "Slug already in use." };
      }
      return { success: false, error: error.message };
    }

    const hospital = mapHospital(data as Record<string, unknown>);

    await logPlatformAudit({
      action: "hospital.create",
      actorId: profile.id,
      entityType: "hospital",
      entityId: hospital.id,
      payload: { slug: hospital.slug, name: hospital.name },
    });

    return { success: true, data: hospital };
  });
}

export async function getPlatformHospitalAction(hospitalId: string) {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data, error } = await db
      .from("hospitals")
      .select("*")
      .eq("id", hospitalId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Hospital not found." };

    return { success: true, data: mapHospital(data as Record<string, unknown>) };
  });
}

export async function updatePlatformHospitalStatusAction(
  hospitalId: string,
  status: HospitalStatus,
) {
  return guardPlatformAction(async ({ profile }) => {
    if (!["active", "suspended", "provisioning"].includes(status)) {
      return { success: false, error: "Invalid status." };
    }

    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const patch: Record<string, unknown> = { status };
    if (status === "suspended") {
      patch.sessions_revoked_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from("hospitals")
      .update(patch)
      .eq("id", hospitalId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    const hospital = mapHospital(data as Record<string, unknown>);

    await logPlatformAudit({
      action: status === "suspended" ? "hospital.suspend" : "hospital.activate",
      actorId: profile.id,
      entityType: "hospital",
      entityId: hospital.id,
      payload: { status },
    });

    await notifyHospitalStatusChanged({ hospitalId: hospital.id, status });

    return { success: true, data: hospital };
  });
}
