import type { HMSSession } from "@/lib/auth/session-types";

export function canManageItHelpdesk(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department !== "it") return false;
  return session.role === "it_staff" || session.role === "hod";
}

export function canViewItHelpdesk(session: HMSSession): boolean {
  if (canManageItHelpdesk(session)) return true;
  if (session.role === "admin") return true;
  return ["hr_manager", "hr_staff"].includes(session.role);
}
