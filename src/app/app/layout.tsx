import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/modules/rbac/session-context";
import { getServerSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
