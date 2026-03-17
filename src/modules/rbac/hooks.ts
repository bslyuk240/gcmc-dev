"use client";

import { useSession } from "@/modules/rbac/session-context";

/**
 * Returns true when the current session includes the specified permission.
 * Admin wildcard ('*:*:*') always returns true.
 *
 * @example
 * const canDispense = usePermission(PERMISSIONS.pharmacy.prescriptions.dispense);
 */
export function usePermission(permission: string): boolean {
  const { hasPermission } = useSession();
  return hasPermission(permission);
}

/**
 * Returns true when the current session includes ANY of the specified permissions.
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = useSession();
  return hasAnyPermission(permissions);
}

/**
 * Returns the current HMS session object (or null if not authenticated).
 */
export function useHMSSession() {
  const { session } = useSession();
  return session;
}

/**
 * Returns true when the current user has the admin role.
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = useSession();
  return isAdmin;
}
