import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/modules/rbac/session-context";
import { TenantProviderWrapper } from "@/components/providers/tenant-provider-wrapper";
import { getServerSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  return (
    <TenantProviderWrapper>
      <SessionProvider session={session}>
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </TenantProviderWrapper>
  );
}
