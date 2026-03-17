import { StaffPortalShell } from "@/components/staff-portal/staff-shell";
import { SessionProvider } from "@/modules/rbac/session-context";
import {
  getServerSession,
  getCurrentSession,
  type HMSSession,
} from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: { default: "Staff Portal", template: "%s | Staff Portal" },
  description: "GCMC Staff Self-Service — rota, leave, payslips, and profile.",
};

/**
 * Build a synthetic HMSSession from the legacy mock cookies so the staff
 * portal works even before Supabase auth is fully wired up.
 */
async function resolveSession(): Promise<HMSSession | null> {
  // 1. Prefer the real v2 session (Supabase auth)
  const v2 = await getServerSession();
  if (v2) return v2;

  // 2. Fall back to legacy mock-login cookies
  const legacy = await getCurrentSession();
  if (!legacy.hasSession || !legacy.department) return null;

  return {
    staff_id:    "mock-staff-id",
    full_name:   legacy.staffName ?? "Staff Member",
    email:       `${legacy.department}@gcmc.ng`,
    department:  legacy.department,
    role:        legacy.role ?? "front_desk_staff",
    permissions: legacy.permissions ?? [],
    issued_at:   new Date().toISOString(),
  };
}

export default async function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSession();

  if (!session) {
    redirect("/staff/login");
  }

  return (
    <SessionProvider session={session}>
      <StaffPortalShell session={session}>
        {children}
      </StaffPortalShell>
    </SessionProvider>
  );
}
