import "@/styles/platform-console.css";
import { PlatformNav } from "@/components/platform/PlatformNav";
import { PlatformTopBar } from "@/components/platform/PlatformTopBar";
import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { clearPlatformTenantSession } from "@/lib/platform/clear-tenant-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requirePlatformAccess();

  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await clearPlatformTenantSession(user.id);
    }
  }

  let pendingApprovals = 0;
  const db = createAdminClient();
  if (db) {
    const { count } = await db
      .from("hospital_signup_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingApprovals = count ?? 0;
  }

  return (
    <div
      data-platform-console
      className="flex h-screen overflow-hidden bg-[#f0f2f5]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <PlatformNav
        platformRole={profile.role as "platform_admin" | "platform_staff"}
        pendingApprovals={pendingApprovals}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PlatformTopBar
          staffName={profile.full_name}
          platformRole={profile.role as "platform_admin" | "platform_staff"}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
