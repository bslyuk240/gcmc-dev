"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import { logPlatformAudit } from "@/lib/platform/audit";
import type { HospitalSubscription, HospitalBillingCycle } from "@/lib/platform/types";
import type { HospitalPlan } from "@/lib/tenant/types";

function mapSubscription(row: Record<string, unknown>): HospitalSubscription {
  return {
    id: String(row.id),
    hospital_id: String(row.hospital_id),
    plan: String(row.plan),
    status: row.status as HospitalSubscription["status"],
    billing_cycle: row.billing_cycle as HospitalBillingCycle,
    trial_ends_at: row.trial_ends_at ? String(row.trial_ends_at) : null,
    current_period_start: row.current_period_start ? String(row.current_period_start) : null,
    current_period_end: row.current_period_end ? String(row.current_period_end) : null,
    grace_period_end: row.grace_period_end ? String(row.grace_period_end) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getHospitalSubscriptionAction(hospitalId: string) {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data, error } = await db
      .from("hospital_subscriptions")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ? mapSubscription(data as Record<string, unknown>) : null };
  });
}

export type CreateSubscriptionInput = {
  hospital_id: string;
  plan: HospitalPlan;
  billing_cycle: HospitalBillingCycle;
  status: HospitalSubscription["status"];
  trial_days?: number;
};

export async function createHospitalSubscriptionAction(input: CreateSubscriptionInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const now = new Date();
    const trialDays = input.trial_days ?? 14;

    let trial_ends_at: string | null = null;
    let current_period_start: string | null = null;
    let current_period_end: string | null = null;

    if (input.status === "trial") {
      trial_ends_at = new Date(now.getTime() + trialDays * 86_400_000).toISOString();
    } else if (input.status === "active") {
      current_period_start = now.toISOString();
      const months = input.billing_cycle === "yearly" ? 12 : 1;
      current_period_end = new Date(
        now.getFullYear(),
        now.getMonth() + months,
        now.getDate(),
      ).toISOString();
    }

    const { data, error } = await db
      .from("hospital_subscriptions")
      .insert({
        hospital_id: input.hospital_id,
        plan: input.plan,
        status: input.status,
        billing_cycle: input.billing_cycle,
        trial_ends_at,
        current_period_start,
        current_period_end,
      })
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    await logPlatformAudit({
      action: "subscription.create",
      actorId: profile.id,
      entityType: "hospital_subscriptions",
      entityId: input.hospital_id,
      payload: { plan: input.plan, status: input.status, billing_cycle: input.billing_cycle },
    });

    return { success: true, data: mapSubscription(data as Record<string, unknown>) };
  });
}

export async function updateHospitalSubscriptionAction(
  subscriptionId: string,
  patch: Partial<Pick<HospitalSubscription, "plan" | "status" | "billing_cycle" | "notes">>,
) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data, error } = await db
      .from("hospital_subscriptions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    await logPlatformAudit({
      action: "subscription.update",
      actorId: profile.id,
      entityType: "hospital_subscriptions",
      entityId: subscriptionId,
      payload: patch as Record<string, unknown>,
    });

    return { success: true, data: mapSubscription(data as Record<string, unknown>) };
  });
}
