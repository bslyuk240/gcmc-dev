import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type { HMSSession } from "@/lib/auth/session-types";
import { WORKFORCE_DEPARTMENT, isWorkforceUnitHod } from "@/lib/workforce/access";

export function canManageDepartmentRota(
  session: HMSSession,
  department: DBDepartmentKey,
): boolean {
  if (session.role === "admin") return true;
  if (session.role === "hr_manager" || session.role === "hr_staff") return true;
  if (department === WORKFORCE_DEPARTMENT && isWorkforceUnitHod(session)) return true;
  return session.role === "hod" && session.department === department;
}
