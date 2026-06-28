"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import { logPlatformAudit } from "@/lib/platform/audit";

// Generic upsert helper — keeps a single settings row
async function upsertSettings(db: ReturnType<typeof createAdminClient>, patch: Record<string, unknown>, actorId: string) {
  if (!db) return { error: { message: "Service not configured." } };
  const { data: existing } = await db.from("platform_settings").select("id").limit(1).maybeSingle();
  const payload = { ...patch, updated_at: new Date().toISOString(), updated_by: actorId };
  if (existing?.id) {
    return db.from("platform_settings").update(payload).eq("id", existing.id);
  }
  return db.from("platform_settings").insert(payload);
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
export type UpdatePricingInput = {
  pricing_starter_monthly_kobo: number;
  pricing_standard_monthly_kobo: number;
  pricing_enterprise_monthly_kobo: number;
  trial_days: number;
  grace_period_days: number;
};

export async function updatePlatformSettingsAction(input: UpdatePricingInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (input.trial_days < 0 || input.grace_period_days < 0)
      return { success: false, error: "Days values must be non-negative." };
    if (input.pricing_starter_monthly_kobo <= 0 || input.pricing_standard_monthly_kobo <= 0)
      return { success: false, error: "Pricing must be greater than zero." };
    const { error } = await upsertSettings(db, input as unknown as Record<string, unknown>, profile.id);
    if (error) return { success: false, error: error.message };
    await logPlatformAudit({ action: "settings.update", actorId: profile.id, entityType: "platform_settings", payload: { section: "pricing" } });
    return { success: true, data: null };
  });
}

// ─── General ─────────────────────────────────────────────────────────────────
export type UpdateGeneralInput = {
  platform_name: string;
  platform_url?: string;
  platform_currency: string;
  platform_timezone: string;
  platform_date_fmt: string;
  notif_new_tenant: boolean;
  notif_payment: boolean;
  notif_sub_expiring: boolean;
  notif_system_alerts: boolean;
  notif_weekly_report: boolean;
};

export async function updateGeneralSettingsAction(input: UpdateGeneralInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    const { error } = await upsertSettings(db, input as unknown as Record<string, unknown>, profile.id);
    if (error) return { success: false, error: error.message };
    await logPlatformAudit({ action: "settings.update", actorId: profile.id, entityType: "platform_settings", payload: { section: "general" } });
    return { success: true, data: null };
  });
}

// ─── Email ────────────────────────────────────────────────────────────────────
export type UpdateEmailSettingsInput = {
  email_from_name: string;
  email_from_address: string;
  email_reply_to?: string;
};

export async function updateEmailSettingsAction(input: UpdateEmailSettingsInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    const { error } = await upsertSettings(db, input as unknown as Record<string, unknown>, profile.id);
    if (error) return { success: false, error: error.message };
    await logPlatformAudit({ action: "settings.update", actorId: profile.id, entityType: "platform_settings", payload: { section: "email" } });
    return { success: true, data: null };
  });
}

// ─── Security ─────────────────────────────────────────────────────────────────
export type UpdateSecurityInput = {
  session_timeout_minutes: number;
  password_min_length: number;
  require_2fa: boolean;
};

export async function updateSecuritySettingsAction(input: UpdateSecurityInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    const { error } = await upsertSettings(db, input as unknown as Record<string, unknown>, profile.id);
    if (error) return { success: false, error: error.message };
    await logPlatformAudit({ action: "settings.update", actorId: profile.id, entityType: "platform_settings", payload: { section: "security" } });
    return { success: true, data: null };
  });
}

// ─── Payment Gateways ─────────────────────────────────────────────────────────
export type UpdatePaymentInput = { paystack_public_key?: string };

export async function updatePaymentSettingsAction(input: UpdatePaymentInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    const { error } = await upsertSettings(db, input as unknown as Record<string, unknown>, profile.id);
    if (error) return { success: false, error: error.message };
    await logPlatformAudit({ action: "settings.update", actorId: profile.id, entityType: "platform_settings", payload: { section: "payment" } });
    return { success: true, data: null };
  });
}
