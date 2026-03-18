import type { DepartmentKey } from "@/lib/constants/navigation";
import { getDepartmentHomePath, requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function requireDepartmentRouteAccess(
  department: DepartmentKey,
) {
  const session = await requireSession();

  if (session.department !== department) {
    redirect(getDepartmentHomePath(session.department));
  }

  return session;
}
