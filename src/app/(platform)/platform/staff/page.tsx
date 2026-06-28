import { requirePlatformAccess } from "@/lib/server/platformAccess";
import { listAllHospitalStaffAction } from "@/server/actions/platform/all-staff";
import { listPlatformStaffAction } from "@/server/actions/platform/staff";
import { PageHeader } from "@/components/platform/page-shell";
import { UsersRolesClient } from "./users-roles-client";

const ROLE_KEYS = ["admin","doctor","nurse","pharmacist","lab_scientist","radiographer","front_desk_staff","records_officer","hr","finance","it_support","security","porter","cleaner","dietitian"] as const;

export default async function UsersRolesPage() {
  await requirePlatformAccess();

  const [allStaffResult, platformStaffResult] = await Promise.all([
    listAllHospitalStaffAction({ perPage: 50 }),
    listPlatformStaffAction(),
  ]);

  const hospitalStaff = allStaffResult.success ? allStaffResult.data.staff : [];
  const total = allStaffResult.success ? allStaffResult.data.total : 0;
  const platformStaff = platformStaffResult.success ? platformStaffResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage platform admins and all tenant users."
      />
      <UsersRolesClient
        hospitalStaff={hospitalStaff}
        totalHospitalStaff={total}
        platformStaff={platformStaff}
        roleKeys={ROLE_KEYS as unknown as string[]}
      />
    </div>
  );
}
