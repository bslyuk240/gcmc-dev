"use client";

import { HodPerformancePage } from "@/components/hod/hod-performance-page";
import { HrPerformanceOverview } from "@/components/hr/hr-performance-overview";
import { useHMSSession } from "@/modules/rbac/hooks";

export default function HRPerformancePage() {
  const session = useHMSSession();

  if (session && ["hr_manager", "hr_staff", "admin"].includes(session.role)) {
    return <HrPerformanceOverview />;
  }

  return <HodPerformancePage department="hr" />;
}
