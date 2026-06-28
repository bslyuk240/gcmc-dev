import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { BillingPaymentMethod } from "@/modules/billing/types";

export type ReceivePaymentResult = {
  paymentId: string;
  paymentNumber: string;
  totalAmount: number;
};

export async function receiveBillingPayment(input: {
  chargeLineIds: string[];
  paymentMethod: BillingPaymentMethod;
  reference?: string;
  notes?: string;
  receivedBy?: string;
  receivedByName: string;
}): Promise<ReceivePaymentResult | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  if (!input.chargeLineIds.length) return { error: "Select at least one charge." };

  const { data, error } = await admin.rpc("billing_receive_payment", {
    p_hospital_id: hospitalId,
    p_charge_line_ids: input.chargeLineIds,
    p_payment_method: input.paymentMethod,
    p_reference: input.reference ?? "",
    p_notes: input.notes ?? "",
    p_received_by: input.receivedBy ?? null,
    p_received_by_name: input.receivedByName,
  });

  if (error) {
    console.error("[receiveBillingPayment]", error.message);
    return { error: error.message };
  }

  const payload = data as {
    paymentId?: string;
    paymentNumber?: string;
    totalAmount?: number;
  };

  return {
    paymentId: String(payload.paymentId ?? ""),
    paymentNumber: String(payload.paymentNumber ?? ""),
    totalAmount: Number(payload.totalAmount ?? 0),
  };
}

export async function waiveBillingCharge(input: {
  chargeLineId: string;
  reason: string;
  approvedBy?: string;
  approvedByName: string;
}): Promise<{ chargeLineId: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  if (!input.reason.trim()) return { error: "A reason is required." };

  const { data, error } = await admin.rpc("billing_waive_charge", {
    p_hospital_id: hospitalId,
    p_charge_line_id: input.chargeLineId,
    p_reason: input.reason.trim(),
    p_approved_by: input.approvedBy ?? null,
    p_approved_by_name: input.approvedByName,
  });

  if (error) {
    console.error("[waiveBillingCharge]", error.message);
    return { error: error.message };
  }

  const payload = data as { chargeLineId?: string };
  return { chargeLineId: String(payload.chargeLineId ?? input.chargeLineId) };
}

export function uiMethodToBillingMethod(method: string): BillingPaymentMethod {
  switch (method) {
    case "Cash": return "cash";
    case "POS / Card": return "card";
    case "Mobile Money": return "mobile";
    case "Insurance": return "insurance_copay";
    case "Bank Transfer": return "transfer";
    default: return "other";
  }
}
