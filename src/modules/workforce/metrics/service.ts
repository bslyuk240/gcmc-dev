import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { WorkforceMetrics, WorkforceUnitOverview } from "@/lib/workforce/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getWorkforceMetrics(unitName?: string): Promise<WorkforceMetrics> {
  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return {
      onDutyToday: 0,
      absentToday: 0,
      onLeave: 0,
      pendingLeave: 0,
      assignedTasks: 0,
      completedTasksToday: 0,
      overdueTasks: 0,
      unitStaffTotal: 0,
      unitStaffActive: 0,
    };
  }

  const { admin, hospitalId } = scoped;
  const today = todayIso();

  let staffQuery = admin
    .from("staff_profiles")
    .select("id, is_active, unit_name")
    .eq("hospital_id", hospitalId)
    .eq("department", "non_clinical");
  if (unitName) staffQuery = staffQuery.eq("unit_name", unitName);

  let rotaQuery = admin
    .from("rota_assignments")
    .select("staff_id")
    .eq("hospital_id", hospitalId)
    .eq("department", "non_clinical")
    .eq("shift_date", today)
    .neq("status", "cancelled");
  if (unitName) rotaQuery = rotaQuery.eq("unit_name", unitName);

  let leaveQuery = admin
    .from("leave_requests")
    .select("id, status, staff_id")
    .eq("hospital_id", hospitalId)
    .eq("department", "non_clinical");

  let taskQuery = admin
    .from("workforce_tasks")
    .select("id, status, completed_at")
    .eq("hospital_id", hospitalId);
  if (unitName) taskQuery = taskQuery.eq("unit_name", unitName);

  let attendanceQuery = admin
    .from("staff_attendance_records")
    .select("staff_id, status, department")
    .eq("hospital_id", hospitalId)
    .eq("attendance_date", today);

  const [staffRes, rotaRes, leaveRes, taskRes, attendanceRes] = await Promise.all([
    staffQuery,
    rotaQuery,
    leaveQuery,
    taskQuery,
    attendanceQuery,
  ]);

  const staff = staffRes.data ?? [];
  const staffIds = new Set(staff.map((s) => s.id as string));
  const rota = rotaRes.data ?? [];
  const leaves = leaveRes.data ?? [];
  const tasks = taskRes.data ?? [];
  const attendance = (attendanceRes.data ?? []).filter((a) => staffIds.has(a.staff_id as string));

  const onLeave = leaves.filter((l) => l.status === "Approved").length;
  const pendingLeave = leaves.filter((l) => l.status === "Pending").length;
  const onDutyToday = new Set(rota.map((r) => r.staff_id as string)).size;
  const presentIds = new Set(
    attendance.filter((a) => {
      const status = String(a.status ?? "").toLowerCase();
      return status === "present" || status === "late";
    }).map((a) => a.staff_id as string),
  );
  const activeCount = staff.filter((s) => s.is_active).length;
  const absentToday = Math.max(0, activeCount - Math.max(presentIds.size, onDutyToday));

  const assignedTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const completedTasksToday = tasks.filter((t) => {
    if (t.status !== "completed" || !t.completed_at) return false;
    return String(t.completed_at).startsWith(today);
  }).length;
  const overdueTasks = tasks.filter((t) => t.status === "overdue").length;

  return {
    onDutyToday,
    absentToday,
    onLeave,
    pendingLeave,
    assignedTasks,
    completedTasksToday,
    overdueTasks,
    unitStaffTotal: staff.length,
    unitStaffActive: activeCount,
  };
}

export async function getWorkforceOverviewAllUnits(): Promise<WorkforceUnitOverview[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin } = scoped;
  const { data: units } = await admin.from("nc_units").select("name").order("name");
  const unitNames = (units ?? []).map((u) => u.name as string);

  const results: WorkforceUnitOverview[] = [];
  for (const unitName of unitNames) {
    const metrics = await getWorkforceMetrics(unitName);
    const attendanceRate = metrics.unitStaffActive > 0
      ? Math.round((metrics.onDutyToday / metrics.unitStaffActive) * 100)
      : 0;
    results.push({
      unitName,
      totalStaff: metrics.unitStaffTotal,
      activeStaff: metrics.unitStaffActive,
      onLeave: metrics.onLeave,
      absentToday: metrics.absentToday,
      attendanceRate,
      pendingTasks: metrics.assignedTasks,
    });
  }

  return results;
}
