import type { HospitalPlan } from "@/lib/tenant/types";

export type PlatformInvoiceStatus = "draft" | "sent" | "paid" | "void" | "overdue";

export type PlatformPaymentMethod = "bank_transfer" | "cash" | "cheque" | "other" | "paystack";

export type PlatformInvoice = {
  id: string;
  invoice_number: string;
  hospital_id: string;
  hospital_name?: string;
  hospital_slug?: string;
  plan: HospitalPlan;
  period_start: string;
  period_end: string;
  amount_kobo: number;
  currency: string;
  status: PlatformInvoiceStatus;
  due_date: string;
  paid_at: string | null;
  payment_reference: string | null;
  payment_method: PlatformPaymentMethod | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformBillingSummary = {
  outstanding_count: number;
  overdue_count: number;
  paid_this_month_kobo: number;
  outstanding_kobo: number;
};
