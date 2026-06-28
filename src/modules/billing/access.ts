import "server-only";

import { getServerSession } from "@/lib/auth/session";
import type { HMSSession } from "@/lib/auth/session-types";

export type BillingAccessLevel = "view" | "receive" | "adjust" | "close";

const VIEW_DEPARTMENTS = new Set(["accounts", "admin"]);
const CROSS_DEPARTMENT_ROLES = new Set(["admin", "hr_manager", "hr_staff"]);

export function canViewBilling(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (VIEW_DEPARTMENTS.has(session.department)) return true;
  if (CROSS_DEPARTMENT_ROLES.has(session.role)) return true;
  return session.permissions.includes("payment.receive") || session.permissions.includes("invoice.create");
}

export function canReceivePayment(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "accounts") return true;
  return session.permissions.includes("payment.receive");
}

export function canAdjustCharges(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "accounts" && (session.role === "hod" || session.role === "accountant")) return true;
  return session.permissions.includes("refund.approve");
}

export function canCloseDay(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "accounts" && (session.role === "hod" || session.role === "accountant")) return true;
  return false;
}

export async function requireBillingSession(level: BillingAccessLevel = "view"): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const allowed =
    level === "view" ? canViewBilling(session)
    : level === "receive" ? canReceivePayment(session)
    : level === "adjust" ? canAdjustCharges(session)
    : canCloseDay(session);

  if (!allowed) throw new Error("Forbidden");
  return session;
}
