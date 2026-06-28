"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { guardPlatformAction } from "@/lib/platform/guard-action";

export type StaffWithTenant = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  department: string | null;
  is_active: boolean | null;
  hospital_id: string | null;
  hospital_name: string | null;
  hospital_slug: string | null;
  created_at: string;
};

export async function listAllHospitalStaffAction(params?: {
  search?: string;
  role?: string;
  hospitalId?: string;
  page?: number;
  perPage?: number;
}) {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 50;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Get all tenant staff (exclude platform roles)
    let query = db
      .from("staff_profiles")
      .select("id, full_name, email, role, department, is_active, hospital_id, created_at", { count: "exact" })
      .not("role", "in", '("platform_admin","platform_staff")')
      .order("created_at", { ascending: false });

    if (params?.role) query = query.eq("role", params.role);
    if (params?.hospitalId) query = query.eq("hospital_id", params.hospitalId);
    if (params?.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    query = query.range(from, to);

    const { data: staff, count, error } = await query;
    if (error) return { success: false, error: error.message };

    // Get hospital names for the staff
    const hospitalIds = [...new Set((staff ?? []).map((s) => s.hospital_id).filter(Boolean))];
    let hospitalMap: Record<string, { name: string; slug: string }> = {};

    if (hospitalIds.length > 0) {
      const { data: hospitals } = await db
        .from("hospitals")
        .select("id, name, slug")
        .in("id", hospitalIds as string[]);
      hospitalMap = Object.fromEntries(
        (hospitals ?? []).map((h) => [h.id, { name: h.name, slug: h.slug }]),
      );
    }

    const result: StaffWithTenant[] = (staff ?? []).map((s) => ({
      id: String(s.id),
      full_name: s.full_name ?? null,
      email: s.email ?? null,
      role: String(s.role),
      department: s.department ?? null,
      is_active: s.is_active ?? null,
      hospital_id: s.hospital_id ?? null,
      hospital_name: s.hospital_id ? (hospitalMap[s.hospital_id]?.name ?? null) : null,
      hospital_slug: s.hospital_id ? (hospitalMap[s.hospital_id]?.slug ?? null) : null,
      created_at: String(s.created_at),
    }));

    return { success: true, data: { staff: result, total: count ?? 0, page, perPage } };
  });
}
