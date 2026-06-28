import type { DepartmentKey } from "@/lib/constants/navigation";

/**
 * Canonical role keys — must match the role_key enum in the database.
 */
export type RoleKey =
  | "admin"
  | "hod"
  | "hr_manager"
  | "hr_staff"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "pharmacy_assistant"
  | "lab_scientist"
  | "accountant"
  | "front_desk_staff"
  | "store_keeper"
  | "it_staff"
  | "non_clinical_staff"
  | "nhis_officer"
  | "nhis_manager"
  | "viewer"
  | "platform_admin";

/**
 * Session payload stored in HMS session cookies and forwarded as
 * request headers by middleware so Server Components can read it cheaply.
 */
export type HMSSession = {
  staff_id: string;
  auth_user_id?: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  department: DepartmentKey;
  role: RoleKey;
  /** Tenant UUID — must match resolved subdomain/path tenant */
  hospital_id: string;
  /** Tenant slug — compared at middleware edge without a DB lookup */
  hospital_slug: string;
  /** Flat permission strings e.g. "pharmacy:inventory:read" */
  permissions: string[];
  /** ISO timestamp of when the session was last refreshed */
  issued_at: string;
  /** Platform operator entered this tenant from the platform console */
  platform_entry?: boolean;
};
