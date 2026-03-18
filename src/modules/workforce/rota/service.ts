/**
 * Workforce — Rota service
 *
 * Creates and queries shift assignments. HOD/admin can create rotas;
 * all authenticated staff can read their own rota.
 */

import { createClient } from "@/lib/supabase/server";
import type { DepartmentKey } from "@/lib/constants/navigation";
import type { RotaAssignment, CreateRotaPayload, WeekRota } from "@/modules/workforce/rota/types";

// ─── Static mock (fallback when Supabase is not configured) ──────────────────

const MOCK_ROTA: RotaAssignment[] = [];

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
      .gte("shift_date", weekStart)
      .lte("shift_date", weekEnd)
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
