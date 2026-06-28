import { requirePlatformAdmin } from "@/lib/server/platformAccess";
import { getPlatformSettings } from "@/lib/platform/settings";
import { PageHeader } from "@/components/platform/page-shell";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
  await requirePlatformAdmin();
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans & pricing"
        subtitle="Create and manage plans, features, and limits."
      />
      <PlansClient settings={settings} />
    </div>
  );
}
