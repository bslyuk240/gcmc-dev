import type { HMSSession } from "@/lib/auth/session-types";

export function canViewInpatientBilling(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (canRecordInpatientCharges(session)) return true;
  if (session.department === "accounts") return true;
  if (session.department === "admin") return true;
  if (session.department === "doctors") return session.role === "hod";
  return false;
}

export function canManageInpatientBilling(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "accounts") {
    return session.role === "accountant" || session.role === "hod";
  }
  return false;
}

export function canRecordInpatientCharges(session: HMSSession): boolean {
  if (session.role === "admin") return true;
  if (session.department === "nurses") {
    return session.role === "nurse" || session.role === "hod";
  }
  return false;
}

export function canOpenInpatientStay(session: HMSSession): boolean {
  return canRecordInpatientCharges(session) || canManageInpatientBilling(session);
}
