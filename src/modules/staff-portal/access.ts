import "server-only";

import { getServerSession, getStaffPortalSession } from "@/lib/auth/session";
import type { HMSSession } from "@/lib/auth/session-types";
import { isWorkforceAdmin, isWorkforceUnitHod } from "@/lib/workforce/access";

/** Staff portal or management session (staff self-service APIs). */
export async function resolveStaffSelfServiceSession(): Promise<HMSSession | null> {
  const staff = await getStaffPortalSession();
  if (staff) return staff;
  return getServerSession();
}

export async function requireStaffPortalSession(): Promise<HMSSession> {
  const session = await getStaffPortalSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function isHrRole(session: HMSSession): boolean {
  return ["admin", "hr_manager", "hr_staff"].includes(session.role);
}

export function canUpdateWorkforceTask(
  session: HMSSession,
  task: { assigneeId?: string | null; unitName?: string },
  hodUnitName?: string | null,
): boolean {
  if (task.assigneeId && task.assigneeId === session.staff_id) return true;
  if (isWorkforceAdmin(session)) return true;
  if (isWorkforceUnitHod(session) && task.unitName && hodUnitName === task.unitName) return true;
  return false;
}
