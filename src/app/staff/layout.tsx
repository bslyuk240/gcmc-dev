import { StaffPortalShell } from "@/components/staff-portal/staff-shell";
import { SessionProvider } from "@/modules/rbac/session-context";
import {
  getStaffPortalSession,
  type HMSSession,
} from "@/lib/auth/session";

export const metadata = {
  title: { default: "Staff Portal", template: "%s | Staff Portal" },
  description: "GCMC Staff Self-Service — rota, leave, payslips, and profile.",
};

export default async function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read from the STAFF PORTAL cookie (hms-staff-session), not the management one.
  // Middleware already redirects unauthenticated requests on /staff/* (except /staff/login)
  // so here we just skip the shell for the login page (session will be null).
  const session: HMSSession | null = await getStaffPortalSession();

  if (!session) {
    // No session — render children as-is (this only happens on /staff/login)
    return <>{children}</>;
  }

  return (
    <SessionProvider session={session}>
      <StaffPortalShell session={session}>
        {children}
      </StaffPortalShell>
    </SessionProvider>
  );
}
