import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { LeaveYearPolicy } from "@/lib/data/hr-store";
import { listLeaveRequestsForStaff } from "@/lib/leave/service";
import { listWorkforceTasks } from "@/modules/workforce/tasks/service";
import type { StaffDashboardSummary, StaffDashboardShift } from "@/modules/staff-portal/types";

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

function computeLeaveBalance(
  requests: Awaited<ReturnType<typeof listLeaveRequestsForStaff>>,
  policy: LeaveYearPolicy | null,
) {
  const currentYear = new Date().getFullYear();
  const annualTotal = (policy?.annualDays ?? 21) + (policy?.carryForwardDays ?? 0);
  const annualUsed = requests
    .filter(
      (r) =>
        r.leaveType === "Annual" &&
        r.status === "Approved" &&
        new Date(`${r.startDate}T00:00:00`).getFullYear() === currentYear,
    )
    .reduce((sum, r) => sum + r.days, 0);
  const sickUsed = requests
    .filter((r) => r.leaveType === "Sick" && r.status === "Approved")
    .reduce((sum, r) => sum + r.days, 0);
  const sickTotal = 10;

  return {
    annual: {
      used: annualUsed,
      total: annualTotal,
      remaining: Math.max(annualTotal - annualUsed, 0),
    },
    sick: {
      used: sickUsed,
      total: sickTotal,
      remaining: Math.max(sickTotal - sickUsed, 0),
    },
  };
}

export async function getStaffDashboard(input: {
  hospitalId: string;
  staffId: string;
}): Promise<StaffDashboardSummary> {
  const scoped = await createTenantAdminClient();
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const requests = await listLeaveRequestsForStaff(input);

  let policy: LeaveYearPolicy | null = null;
  let allPolicies: LeaveYearPolicy[] = [];
  let upcomingShifts: StaffDashboardShift[] = [];
  let pendingReviewCount = 0;

  if (scoped) {
    const { hospitalId, admin } = scoped;

    const [policyRow, policyRows, shiftRows, perfCount] = await Promise.all([
      admin
        .from("leave_year_policies")
        .select("*")
        .eq("hospital_id", hospitalId)
        .eq("year", currentYear)
        .maybeSingle(),
      admin
        .from("leave_year_policies")
        .select("*")
        .eq("hospital_id", hospitalId)
        .order("year", { ascending: false }),
      admin
        .from("rota_assignments")
        .select("id, shift_date, shift_start, shift_end, shift_type, unit_name")
        .eq("hospital_id", hospitalId)
        .eq("staff_id", input.staffId)
        .gte("shift_date", today)
        .order("shift_date", { ascending: true })
        .limit(5),
      admin
        .from("performance_reviews")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .eq("staff_id", input.staffId)
        .eq("status", "submitted"),
    ]);

    if (policyRow.data) {
      policy = mapLeavePolicy(policyRow.data as Record<string, unknown>);
    }
    allPolicies = (policyRows.data ?? []).map((row) =>
      mapLeavePolicy(row as Record<string, unknown>),
    );
    upcomingShifts = ((shiftRows.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      shiftDate: String(row.shift_date).slice(0, 10),
      shiftStart: String(row.shift_start ?? ""),
      shiftEnd: String(row.shift_end ?? ""),
      shiftType: row.shift_type != null ? String(row.shift_type) : undefined,
      unitName: row.unit_name != null ? String(row.unit_name) : undefined,
    }));
    pendingReviewCount = perfCount.count ?? 0;
  }

  const tasks = await listWorkforceTasks({ assigneeId: input.staffId, status: "pending" });

  return {
    leaveBalance: computeLeaveBalance(requests, policy),
    upcomingShifts,
    pendingLeaveCount: requests.filter((r) => r.status === "Pending").length,
    pendingReviewCount,
    assignedTaskCount: tasks.length,
    leavePolicies: allPolicies,
  };
}
