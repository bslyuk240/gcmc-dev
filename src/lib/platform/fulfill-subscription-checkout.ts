import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logPlatformAudit } from "@/lib/platform/audit";
import { addBillingMonths } from "@/lib/platform/plan-catalog";
import { notifyPlatformPaymentReceived } from "@/lib/email/notifications";
import type { HospitalBillingCycle } from "@/lib/platform/types";
import type { HospitalPlan } from "@/lib/tenant/types";

export type FulfillCheckoutResult =
  | { ok: true; alreadyProcessed: boolean; hospitalId: string }
  | { ok: false; error: string };

type CheckoutRow = {
  id: string;
  hospital_id: string;
  plan: string;
  billing_cycle: string;
  amount_kobo: number;
  paystack_reference: string;
  invoice_id: string | null;
  status: string;
};

export async function fulfillSubscriptionCheckout(
  db: SupabaseClient,
  reference: string,
  amountKobo: number,
  paidAtIso: string,
  auditMeta?: { actorId?: string; source: "webhook" | "verify" },
): Promise<FulfillCheckoutResult> {
  const { data: checkout, error: checkoutError } = await db
    .from("subscription_checkouts")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (checkoutError) {
    return { ok: false, error: checkoutError.message };
  }
  if (!checkout) {
    return { ok: false, error: "Checkout session not found." };
  }

  const row = checkout as CheckoutRow;
  if (row.status === "completed") {
    return { ok: true, alreadyProcessed: true, hospitalId: row.hospital_id };
  }

  if (Number(row.amount_kobo) !== amountKobo) {
    return { ok: false, error: "Payment amount mismatch." };
  }

  const { data: settingsRow } = await db
    .from("platform_settings")
    .select("grace_period_days")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const graceDays = Number(settingsRow?.grace_period_days ?? 7);
  const plan = row.plan as HospitalPlan;
  const billingCycle = row.billing_cycle as HospitalBillingCycle;
  const paidAt = new Date(paidAtIso);
  const periodStart = paidAt;
  const periodEnd = addBillingMonths(periodStart, billingCycle);
  const graceEnd = new Date(periodEnd);
  graceEnd.setDate(graceEnd.getDate() + graceDays);

  const periodStartDate = periodStart.toISOString().slice(0, 10);
  const periodEndDate = periodEnd.toISOString().slice(0, 10);

  if (row.invoice_id) {
    await db
      .from("platform_invoices")
      .update({
        status: "paid",
        paid_at: paidAtIso,
        payment_reference: reference,
        payment_method: "paystack",
        updated_at: paidAtIso,
      })
      .eq("id", row.invoice_id);
  }

  await db
    .from("subscription_checkouts")
    .update({ status: "completed", completed_at: paidAtIso })
    .eq("id", row.id)
    .eq("status", "pending");

  const { data: existingSub } = await db
    .from("hospital_subscriptions")
    .select("id")
    .eq("hospital_id", row.hospital_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subPatch = {
    plan,
    status: "active" as const,
    billing_cycle: billingCycle,
    trial_ends_at: null,
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    grace_period_end: graceEnd.toISOString(),
    updated_at: paidAtIso,
  };

  if (existingSub?.id) {
    await db.from("hospital_subscriptions").update(subPatch).eq("id", existingSub.id);
  } else {
    await db.from("hospital_subscriptions").insert({
      hospital_id: row.hospital_id,
      ...subPatch,
    });
  }

  await db
    .from("hospitals")
    .update({
      plan,
      status: "active",
      updated_at: paidAtIso,
    })
    .eq("id", row.hospital_id);

  await logPlatformAudit({
    action: "invoice.paid",
    actorId: auditMeta?.actorId ?? "system",
    entityType: "subscription_checkout",
    entityId: row.id,
    payload: {
      hospital_id: row.hospital_id,
      plan,
      billing_cycle: billingCycle,
      amount_kobo: amountKobo,
      reference,
      period_start: periodStartDate,
      period_end: periodEndDate,
      source: auditMeta?.source ?? "webhook",
    },
  });

  let invoiceNumber: string | null = null;
  if (row.invoice_id) {
    const { data: invoice } = await db
      .from("platform_invoices")
      .select("invoice_number")
      .eq("id", row.invoice_id)
      .maybeSingle();
    invoiceNumber = invoice?.invoice_number ? String(invoice.invoice_number) : null;
  }

  await notifyPlatformPaymentReceived({
    hospitalId: row.hospital_id,
    invoiceNumber,
    amountKobo,
    reference,
  });

  return { ok: true, alreadyProcessed: false, hospitalId: row.hospital_id };
}
