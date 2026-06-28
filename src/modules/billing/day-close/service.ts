import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { paymentMethodLabel } from "@/modules/billing/mappers";
import type { DayClosureSummary } from "@/modules/billing/types";

function businessDateIso(date?: string): string {
  if (date) return date;
  return new Date().toISOString().slice(0, 10);
}

export async function getDayClosureSummary(businessDate?: string): Promise<DayClosureSummary> {
  const scoped = await createTenantAdminClient();
  const date = businessDateIso(businessDate);
  if (!scoped) {
    return {
      businessDate: date,
      status: "open",
      expectedCash: 0,
      collectedToday: 0,
      paymentCount: 0,
      byMethod: [],
    };
  }

  const { admin, hospitalId } = scoped;
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  const [{ data: closure }, { data: payments }] = await Promise.all([
    admin.from("billing_day_closures").select("*").eq("hospital_id", hospitalId).eq("business_date", date).maybeSingle(),
    admin.from("billing_payments").select("total_amount, payment_method").eq("hospital_id", hospitalId).eq("status", "posted")
      .gte("received_at", start).lte("received_at", end),
  ]);

  const byMethod = new Map<string, { amount: number; count: number }>();
  let collectedToday = 0;
  for (const payment of payments ?? []) {
    collectedToday += Number(payment.total_amount ?? 0);
    const method = paymentMethodLabel(payment.payment_method as Parameters<typeof paymentMethodLabel>[0]);
    const entry = byMethod.get(method) ?? { amount: 0, count: 0 };
    entry.amount += Number(payment.total_amount ?? 0);
    entry.count += 1;
    byMethod.set(method, entry);
  }

  const cashEntry = byMethod.get("Cash");
  const expectedCash = cashEntry?.amount ?? 0;

  if (closure) {
    return {
      id: String(closure.id),
      businessDate: date,
      status: closure.status as DayClosureSummary["status"],
      expectedCash: Number(closure.expected_cash ?? expectedCash),
      countedCash: closure.counted_cash != null ? Number(closure.counted_cash) : undefined,
      variance: closure.variance != null ? Number(closure.variance) : undefined,
      collectedToday,
      paymentCount: payments?.length ?? 0,
      byMethod: Array.from(byMethod.entries()).map(([method, stats]) => ({ method, ...stats })),
      closedAt: closure.closed_at != null ? String(closure.closed_at) : undefined,
      closedByName: closure.closed_by_name != null ? String(closure.closed_by_name) : undefined,
    };
  }

  return {
    businessDate: date,
    status: "open",
    expectedCash,
    collectedToday,
    paymentCount: payments?.length ?? 0,
    byMethod: Array.from(byMethod.entries()).map(([method, stats]) => ({ method, ...stats })),
  };
}

export async function closeBusinessDay(input: {
  businessDate?: string;
  countedCash: number;
  closedBy?: string;
  closedByName: string;
}): Promise<DayClosureSummary | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const date = businessDateIso(input.businessDate);
  const summary = await getDayClosureSummary(date);

  if (summary.status === "closed") {
    return { error: "This business day is already closed." };
  }

  const variance = Number((input.countedCash - summary.expectedCash).toFixed(2));

  const { data, error } = await admin
    .from("billing_day_closures")
    .upsert({
      hospital_id: hospitalId,
      business_date: date,
      closed_by: input.closedBy ?? null,
      closed_by_name: input.closedByName,
      closed_at: new Date().toISOString(),
      expected_cash: summary.expectedCash,
      counted_cash: input.countedCash,
      variance,
      summary_json: {
        collectedToday: summary.collectedToday,
        paymentCount: summary.paymentCount,
        byMethod: summary.byMethod,
      },
      status: "closed",
    }, { onConflict: "hospital_id,business_date" })
    .select("*")
    .single();

  if (error) {
    console.error("[closeBusinessDay]", error.message);
    return { error: error.message };
  }

  await admin.from("billing_audit_log").insert({
    hospital_id: hospitalId,
    action: "day.closed",
    entity_type: "billing_day_closure",
    entity_id: String(data.id),
    actor_id: input.closedBy ?? null,
    actor_name: input.closedByName,
    payload: { businessDate: date, countedCash: input.countedCash, variance },
  });

  return getDayClosureSummary(date);
}
