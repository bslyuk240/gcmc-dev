"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logPlatformAudit } from "@/lib/platform/audit";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import { planMonthlyAmountKobo } from "@/lib/platform/pricing";
import {
  notifyPlatformInvoiceSent,
  notifyPlatformPaymentReceived,
} from "@/lib/email/notifications";
import type {
  PlatformBillingSummary,
  PlatformInvoice,
  PlatformInvoiceStatus,
  PlatformPaymentMethod,
} from "@/lib/platform/billing-types";
import type { HospitalPlan } from "@/lib/tenant/types";

const VALID_PAYMENT_METHODS: PlatformPaymentMethod[] = [
  "bank_transfer",
  "cash",
  "cheque",
  "other",
  "paystack",
];

function parseDate(value: string, field: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

function mapInvoice(
  row: Record<string, unknown>,
  hospital?: { name: string; slug: string } | null,
): PlatformInvoice {
  return {
    id: String(row.id),
    invoice_number: String(row.invoice_number),
    hospital_id: String(row.hospital_id),
    hospital_name: hospital?.name,
    hospital_slug: hospital?.slug,
    plan: row.plan as HospitalPlan,
    period_start: String(row.period_start).slice(0, 10),
    period_end: String(row.period_end).slice(0, 10),
    amount_kobo: Number(row.amount_kobo),
    currency: String(row.currency ?? "NGN"),
    status: row.status as PlatformInvoiceStatus,
    due_date: String(row.due_date).slice(0, 10),
    paid_at: row.paid_at != null ? String(row.paid_at) : null,
    payment_reference: row.payment_reference != null ? String(row.payment_reference) : null,
    payment_method: row.payment_method as PlatformPaymentMethod | null,
    notes: row.notes != null ? String(row.notes) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function syncOverdueInvoices(db: ReturnType<typeof createAdminClient>): Promise<void> {
  if (!db) return;

  const today = new Date().toISOString().slice(0, 10);
  await db
    .from("platform_invoices")
    .update({ status: "overdue", updated_at: new Date().toISOString() })
    .in("status", ["sent"])
    .lt("due_date", today);
}

export async function listPlatformInvoicesAction(hospitalId?: string) {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    await syncOverdueInvoices(db);

    let query = db
      .from("platform_invoices")
      .select("*, hospitals(name, slug)")
      .order("created_at", { ascending: false });

    if (hospitalId) {
      query = query.eq("hospital_id", hospitalId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const invoices = (data ?? []).map((row) => {
      const hospitalRow = row.hospitals as { name: string; slug: string } | null;
      const { hospitals: _h, ...invoiceRow } = row as Record<string, unknown> & {
        hospitals?: { name: string; slug: string } | null;
      };
      return mapInvoice(invoiceRow, hospitalRow);
    });

    return { success: true, data: invoices };
  });
}

export async function getPlatformBillingSummaryAction() {
  return guardPlatformAction(async (): Promise<
    | { success: true; data: PlatformBillingSummary }
    | { success: false; error: string }
  > => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    await syncOverdueInvoices(db);

    const { data, error } = await db
      .from("platform_invoices")
      .select("status, amount_kobo, paid_at");

    if (error) return { success: false, error: error.message };

    const rows = data ?? [];
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    let outstanding_count = 0;
    let overdue_count = 0;
    let outstanding_kobo = 0;
    let paid_this_month_kobo = 0;

    for (const row of rows) {
      const status = String(row.status);
      const amount = Number(row.amount_kobo);

      if (status === "sent" || status === "overdue") {
        outstanding_count += 1;
        outstanding_kobo += amount;
        if (status === "overdue") overdue_count += 1;
      }

      if (status === "paid" && row.paid_at) {
        const paidAt = new Date(String(row.paid_at));
        if (paidAt >= monthStart) {
          paid_this_month_kobo += amount;
        }
      }
    }

    return {
      success: true,
      data: {
        outstanding_count,
        overdue_count,
        paid_this_month_kobo,
        outstanding_kobo,
      },
    };
  });
}

export async function getPlatformInvoiceAction(invoiceId: string) {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    await syncOverdueInvoices(db);

    const { data, error } = await db
      .from("platform_invoices")
      .select("*, hospitals(name, slug)")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Invoice not found." };

    const hospitalRow = data.hospitals as { name: string; slug: string } | null;
    const { hospitals: _h, ...invoiceRow } = data as Record<string, unknown> & {
      hospitals?: { name: string; slug: string } | null;
    };

    return { success: true, data: mapInvoice(invoiceRow, hospitalRow) };
  });
}

export type CreatePlatformInvoiceInput = {
  hospital_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  notes?: string;
  send?: boolean;
};

export async function createPlatformInvoiceAction(input: CreatePlatformInvoiceInput) {
  return guardPlatformAction(async ({ profile }) => {
    const hospitalId = input.hospital_id.trim();
    const periodStart = parseDate(input.period_start, "period_start");
    const periodEnd = parseDate(input.period_end, "period_end");
    const dueDate = parseDate(input.due_date, "due_date");

    if (!hospitalId || !periodStart || !periodEnd || !dueDate) {
      return { success: false, error: "Invalid invoice fields." };
    }
    if (periodEnd < periodStart) {
      return { success: false, error: "Billing period end must be on or after start." };
    }

    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data: hospital, error: hospitalError } = await db
      .from("hospitals")
      .select("id, name, slug, plan")
      .eq("id", hospitalId)
      .maybeSingle();

    if (hospitalError) return { success: false, error: hospitalError.message };
    if (!hospital) return { success: false, error: "Hospital not found." };

    const plan = hospital.plan as HospitalPlan;
    let amountKobo: number;
    try {
      amountKobo = planMonthlyAmountKobo(plan);
    } catch {
      return { success: false, error: "Could not resolve plan pricing." };
    }

    const status: PlatformInvoiceStatus = input.send ? "sent" : "draft";

    const { data, error } = await db
      .from("platform_invoices")
      .insert({
        hospital_id: hospitalId,
        plan,
        period_start: periodStart,
        period_end: periodEnd,
        amount_kobo: amountKobo,
        due_date: dueDate,
        status,
        notes: input.notes?.trim().slice(0, 2000) ?? null,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    const invoice = mapInvoice(data as Record<string, unknown>, {
      name: String(hospital.name),
      slug: String(hospital.slug),
    });

    await logPlatformAudit({
      action: input.send ? "invoice.send" : "invoice.create",
      actorId: profile.id,
      entityType: "platform_invoice",
      entityId: invoice.id,
      payload: {
        hospital_id: hospitalId,
        amount_kobo: amountKobo,
        plan,
        invoice_number: invoice.invoice_number,
      },
    });

    if (input.send) {
      await notifyPlatformInvoiceSent({
        hospitalId,
        invoiceNumber: invoice.invoice_number,
        amountKobo: invoice.amount_kobo,
        currency: invoice.currency,
        dueDate: invoice.due_date,
      });
    }

    return { success: true, data: invoice };
  });
}

export async function sendPlatformInvoiceAction(invoiceId: string) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data: existing, error: fetchError } = await db
      .from("platform_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!existing) return { success: false, error: "Invoice not found." };
    if (existing.status !== "draft") {
      return { success: false, error: "Only draft invoices can be sent." };
    }

    const { data, error } = await db
      .from("platform_invoices")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    await logPlatformAudit({
      action: "invoice.send",
      actorId: profile.id,
      entityType: "platform_invoice",
      entityId: invoiceId,
      payload: { invoice_number: data.invoice_number },
    });

    const invoice = mapInvoice(data as Record<string, unknown>);
    await notifyPlatformInvoiceSent({
      hospitalId: invoice.hospital_id,
      invoiceNumber: invoice.invoice_number,
      amountKobo: invoice.amount_kobo,
      currency: invoice.currency,
      dueDate: invoice.due_date,
    });

    return { success: true, data: invoice };
  });
}

export async function markPlatformInvoicePaidAction(input: {
  invoice_id: string;
  payment_reference: string;
  payment_method: PlatformPaymentMethod;
  reactivate_hospital?: boolean;
}) {
  return guardPlatformAction(async ({ profile }) => {
    const invoiceId = input.invoice_id.trim();
    const paymentReference = input.payment_reference.trim().slice(0, 200);
    const paymentMethod = input.payment_method;

    if (!invoiceId || !paymentReference) {
      return { success: false, error: "Payment reference is required." };
    }
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return { success: false, error: "Invalid payment method." };
    }

    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data: existing, error: fetchError } = await db
      .from("platform_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!existing) return { success: false, error: "Invoice not found." };
    if (!["sent", "overdue"].includes(String(existing.status))) {
      return { success: false, error: "Only sent or overdue invoices can be marked paid." };
    }

    const paidAt = new Date().toISOString();

    const { data, error } = await db
      .from("platform_invoices")
      .update({
        status: "paid",
        paid_at: paidAt,
        payment_reference: paymentReference,
        payment_method: paymentMethod,
        updated_at: paidAt,
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    if (input.reactivate_hospital) {
      await db
        .from("hospitals")
        .update({ status: "active", updated_at: paidAt })
        .eq("id", existing.hospital_id)
        .eq("status", "suspended");
    }

    await logPlatformAudit({
      action: "invoice.paid",
      actorId: profile.id,
      entityType: "platform_invoice",
      entityId: invoiceId,
      payload: {
        amount_kobo: existing.amount_kobo,
        payment_reference: paymentReference,
        payment_method: paymentMethod,
        reactivate_hospital: Boolean(input.reactivate_hospital),
      },
    });

    const invoice = mapInvoice(data as Record<string, unknown>);
    await notifyPlatformPaymentReceived({
      hospitalId: invoice.hospital_id,
      invoiceNumber: invoice.invoice_number,
      amountKobo: invoice.amount_kobo,
      currency: invoice.currency,
      reference: paymentReference,
    });

    return { success: true, data: invoice };
  });
}

export async function voidPlatformInvoiceAction(invoiceId: string) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data: existing, error: fetchError } = await db
      .from("platform_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!existing) return { success: false, error: "Invoice not found." };
    if (existing.status === "paid") {
      return { success: false, error: "Paid invoices cannot be voided." };
    }
    if (existing.status === "void") {
      return { success: false, error: "Invoice is already void." };
    }

    const { data, error } = await db
      .from("platform_invoices")
      .update({ status: "void", updated_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    await logPlatformAudit({
      action: "invoice.void",
      actorId: profile.id,
      entityType: "platform_invoice",
      entityId: invoiceId,
      payload: { invoice_number: existing.invoice_number },
    });

    return { success: true, data: mapInvoice(data as Record<string, unknown>) };
  });
}

export async function listPlatformPlanPricingAction() {
  return guardPlatformAction(async () => {
    const { PLAN_MONTHLY_KOBO } = await import("@/lib/platform/pricing");
    return {
      success: true as const,
      data: Object.entries(PLAN_MONTHLY_KOBO).map(([plan, amount_kobo]) => ({
        plan: plan as HospitalPlan,
        amount_kobo,
      })),
    };
  });
}
