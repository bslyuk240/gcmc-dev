import { StaffPortalShell } from "@/components/staff-portal/staff-shell";
import { SessionProvider } from "@/modules/rbac/session-context";
import {
  getStaffPortalSession,
  type HMSSession,
} from "@/lib/auth/session";
import { redirect } from "next/navigation";

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
  // This enforces portal isolation — a management login does not grant staff portal access.
  const session: HMSSession | null = await getStaffPortalSession();

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
