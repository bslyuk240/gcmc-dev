"use server";

import { getServerSession } from "@/lib/auth/session";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  DEPT_ROLE_KEYS,
  STAFF_DEPT_TO_DB,
  type StaffDepartment,
} from "@/lib/data/hr-store";

export type AssignDepartmentHeadResult =
  | { success: true }
  | { success: false; error: string };

export async function assignDepartmentHeadAction(input: {
  department: StaffDepartment;
  staffId: string;
}): Promise<AssignDepartmentHeadResult> {
  const session = await getServerSession();
  if (!session || !["admin", "hr_manager", "hr_staff"].includes(session.role)) {
    return { success: false, error: "HR access required." };
  }

  const staffId = input.staffId.trim();
  if (!staffId) {
    return { success: false, error: "Select a staff member." };
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return { success: false, error: "Service not configured." };
  }

  const { admin, hospitalId } = scoped;
  const dbDepartment = STAFF_DEPT_TO_DB[input.department];
  const today = new Date().toISOString().slice(0, 10);
  const actorId = session.auth_user_id ?? session.staff_id;

  const { data: staffRow, error: staffError } = await admin
    .from("staff_profiles")
    .select("id, department, role, full_name")
    .eq("hospital_id", hospitalId)
    .eq("id", staffId)
    .maybeSingle();

  if (staffError) return { success: false, error: staffError.message };
  if (!staffRow) return { success: false, error: "Staff member not found." };
  if (String(staffRow.department) !== dbDepartment) {
    return { success: false, error: "Selected staff is not in this department." };
  }

  const { data: activeHeads } = await admin
    .from("department_heads")
    .select("id, staff_id")
    .eq("hospital_id", hospitalId)
    .eq("department", dbDepartment)
    .is("end_date", null)
    .is("unit_name", null);

  const defaultRole = DEPT_ROLE_KEYS[input.department][0];

  for (const head of activeHeads ?? []) {
    if (String(head.staff_id) === staffId) continue;

    await admin
      .from("department_heads")
      .update({ end_date: today })
      .eq("id", head.id);

    await admin
      .from("staff_profiles")
      .update({ role: defaultRole, updated_at: new Date().toISOString() })
      .eq("id", head.staff_id)
      .eq("hospital_id", hospitalId)
      .eq("role", "hod");
  }

  const alreadyActive = (activeHeads ?? []).some((head) => String(head.staff_id) === staffId);
  if (!alreadyActive) {
    const { error: insertError } = await admin.from("department_heads").insert({
      hospital_id: hospitalId,
      department: dbDepartment,
      staff_id: staffId,
      start_date: today,
      created_by: actorId,
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  const { error: promoteError } = await admin
    .from("staff_profiles")
    .update({ role: "hod", updated_at: new Date().toISOString() })
    .eq("id", staffId)
    .eq("hospital_id", hospitalId);

  if (promoteError) {
    return { success: false, error: promoteError.message };
  }

  void logAuditEvent({
    action: "hr.department_head_assigned",
    portal: "management",
    actorId: session.staff_id,
    actorName: session.full_name,
    hospitalId,
    department: session.department,
    entityType: "staff_profile",
    entityId: staffId,
    payload: {
      department: input.department,
      assigned_to: staffRow.full_name ?? staffId,
    },
  });

  return { success: true };
}
