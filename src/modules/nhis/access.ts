import "server-only";

import { getServerSession } from "@/lib/auth/session";
import type { HMSSession } from "@/lib/auth/session-types";

export type NhisAccessLevel = "view" | "manage" | "submit" | "approve";

const NHIS_DEPARTMENTS = new Set(["nhis", "admin"]);

export function canViewNhis(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (NHIS_DEPARTMENTS.has(session.department)) return true;
  return (
    session.permissions.includes("hmo_schemes:read") ||
    session.permissions.includes("hmo_enrollments:manage") ||
    session.permissions.includes("hmo_claims:manage")
  );
}

export function canManageEnrollments(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "nhis") return true;
  return session.permissions.includes("hmo_enrollments:manage");
}

export function canManageSchemes(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "nhis" && session.role === "hod") return true;
  return session.permissions.includes("hmo_schemes:manage");
}

export function canSubmitClaims(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "nhis") return true;
  return session.permissions.includes("hmo_claims:submit") || session.permissions.includes("hmo_claims:manage");
}

export function canApproveClaims(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "nhis" && (session.role === "hod" || session.role === "nhis_manager")) return true;
  return session.permissions.includes("hmo_claims:approve");
}

/** Front desk may create pending enrollments only */
export function canCreatePendingEnrollment(session: HMSSession): boolean {
  if (canManageEnrollments(session)) return true;
  if (session.department === "frontdesk") return true;
  return false;
}

/** Clinical staff may request HMO pre-authorization */
export function canRequestPreauth(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "nhis") return true;
  if (["doctors", "nurses"].includes(session.department)) return true;
  return false;
}

export async function requirePreauthRequestSession(): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  if (!canRequestPreauth(session)) throw new Error("Forbidden");
  return session;
}

export async function requireNhisSession(level: NhisAccessLevel = "view"): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const allowed =
    level === "view" ? canViewNhis(session)
    : level === "manage" ? canManageEnrollments(session) || canManageSchemes(session)
    : level === "submit" ? canSubmitClaims(session)
    : canApproveClaims(session);

  if (!allowed) throw new Error("Forbidden");
  return session;
}
