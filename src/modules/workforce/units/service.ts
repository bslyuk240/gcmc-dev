/**
 * Workforce — Units service
 *
 * Provides server-side helpers for reading and managing nursing/department units.
 * Falls back to static mock data when Supabase is not configured.
 */

import { createClient } from "@/lib/supabase/server";
import type { DepartmentKey } from "@/lib/constants/navigation";
import type { Unit } from "@/modules/workforce/rota/types";

// ─── Static fallback data (used when Supabase is not connected) ───────────────

const MOCK_UNITS: Unit[] = [
  { id: "u-01", department: "nurses",   name: "ICU",         description: "Intensive Care Unit",         is_active: true, created_at: "2026-01-01" },
  { id: "u-02", department: "nurses",   name: "Ward A",      description: "General ward — female",       is_active: true, created_at: "2026-01-01" },
  { id: "u-03", department: "nurses",   name: "Ward B",      description: "General ward — male",         is_active: true, created_at: "2026-01-01" },
  { id: "u-04", department: "nurses",   name: "Emergency",   description: "Emergency and acute care",    is_active: true, created_at: "2026-01-01" },
  { id: "u-05", department: "nurses",   name: "Outpatient",  description: "Outpatient triage",           is_active: true, created_at: "2026-01-01" },
  { id: "u-06", department: "doctors",  name: "Outpatient",  description: "Outpatient consultations",    is_active: true, created_at: "2026-01-01" },
  { id: "u-07", department: "doctors",  name: "Ward Round",  description: "Inpatient ward rounds",       is_active: true, created_at: "2026-01-01" },
  { id: "u-08", department: "doctors",  name: "Theatre",     description: "Surgical theatre",            is_active: true, created_at: "2026-01-01" },
  { id: "u-09", department: "lab",      name: "Haematology", description: "Blood tests",                 is_active: true, created_at: "2026-01-01" },
  { id: "u-10", department: "lab",      name: "Microbiology",description: "Microbiology",                is_active: true, created_at: "2026-01-01" },
  { id: "u-11", department: "pharmacy", name: "Dispensary",  description: "Main dispensing counter",     is_active: true, created_at: "2026-01-01" },
];

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Get all units, optionally filtered by department.
 */
export async function getUnits(department?: DepartmentKey): Promise<Unit[]> {
  const supabase = await createClient();

  if (supabase) {
    let query = supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (department) {
      query = query.eq("department", department);
    }

    const { data, error } = await query;
    if (!error && data) return data as Unit[];
  }

  // Fallback to mock
  return department
    ? MOCK_UNITS.filter((u) => u.department === department)
    : MOCK_UNITS;
}

/**
 * Get a single unit by ID.
 */
export async function getUnit(unitId: string): Promise<Unit | null> {
  const supabase = await createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .eq("id", unitId)
      .single();
    if (!error && data) return data as Unit;
  }

  return MOCK_UNITS.find((u) => u.id === unitId) ?? null;
}

/**
 * Create a new unit. Requires admin or hr_manager role (enforced at call site).
 */
export async function createUnit(
  department: DepartmentKey,
  name: string,
  description?: string,
): Promise<{ id: string } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("units")
    .insert({ department, name, description })
    .select("id")
    .single();

  if (error) {
    console.error("[createUnit]", error.message);
    return null;
  }
  return data;
}
