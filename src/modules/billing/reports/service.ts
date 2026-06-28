import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { paymentMethodLabel } from "@/modules/billing/mappers";
import type { BillingReportSummary } from "@/modules/billing/types";

function parseRange(start?: string, end?: string): { start: string; end: string; label: string } {
  const startIso = start ? `${start}T00:00:00.000Z` : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const endIso = end ? `${end}T23:59:59.999Z` : new Date().toISOString();
  const label = start && end && start !== end ? `${start} to ${end}` : (start ?? new Date().toISOString().slice(0, 10));
  return { start: startIso, end: endIso, label };
}

export async function getBillingReportSummary(input?: {
  start?: string;
  end?: string;
}): Promise<BillingReportSummary> {
  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return {
      rangeLabel: "—",
      revenue: 0,
      outflows: 0,
      net: 0,
      byDepartment: [],
      byMethod: [],
      openBalance: 0,
      openCount: 0,
    };
  }

  const { admin, hospitalId } = scoped;
  const range = parseRange(input?.start, input?.end);

  const { data: payments } = await admin
    .from("billing_payments")
    .select("id, total_amount, payment_method, received_at")
    .eq("hospital_id", hospitalId)
    .eq("status", "posted")
    .gte("received_at", range.start)
    .lte("received_at", range.end);

  const paymentIds = (payments ?? []).map((p) => p.id as string);
  let byDepartment = new Map<string, { amount: number; count: number }>();
  const byMethod = new Map<string, { amount: number; count: number }>();

  for (const payment of payments ?? []) {
    const method = paymentMethodLabel(payment.payment_method as Parameters<typeof paymentMethodLabel>[0]);
    const methodEntry = byMethod.get(method) ?? { amount: 0, count: 0 };
    methodEntry.amount += Number(payment.total_amount ?? 0);
    methodEntry.count += 1;
    byMethod.set(method, methodEntry);
  }

  if (paymentIds.length) {
    const { data: allocs } = await admin
      .from("billing_payment_allocations")
      .select("amount, billing_charge_lines(department)")
      .in("payment_id", paymentIds);

    for (const alloc of allocs ?? []) {
      const dept = (alloc.billing_charge_lines as { department?: string } | null)?.department ?? "other";
      const entry = byDepartment.get(dept) ?? { amount: 0, count: 0 };
      entry.amount += Number(alloc.amount ?? 0);
      entry.count += 1;
      byDepartment.set(dept, entry);
    }
  }

  const revenue = (payments ?? []).reduce((sum, p) => sum + Number(p.total_amount ?? 0), 0);

  const [{ data: supplierPaid }, { data: payrollPaid }, { data: openLines }] = await Promise.all([
    admin.from("supplier_payments").select("amount").eq("hospital_id", hospitalId).eq("status", "Paid")
      .gte("paid_at", range.start).lte("paid_at", range.end),
    admin.from("payroll_batches").select("total_amount").eq("hospital_id", hospitalId).eq("status", "Paid")
      .gte("paid_at", range.start).lte("paid_at", range.end),
    admin.from("billing_charge_lines").select("total_amount, amount_paid, amount_waived")
      .eq("hospital_id", hospitalId).in("status", ["open", "partial"]),
  ]);

  const outflows =
    (supplierPaid ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0) +
    (payrollPaid ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

  const openBalance = (openLines ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.total_amount ?? 0) - Number(row.amount_paid ?? 0) - Number(row.amount_waived ?? 0)),
    0,
  );

  return {
    rangeLabel: range.label,
    revenue,
    outflows,
    net: revenue - outflows,
    byDepartment: Array.from(byDepartment.entries()).map(([department, stats]) => ({ department, ...stats })),
    byMethod: Array.from(byMethod.entries()).map(([method, stats]) => ({ method, ...stats })),
    openBalance,
    openCount: openLines?.length ?? 0,
  };
}
