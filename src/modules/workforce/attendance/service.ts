import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type {
  AttendanceClockInInput,
  AttendanceClockOutInput,
  AttendanceRecord,
  AttendanceStatus,
} from "@/modules/workforce/attendance/types";

function mapAttendanceRecord(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: row.id as string,
    staffId: (row.staff_id as string) ?? "",
    staffName: (row.staff_name as string) ?? "",
    department: row.department as AttendanceRecord["department"],
    role: (row.role as string) ?? "",
    attendanceDate: (row.attendance_date as string) ?? "",
    clockInAt: (row.clock_in_at as string) ?? null,
    clockOutAt: (row.clock_out_at as string) ?? null,
    hours: Number(row.hours ?? 0),
    status: (row.status as AttendanceStatus) ?? "Present",
    unit: (row.unit as string) ?? null,
    note: (row.note as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
  };
}

export async function fetchAttendanceRecords(filters?: {
  staffId?: string;
  department?: string;
  from?: string;
  to?: string;
}): Promise<AttendanceRecord[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("staff_attendance_records")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("attendance_date", { ascending: false })
    .order("clock_in_at", { ascending: false });

  if (filters?.staffId) query = query.eq("staff_id", filters.staffId);
  if (filters?.department) query = query.eq("department", filters.department);
  if (filters?.from) query = query.gte("attendance_date", filters.from);
  if (filters?.to) query = query.lte("attendance_date", filters.to);

  const { data, error } = await query;
  if (error) {
    console.error("[attendance] fetchAttendanceRecords:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapAttendanceRecord(row as Record<string, unknown>));
}

export async function fetchAttendanceRecord(staffId: string, attendanceDate: string): Promise<AttendanceRecord | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("staff_attendance_records")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("staff_id", staffId)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();

  if (error) {
    console.error("[attendance] fetchAttendanceRecord:", error.message);
    return null;
  }

  return data ? mapAttendanceRecord(data as Record<string, unknown>) : null;
}

export async function clockInAttendance(input: AttendanceClockInInput): Promise<AttendanceRecord | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { admin, hospitalId } = scoped;
  const existing = await fetchAttendanceRecord(input.staffId, input.attendanceDate);
  if (existing) {
    if (existing.clockOutAt) return existing;
    return existing;
  }

  const { data, error } = await admin
    .from("staff_attendance_records")
    .insert({
      hospital_id: hospitalId,
      staff_id: input.staffId,
      staff_name: input.staffName,
      department: input.department,
      role: input.role,
      attendance_date: input.attendanceDate,
      clock_in_at: input.clockInAt,
      clock_out_at: null,
      hours: 0,
      status: input.status,
      unit: input.unit ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[attendance] clockInAttendance:", error?.message ?? "Unknown error");
    return null;
  }

  return mapAttendanceRecord(data as Record<string, unknown>);
}

export async function clockOutAttendance(input: AttendanceClockOutInput): Promise<AttendanceRecord | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { admin, hospitalId } = scoped;
  const existing = await fetchAttendanceRecord(input.staffId, input.attendanceDate);
  if (!existing) return null;
  if (existing.clockOutAt) return existing;
  if (!existing.clockInAt) return existing;

  const start = new Date(existing.clockInAt);
  const end = new Date(input.clockOutAt);
  const hours = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
    ? existing.hours
    : Math.max(0, Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 10) / 10);

  const { data, error } = await admin
    .from("staff_attendance_records")
    .update({
      clock_out_at: input.clockOutAt,
      hours,
      updated_at: new Date().toISOString(),
    })
    .eq("hospital_id", hospitalId)
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[attendance] clockOutAttendance:", error?.message ?? "Unknown error");
    return null;
  }

  return mapAttendanceRecord(data as Record<string, unknown>);
}
