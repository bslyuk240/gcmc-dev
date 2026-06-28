import { requirePlatformAdmin } from "@/lib/server/platformAccess";
import { getPlatformSettings } from "@/lib/platform/settings";
import { PageHeader } from "@/components/platform/page-shell";
import { SettingsPageClient } from "./settings-page-client";

export default async function PlatformSettingsPage() {
  await requirePlatformAdmin();
  const settings = await getPlatformSettings();

  // Check which env vars are configured (exposed as booleans — never send keys to client)
  const envStatus = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasPaystackSecret: !!process.env.PAYSTACK_SECRET_KEY,
    mailFrom: process.env.MAIL_FROM?.trim() ?? null,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() ?? null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    nodeEnv: process.env.NODE_ENV ?? "production",
    defaultSlug: process.env.DEFAULT_HOSPITAL_SLUG ?? "gcmc",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" subtitle="Configure platform-wide settings, integrations, and system preferences." />
      <SettingsPageClient settings={settings} envStatus={envStatus} />
    </div>
  );
}
