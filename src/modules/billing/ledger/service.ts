import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapChargeLine, mapAllocation, mapPayment } from "@/modules/billing/mappers";
import type {
  BillingChargeLine,
  BillingLedgerEntry,
  CashDeskQueue,
  PatientLedgerSummary,
  PatientSearchResult,
} from "@/modules/billing/types";

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getCashDeskQueue(input?: {
  department?: string;
  patientId?: string;
}): Promise<CashDeskQueue> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { lines: [], totals: { openCount: 0, openBalance: 0, collectedToday: 0, collectedCount: 0 } };

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("billing_charge_lines")
    .select("*")
    .eq("hospital_id", hospitalId)
    .in("status", ["open", "partial"])
    .order("billable_at", { ascending: false });

  if (input?.department) query = query.eq("department", input.department);
  if (input?.patientId) query = query.eq("patient_id", input.patientId);

  const { data: lines, error } = await query;
  if (error) {
    console.error("[getCashDeskQueue]", error.message);
    return { lines: [], totals: { openCount: 0, openBalance: 0, collectedToday: 0, collectedCount: 0 } };
  }

  const mapped = (lines ?? []).map((row) => mapChargeLine(row as Record<string, unknown>));
  const openBalance = mapped.reduce((sum, line) => sum + line.balanceDue, 0);

  const todayStart = todayStartIso();
  const { data: paymentsToday } = await admin
    .from("billing_payments")
    .select("total_amount")
    .eq("hospital_id", hospitalId)
    .eq("status", "posted")
    .gte("received_at", todayStart);

  const collectedToday = (paymentsToday ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

  return {
    lines: mapped,
    totals: {
      openCount: mapped.length,
      openBalance,
      collectedToday,
      collectedCount: paymentsToday?.length ?? 0,
    },
  };
}

export async function searchPatientsWithOpenBalance(query: string): Promise<PatientSearchResult[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("billing_charge_lines")
    .select("patient_id, patient_name, total_amount, amount_paid, amount_waived, billable_at")
    .eq("hospital_id", hospitalId)
    .in("status", ["open", "partial"]);

  if (error) {
    console.error("[searchPatientsWithOpenBalance]", error.message);
    return [];
  }

  const q = query.trim().toLowerCase();
  const byPatient = new Map<string, PatientSearchResult>();

  for (const row of data ?? []) {
    const patientId = String(row.patient_id ?? "");
    const patientName = String(row.patient_name ?? "Unknown");
    if (q && !patientName.toLowerCase().includes(q) && !patientId.toLowerCase().includes(q)) continue;

    const balance = Math.max(
      0,
      Number(row.total_amount ?? 0) - Number(row.amount_paid ?? 0) - Number(row.amount_waived ?? 0),
    );
    const existing = byPatient.get(patientId) ?? {
      patientId,
      patientName,
      openBalance: 0,
      openCount: 0,
      lastBillableAt: undefined,
    };
    existing.openBalance += balance;
    existing.openCount += 1;
    const billableAt = String(row.billable_at ?? "");
    if (!existing.lastBillableAt || billableAt > existing.lastBillableAt) {
      existing.lastBillableAt = billableAt;
    }
    byPatient.set(patientId, existing);
  }

  return Array.from(byPatient.values())
    .filter((p) => p.openCount > 0)
    .sort((a, b) => b.openBalance - a.openBalance);
}

export async function getPatientLedger(patientId: string): Promise<PatientLedgerSummary | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { admin, hospitalId } = scoped;

  const { data: chargeRows, error: chargeError } = await admin
    .from("billing_charge_lines")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("patient_id", patientId)
    .order("billable_at", { ascending: false });

  if (chargeError) {
    console.error("[getPatientLedger]", chargeError.message);
    return null;
  }

  const charges = (chargeRows ?? []).map((row) => mapChargeLine(row as Record<string, unknown>));
  if (!charges.length) return null;

  const patientName = charges[0]?.patientName ?? "Unknown";
  const openLines = charges.filter((c) => c.status === "open" || c.status === "partial");
  const openBalance = openLines.reduce((sum, c) => sum + c.balanceDue, 0);

  const todayStart = todayStartIso();
  const { data: paymentRows } = await admin
    .from("billing_payments")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("patient_id", patientId)
    .gte("received_at", todayStart)
    .order("received_at", { ascending: false });

  const payments: BillingLedgerEntry[] = [];
  for (const row of paymentRows ?? []) {
    const payment = mapPayment(row as Record<string, unknown>);
    const { data: allocRows } = await admin
      .from("billing_payment_allocations")
      .select("*, billing_charge_lines(description, patient_name)")
      .eq("payment_id", payment.id);

    payments.push({
      ...payment,
      allocations: (allocRows ?? []).map((alloc) => {
        const chargeMeta = alloc.billing_charge_lines as { description?: string; patient_name?: string } | null;
        return mapAllocation({
          ...(alloc as Record<string, unknown>),
          charge_description: chargeMeta?.description,
          patient_name: chargeMeta?.patient_name,
        });
      }),
    });
  }

  const paidToday = payments.reduce((sum, p) => sum + p.totalAmount, 0);

  return {
    patientId,
    patientName,
    openBalance,
    openCount: openLines.length,
    paidToday,
    charges,
    payments,
  };
}

export async function getBillingLedger(input?: {
  start?: string;
  end?: string;
  limit?: number;
}): Promise<BillingLedgerEntry[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("billing_payments")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("status", "posted")
    .order("received_at", { ascending: false })
    .limit(input?.limit ?? 200);

  if (input?.start) query = query.gte("received_at", input.start);
  if (input?.end) query = query.lte("received_at", input.end);

  const { data: paymentRows, error } = await query;
  if (error) {
    console.error("[getBillingLedger]", error.message);
    return [];
  }

  const entries: BillingLedgerEntry[] = [];
  for (const row of paymentRows ?? []) {
    const payment = mapPayment(row as Record<string, unknown>);
    const { data: allocRows } = await admin
      .from("billing_payment_allocations")
      .select("*, billing_charge_lines(description, patient_name, department)")
      .eq("payment_id", payment.id);

    entries.push({
      ...payment,
      allocations: (allocRows ?? []).map((alloc) => {
        const chargeMeta = alloc.billing_charge_lines as {
          description?: string;
          patient_name?: string;
          department?: string;
        } | null;
        return mapAllocation({
          ...(alloc as Record<string, unknown>),
          charge_description: chargeMeta?.description,
          patient_name: chargeMeta?.patient_name,
        });
      }),
    });
  }

  return entries;
}

export async function getOpenChargeLinesForPatient(patientId: string): Promise<BillingChargeLine[]> {
  const queue = await getCashDeskQueue({ patientId });
  return queue.lines;
}
