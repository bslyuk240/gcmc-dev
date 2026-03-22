/**
 * Workforce — Rota service
 *
 * Creates and queries shift assignments. HOD/admin can create rotas;
 * all authenticated staff can read their own rota.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DepartmentKey } from "@/lib/constants/navigation";
import type {
  RotaAssignment,
  CreateRotaPayload,
  WeekRota,
  RotaSwapRequest,
  RotaSwapRequestStatus,
  CreateRotaSwapRequestPayload,
} from "@/modules/workforce/rota/types";

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get rota assignments for a department for a given week.
 * weekOf — ISO date of any day in the target week (service computes Mon–Sun).
 */
export async function getRotaByDepartment(
  department: DepartmentKey,
  weekOf: string,
): Promise<WeekRota> {
  const weekStart = getWeekMonday(weekOf);
  const weekEnd   = offsetDate(weekStart, 6);

  const supabase = await createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("rota_assignments")
      .select(`
        *,
        unit:units(*),
        staff:staff_profiles(full_name, email, department)
      `)
      .eq("department", department)
      .gte("shift_date", weekStart)
      .lte("shift_date", weekEnd)
      .order("shift_date")
      .order("shift_start");

    if (!error && data) {
      return { weekStarting: weekStart, department, assignments: data as RotaAssignment[] };
    }
  }

  return { weekStarting: weekStart, department, assignments: [] };
}

/**
 * Get a staff member's own rota for a given week.
 */
export async function getMyRota(staffId: string, weekOf: string): Promise<RotaAssignment[]> {
  const weekStart = getWeekMonday(weekOf);
  const weekEnd   = offsetDate(weekStart, 6);

  return getMyRotaRange(staffId, weekStart, weekEnd);
}

/**
 * Get a staff member's rota for a custom date range.
 */
export async function getMyRotaRange(staffId: string, from: string, to: string): Promise<RotaAssignment[]> {
  const supabase = await createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("rota_assignments")
      .select(`
        *,
        unit:units(*),
        staff:staff_profiles(full_name, email, department)
      `)
      .eq("staff_id", staffId)
      .gte("shift_date", from)
      .lte("shift_date", to)
      .order("shift_date")
      .order("shift_start");

    if (!error && data) return data as RotaAssignment[];
  }

  return [];
}

/**
 * Get a staff member's upcoming rota (next 4 weeks).
 */
export async function getUpcomingRota(staffId: string): Promise<RotaAssignment[]> {
  const today = new Date().toISOString().slice(0, 10);
  const until = offsetDate(today, 28);

  const supabase = await createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("rota_assignments")
      .select(`*, unit:units(*), staff:staff_profiles(full_name, email, department)`)
      .eq("staff_id", staffId)
      .gte("shift_date", today)
      .lte("shift_date", until)
      .neq("status", "cancelled")
      .order("shift_date");

    if (!error && data) return data as RotaAssignment[];
  }

  return [];
}

/**
 * Create a new rota assignment. Caller must enforce HOD/admin permission.
 */
export async function createRotaAssignment(
  payload: CreateRotaPayload,
  createdBy: string,
): Promise<{ id: string } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("rota_assignments")
    .insert({ ...payload, created_by: createdBy })
    .select("id")
    .single();

  if (error) {
    console.error("[createRotaAssignment]", error.message);
    return null;
  }
  return data;
}

/**
 * Update rota assignment status (e.g. confirm, cancel).
 */
export async function updateRotaStatus(
  assignmentId: string,
  status: RotaAssignment["status"],
  updatedBy: string,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("rota_assignments")
    .update({ status, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq("id", assignmentId);

  return !error;
}

// ─── Date utilities ──────────────────────────────────────────────────────────

function mapRotaSwapRequest(row: Record<string, unknown>): RotaSwapRequest {
  return {
    id: row.id as string,
    assignmentId: row.assignment_id as string,
    staffId: row.staff_id as string,
    staffName: (row.staff_name as string) ?? "",
    department: row.department as RotaSwapRequest["department"],
    shiftDate: row.shift_date as string,
    shiftType: row.shift_type as RotaSwapRequest["shiftType"],
    shiftStart: (row.shift_start as string) ?? null,
    shiftEnd: (row.shift_end as string) ?? null,
    unitId: (row.unit_id as string) ?? null,
    unitName: (row.unit_name as string) ?? null,
    reason: (row.reason as string) ?? null,
    status: (row.status as RotaSwapRequestStatus) ?? "pending",
    reviewedBy: (row.reviewed_by as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
    reviewNote: (row.review_note as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function getRotaSwapRequests(department?: DepartmentKey): Promise<RotaSwapRequest[]> {
  const sb = createAdminClient();
  if (!sb) return [];

  let query = sb.from("rota_swap_requests").select("*").order("created_at", { ascending: false });
  if (department) query = query.eq("department", department);

  const { data, error } = await query;
  if (error) {
    console.error("[getRotaSwapRequests]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRotaSwapRequest(row as Record<string, unknown>));
}

export async function getMyRotaSwapRequests(staffId: string): Promise<RotaSwapRequest[]> {
  const sb = createAdminClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from("rota_swap_requests")
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMyRotaSwapRequests]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRotaSwapRequest(row as Record<string, unknown>));
}

export async function createRotaSwapRequest(
  payload: CreateRotaSwapRequestPayload,
): Promise<RotaSwapRequest | null> {
  const sb = createAdminClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("rota_swap_requests")
    .insert({
      assignment_id: payload.assignmentId,
      staff_id: payload.staffId,
      staff_name: payload.staffName,
      department: payload.department,
      shift_date: payload.shiftDate,
      shift_type: payload.shiftType,
      shift_start: payload.shiftStart,
      shift_end: payload.shiftEnd,
      unit_id: payload.unitId,
      unit_name: payload.unitName,
      reason: payload.reason ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createRotaSwapRequest]", error?.message ?? "Unknown error");
    return null;
  }

  return mapRotaSwapRequest(data as Record<string, unknown>);
}

export async function reviewRotaSwapRequest(
  requestId: string,
  status: RotaSwapRequestStatus,
  reviewerId: string,
  reviewNote?: string,
): Promise<RotaSwapRequest | null> {
  const sb = createAdminClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("rota_swap_requests")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[reviewRotaSwapRequest]", error?.message ?? "Unknown error");
    return null;
  }

  return mapRotaSwapRequest(data as Record<string, unknown>);
}

function getWeekMonday(isoDate: string): string {
  const d    = new Date(isoDate);
  const day  = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
