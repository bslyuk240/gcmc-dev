import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { LeaveRequest, LeaveType } from "@/lib/data/hr-store";
import type { DBDepartmentKey } from "@/lib/constants/navigation";

function mapLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    id: String(row.id),
    staffId: String(row.staff_id),
    staffName: String(row.staff_name),
    department: String(row.department),
    role: String(row.role ?? ""),
    leaveType: row.leave_type as LeaveRequest["leaveType"],
    startDate: String(row.start_date).slice(0, 10),
    endDate: String(row.end_date).slice(0, 10),
    days: Number(row.days),
    reason: String(row.reason ?? ""),
    status: row.status as LeaveRequest["status"],
    submittedAt: String(row.submitted_at),
    reviewedBy: row.reviewed_by != null ? String(row.reviewed_by) : undefined,
    reviewedAt: row.reviewed_at != null ? String(row.reviewed_at) : undefined,
    hrNotes: row.hr_notes != null ? String(row.hr_notes) : undefined,
  };
}

export async function listLeaveRequestsAdmin(input: {
  department?: DBDepartmentKey;
  staffId?: string;
  unitName?: string;
}): Promise<LeaveRequest[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;

  if (input.unitName) {
    const { data: staffRows } = await admin
      .from("staff_profiles")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("department", "non_clinical")
      .eq("unit_name", input.unitName);
    const staffIds = (staffRows ?? []).map((r) => r.id as string);
    if (staffIds.length === 0) return [];

    const { data, error } = await admin
      .from("leave_requests")
      .select("*")
      .eq("hospital_id", hospitalId)
      .in("staff_id", staffIds)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("[listLeaveRequestsAdmin]", error.message);
      return [];
    }
    return (data ?? []).map((row) => mapLeaveRequest(row as Record<string, unknown>));
  }

  let query = admin
    .from("leave_requests")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("submitted_at", { ascending: false });

  if (input.department) query = query.eq("department", input.department);
  if (input.staffId) query = query.eq("staff_id", input.staffId);

  const { data, error } = await query;
  if (error) {
    console.error("[listLeaveRequestsAdmin]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapLeaveRequest(row as Record<string, unknown>));
}

export async function createLeaveRequestAdmin(input: {
  staffId: string;
  staffName: string;
  department: string;
  role: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}): Promise<{ request: LeaveRequest } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("leave_requests")
    .insert({
      hospital_id: hospitalId,
      staff_id: input.staffId,
      staff_name: input.staffName,
      department: input.department,
      role: input.role,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      days: input.days,
      reason: input.reason,
      status: "Pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createLeaveRequestAdmin]", error?.message ?? "Unknown error");
    return { error: error?.message ?? "Could not submit leave request." };
  }

  return { request: mapLeaveRequest(data as Record<string, unknown>) };
}

export async function reviewLeaveRequestAdmin(input: {
  requestId: string;
  status: "Approved" | "Rejected";
  reviewedBy: string;
  notes?: string;
}): Promise<{ request: LeaveRequest } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const reviewedAt = new Date().toISOString();

  const { data: existing, error: fetchError } = await admin
    .from("leave_requests")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("id", input.requestId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Leave request not found." };
  if (String(existing.status) !== "Pending") {
    return { error: "Only pending requests can be reviewed." };
  }

  const { data, error } = await admin
    .from("leave_requests")
    .update({
      status: input.status,
      reviewed_by: input.reviewedBy,
      reviewed_at: reviewedAt,
      hr_notes: input.notes?.trim() || null,
      updated_at: reviewedAt,
    })
    .eq("id", input.requestId)
    .eq("hospital_id", hospitalId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not update leave request." };
  }

  if (input.status === "Approved") {
    await admin
      .from("staff_profiles")
      .update({ updated_at: reviewedAt })
      .eq("id", String(existing.staff_id))
      .eq("hospital_id", hospitalId);
  }

  return { request: mapLeaveRequest(data as Record<string, unknown>) };
}

export async function listLeaveRequestsForStaff(input: {
  hospitalId: string;
  staffId: string;
}): Promise<LeaveRequest[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("leave_requests")
    .select("*")
    .eq("hospital_id", input.hospitalId)
    .eq("staff_id", input.staffId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("[listLeaveRequestsForStaff]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapLeaveRequest(row as Record<string, unknown>));
}
