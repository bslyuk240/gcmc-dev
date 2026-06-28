import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { getPlatformWorkforceSummaries } from "@/modules/workforce/metrics/platform-service";
import { PlatformWorkforceConsole } from "./workforce-console-client";

export default async function PlatformWorkforcePage() {
  await requirePlatformAccess();
  const summaries = await getPlatformWorkforceSummaries();

  return <PlatformWorkforceConsole summaries={summaries} />;
}
