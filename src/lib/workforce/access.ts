import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type { HMSSession } from "@/lib/auth/session-types";

export const WORKFORCE_DEPARTMENT: DBDepartmentKey = "non_clinical";

export function isWorkforceAdmin(session: HMSSession): boolean {
  return (
    session.role === "admin"
    || session.role === "hr_manager"
    || session.role === "hr_staff"
  );
}

/** Clinical-style HOD for a department key. */
export function isDepartmentHod(session: HMSSession, department: DBDepartmentKey): boolean {
  return session.role === "hod" && session.department === department;
}

/** NC unit HOD: assigned as hod under non_clinical (unit resolved separately). */
export function isWorkforceUnitHod(session: HMSSession): boolean {
  return isDepartmentHod(session, WORKFORCE_DEPARTMENT);
}

export function canAccessWorkforcePortal(session: HMSSession): boolean {
  if (isWorkforceAdmin(session)) return true;
  if (session.department === WORKFORCE_DEPARTMENT) return true;
  if (isWorkforceUnitHod(session)) return true;
  return false;
}

export function canManageWorkforceUnit(
  session: HMSSession,
  unitName: string | null | undefined,
  hodUnitName: string | null | undefined,
): boolean {
  if (isWorkforceAdmin(session)) return true;
  if (!isWorkforceUnitHod(session)) return false;
  if (!unitName || !hodUnitName) return false;
  return unitName === hodUnitName;
}

export function canManageWorkforceRota(
  session: HMSSession,
  hodUnitName?: string | null,
  targetUnit?: string | null,
): boolean {
  if (isWorkforceAdmin(session)) return true;
  if (!isWorkforceUnitHod(session)) return false;
  if (!targetUnit) return Boolean(hodUnitName);
  return hodUnitName === targetUnit;
}

export function canCreateWorkforceTasks(session: HMSSession): boolean {
  return isWorkforceAdmin(session) || isWorkforceUnitHod(session);
}

export { canUpdateWorkforceTask } from "@/modules/staff-portal/access";

export function canReviewWorkforceLeave(session: HMSSession): boolean {
  if (isWorkforceAdmin(session)) return true;
  return isWorkforceUnitHod(session);
}

export function canManageWorkforceTasks(
  session: HMSSession,
  hodUnitName?: string | null,
  targetUnit?: string | null,
): boolean {
  return canManageWorkforceRota(session, hodUnitName, targetUnit);
}

export function canViewWorkforceReports(session: HMSSession): boolean {
  return canAccessWorkforcePortal(session);
}
