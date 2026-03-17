/**
 * Workforce — Staff Unit Assignments service
 *
 * Tracks which unit a staff member is currently assigned to within their department.
 */

import { createClient } from "@/lib/supabase/server";
import type { StaffUnitAssignment } from "@/modules/workforce/rota/types";

/**
 * Get the current active unit assignment for a staff member.
 */
export async function getCurrentAssignment(staffId: string): Promise<StaffUnitAssignment | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("staff_unit_assignments")
    .select(`
      *,
      unit:units(*)
    `)
    .eq("staff_id", staffId)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getCurrentAssignment]", error.message);
    return null;
  }
  return data as StaffUnitAssignment | null;
}

/**
 * Get all staff assigned to a specific unit (current assignments only).
 */
export async function getUnitStaff(unitId: string): Promise<StaffUnitAssignment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("staff_unit_assignments")
    .select(`
      *,
      staff:staff_profiles(full_name, email, department)
    `)
    .eq("unit_id", unitId)
    .is("end_date", null);

  if (error) {
    console.error("[getUnitStaff]", error.message);
    return [];
  }
  return (data ?? []) as StaffUnitAssignment[];
}

/**
 * Assign a staff member to a unit.
 * Closes any existing active assignment before creating the new one.
 */
export async function assignStaffToUnit(
  staffId: string,
  unitId: string,
  startDate?: string,
  notes?: string,
): Promise<{ id: string } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const today = startDate ?? new Date().toISOString().slice(0, 10);

  // Close existing active assignment
  await supabase
    .from("staff_unit_assignments")
    .update({ end_date: today })
    .eq("staff_id", staffId)
    .is("end_date", null);

  // Create new assignment
  const { data, error } = await supabase
    .from("staff_unit_assignments")
    .insert({ staff_id: staffId, unit_id: unitId, start_date: today, notes })
    .select("id")
    .single();

  if (error) {
    console.error("[assignStaffToUnit]", error.message);
    return null;
  }
  return data;
}

/**
 * End a staff member's current unit assignment.
 */
export async function endUnitAssignment(
  staffId: string,
  endDate?: string,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const today = endDate ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("staff_unit_assignments")
    .update({ end_date: today })
    .eq("staff_id", staffId)
    .is("end_date", null);

  return !error;
}
