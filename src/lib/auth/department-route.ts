import type { DepartmentKey } from "@/lib/constants/navigation";
import { getDepartmentHomePath, requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const CROSS_DEPARTMENT_ROLES = new Set(["admin", "hr_manager", "hr_staff"]);

export async function requireDepartmentRouteAccess(
  department: DepartmentKey,
) {
  const session = await requireSession();

  if (CROSS_DEPARTMENT_ROLES.has(session.role)) {
    return session;
  }

  if (session.department !== department) {
    redirect(getDepartmentHomePath(session.department));
  }

  return session;
}
