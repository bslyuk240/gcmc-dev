import { StaffPortalShell } from "@/components/staff-portal/staff-shell";
import { SessionProvider } from "@/modules/rbac/session-context";
import { TenantProviderWrapper } from "@/components/providers/tenant-provider-wrapper";
import {
  getStaffPortalSession,
  type HMSSession,
} from "@/lib/auth/session";
import { getTenantBranding } from "@/lib/tenant/get-branding";

export async function generateMetadata() {
  const branding = await getTenantBranding();
  return {
    title: { default: "Staff Portal", template: `%s | ${branding.shortName} Staff Portal` },
    description: `${branding.name} Staff Self-Service — rota, leave, payslips, and profile.`,
  };
}

export default async function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: HMSSession | null = await getStaffPortalSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <TenantProviderWrapper>
      <SessionProvider session={session}>
        <StaffPortalShell session={session}>
          {children}
        </StaffPortalShell>
      </SessionProvider>
    </TenantProviderWrapper>
  );
}
