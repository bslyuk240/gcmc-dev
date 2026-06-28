import "server-only";

import { getServerSession } from "@/lib/auth/session";
import type { HMSSession } from "@/lib/auth/session-types";

export type StoreAccessLevel = "view" | "fulfill" | "procure" | "approve";

const STORE_DEPARTMENTS = new Set(["store", "admin"]);

export function canViewStore(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (STORE_DEPARTMENTS.has(session.department)) return true;
  return (
    session.permissions.includes("store:inventory:read") ||
    session.permissions.includes("store:requests:read")
  );
}

export function canSubmitRequisition(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  return session.department !== "store" || session.permissions.includes("store:requests:read");
}

export function canFulfillRequisition(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "store") return true;
  return session.permissions.includes("store:requests:fulfill");
}

export function canManageProcurement(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "store") return true;
  return session.permissions.includes("store:procurement:create");
}

export function canApproveProcurement(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.role === "hod") return true;
  return session.permissions.includes("store:procurement:approve");
}

export async function requireStoreSession(level: StoreAccessLevel = "view"): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const allowed =
    level === "view" ? canViewStore(session) || canSubmitRequisition(session)
    : level === "fulfill" ? canFulfillRequisition(session)
    : level === "procure" ? canManageProcurement(session)
    : canApproveProcurement(session);

  if (!allowed) throw new Error("Forbidden");
  return session;
}
