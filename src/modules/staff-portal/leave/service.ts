import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { LeaveYearPolicy } from "@/lib/data/hr-store";

function mapLeavePolicy(row: Record<string, unknown>): LeaveYearPolicy {
  return {
    year: Number(row.year),
    annualDays: Number(row.annual_days ?? 21),
    carryForwardDays: Number(row.carry_forward_days ?? 0),
    notes: row.notes != null ? String(row.notes) : undefined,
    updatedBy: row.updated_by != null ? String(row.updated_by) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listLeavePolicies(): Promise<LeaveYearPolicy[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("leave_year_policies")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("year", { ascending: false });

  if (error) {
    console.error("[listLeavePolicies]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapLeavePolicy(row as Record<string, unknown>));
}
