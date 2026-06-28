import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PlatformHospitalWorkforceSummary,
  WorkforceMetrics,
  WorkforceUnitOverview,
} from "@/lib/workforce/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getWorkforceMetricsForHospital(
  admin: SupabaseClient,
  hospitalId: string,
  unitName?: string,
): Promise<WorkforceMetrics> {
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

  const leaveQuery = admin
    .from("leave_requests")
    .select("id, status, staff_id")
    .eq("hospital_id", hospitalId)
    .eq("department", "non_clinical");

  let taskQuery = admin
    .from("workforce_tasks")
    .select("id, status, completed_at")
    .eq("hospital_id", hospitalId);
  if (unitName) taskQuery = taskQuery.eq("unit_name", unitName);

  const attendanceQuery = admin
    .from("staff_attendance_records")
    .select("staff_id, status")
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

  return {
    onDutyToday,
    absentToday,
    onLeave,
    pendingLeave,
    assignedTasks: tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
    completedTasksToday: tasks.filter((t) => {
      if (t.status !== "completed" || !t.completed_at) return false;
      return String(t.completed_at).startsWith(today);
    }).length,
    overdueTasks: tasks.filter((t) => t.status === "overdue").length,
    unitStaffTotal: staff.length,
    unitStaffActive: activeCount,
  };
}

async function getUnitNamesForHospital(
  admin: SupabaseClient,
  hospitalId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("staff_profiles")
    .select("unit_name")
    .eq("hospital_id", hospitalId)
    .eq("department", "non_clinical")
    .not("unit_name", "is", null);

  const names = new Set<string>();
  for (const row of data ?? []) {
    const name = row.unit_name as string | null;
    if (name?.trim()) names.add(name.trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

async function getWorkforceUnitsForHospital(
  admin: SupabaseClient,
  hospitalId: string,
): Promise<WorkforceUnitOverview[]> {
  const unitNames = await getUnitNamesForHospital(admin, hospitalId);
  const results: WorkforceUnitOverview[] = [];

  for (const unitName of unitNames) {
    const metrics = await getWorkforceMetricsForHospital(admin, hospitalId, unitName);
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

export async function getPlatformWorkforceSummaries(
  hospitalId?: string,
): Promise<PlatformHospitalWorkforceSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let hospitalsQuery = admin
    .from("hospitals")
    .select("id, name, slug, status")
    .order("name");
  if (hospitalId) hospitalsQuery = hospitalsQuery.eq("id", hospitalId);

  const { data: hospitals, error } = await hospitalsQuery;
  if (error || !hospitals?.length) return [];

  const summaries = await Promise.all(
    hospitals.map(async (hospital) => {
      const id = hospital.id as string;
      const [metrics, units] = await Promise.all([
        getWorkforceMetricsForHospital(admin, id),
        getWorkforceUnitsForHospital(admin, id),
      ]);
      return {
        hospitalId: id,
        hospitalName: hospital.name as string,
        hospitalSlug: hospital.slug as string,
        hospitalStatus: hospital.status as string,
        metrics,
        units,
      };
    }),
  );

  return summaries;
}
