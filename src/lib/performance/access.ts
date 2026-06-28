import { isDBDepartmentKey, type DBDepartmentKey } from "@/lib/constants/navigation";
import type { HMSSession } from "@/lib/auth/session-types";
import { WORKFORCE_DEPARTMENT, isWorkforceUnitHod } from "@/lib/workforce/access";

export function canManagePerformanceForDepartment(
  session: HMSSession,
  department: DBDepartmentKey,
): boolean {
  if (session.role === "admin") return true;
  if (session.role === "hr_manager" || session.role === "hr_staff") return true;
  if (department === WORKFORCE_DEPARTMENT && isWorkforceUnitHod(session)) return true;
  return session.role === "hod" && session.department === department;
}

export function canViewAnyPerformance(session: HMSSession): boolean {
  return ["admin", "hr_manager", "hr_staff", "hod"].includes(session.role);
}

export function isHodSelfReview(session: HMSSession, staffId: string): boolean {
  return session.role === "hod" && session.staff_id === staffId;
}
