import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { GeneratedPayslip } from "@/lib/data/hr-store";

function mapPayslip(row: Record<string, unknown>): GeneratedPayslip {
  const parseJsonArray = <T>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return {
    id: String(row.id),
    period: String(row.period),
    monthKey: String(row.month_key ?? ""),
    department: String(row.department) as GeneratedPayslip["department"],
    staffId: String(row.staff_id ?? ""),
    staffName: String(row.staff_name ?? ""),
    role: String(row.role ?? ""),
    unit: row.unit != null ? String(row.unit) : undefined,
    bankName: row.bank_name != null ? String(row.bank_name) : undefined,
    bankAccount: row.bank_account != null ? String(row.bank_account) : undefined,
    taxId: row.tax_id != null ? String(row.tax_id) : undefined,
    baseSalary: Number(row.base_salary ?? 0),
    earnings: parseJsonArray(row.earnings),
    deductions: parseJsonArray(row.deductions),
    grossPay: Number(row.gross_pay ?? 0),
    totalDeductions: Number(row.total_deductions ?? 0),
    netPay: Number(row.net_pay ?? 0),
    paymentStatus: (row.payment_status as GeneratedPayslip["paymentStatus"]) ?? "Processing",
    workflowStatus: (row.workflow_status as GeneratedPayslip["workflowStatus"]) ?? "Generated",
    createdAt: String(row.created_at ?? ""),
    createdBy: String(row.created_by ?? ""),
    batchId: row.batch_id != null ? String(row.batch_id) : undefined,
    paidAt: row.paid_at != null ? String(row.paid_at) : undefined,
  };
}

export async function listMyPayslips(staffId: string): Promise<GeneratedPayslip[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("generated_payslips")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .eq("staff_id", staffId)
    .order("month_key", { ascending: false });

  if (error) {
    console.error("[listMyPayslips]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapPayslip(row as Record<string, unknown>));
}
