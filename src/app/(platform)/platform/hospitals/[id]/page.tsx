import { notFound } from "next/navigation";
import { getPlatformHospitalAction } from "@/server/actions/platform/hospitals";
import { getHospitalSubscriptionAction } from "@/server/actions/platform/subscriptions";
import { HospitalManageClient } from "./hospital-manage-client";

export default async function PlatformHospitalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [hospitalResult, subResult] = await Promise.all([
    getPlatformHospitalAction(id),
    getHospitalSubscriptionAction(id),
  ]);

  if (!hospitalResult.success) {
    if (hospitalResult.error === "Hospital not found.") notFound();
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {hospitalResult.error}
      </div>
    );
  }

  return (
    <HospitalManageClient
      hospital={hospitalResult.data}
      subscription={subResult.success ? subResult.data : null}
    />
  );
}
