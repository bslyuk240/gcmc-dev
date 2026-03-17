/**
 * Server-side RBAC guard helpers.
 *
 * Use these in:
 *   - Server Actions (`"use server"` files)
 *   - Route Handlers (`app/api/**`)
 *   - Server Components that must gate content
 *
 * All helpers throw / redirect when the check fails.
 */

import { redirect } from "next/navigation";
import type { HMSSession, RoleKey } from "@/lib/auth/session";
import type { DepartmentKey } from "@/lib/constants/navigation";
import { hasPermission, hasAnyPermission } from "@/modules/rbac/permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string };

// ─── Core guards (throw-style — for use in Server Actions / API routes) ───────

/**
 * Assert the session carries a specific role.
 * Redirects to /access-denied if not.
 */
export function requireRole(session: HMSSession | null, role: RoleKey): void {
  if (!session) redirect("/login");
  if (session.role !== role && session.role !== "admin") {
    redirect("/access-denied");
  }
}

/**
 * Assert the session carries any of the listed roles.
 */
export function requireAnyRole(session: HMSSession | null, roles: RoleKey[]): void {
  if (!session) redirect("/login");
  if (!roles.includes(session.role) && session.role !== "admin") {
    redirect("/access-denied");
  }
}

/**
 * Assert the session has a specific permission.
 */
export function requirePermission(session: HMSSession | null, permission: string): void {
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, permission)) {
    redirect("/access-denied");
  }
}

/**
 * Assert the session has any of the listed permissions.
 */
export function requireAnyPermission(session: HMSSession | null, permissions: string[]): void {
  if (!session) redirect("/login");
  if (!hasAnyPermission(session.permissions, permissions)) {
    redirect("/access-denied");
  }
}

/**
 * Assert the session is scoped to a specific department.
 * Admins pass regardless of their department.
 */
export function requireDepartment(
  session: HMSSession | null,
  department: DepartmentKey,
): void {
  if (!session) redirect("/login");
  if (session.role === "admin") return;
  if (session.department !== department) {
    redirect("/access-denied");
  }
}

// ─── Soft guards (return-style — for conditional rendering) ──────────────────

export function canAccess(session: HMSSession | null, permission: string): boolean {
  if (!session) return false;
  return hasPermission(session.permissions, permission);
}

export function isRole(session: HMSSession | null, role: RoleKey): boolean {
  if (!session) return false;
  return session.role === role;
}

export function isDepartment(session: HMSSession | null, dept: DepartmentKey): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.department === dept;
}

export function isAdmin(session: HMSSession | null): boolean {
  return session?.role === "admin";
}
