"use client";

import { useEffect, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import { isWorkforceAdmin } from "@/lib/workforce/access";
import { WorkforceDashboard } from "@/components/workforce/workforce-dashboard";

export default function WorkforceDashboardPage() {
  const session = useHMSSession();
  const [unitName, setUnitName] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      if (isWorkforceAdmin(session)) return;
      const unit = await fetchMyNcUnit(session.staff_id);
      setUnitName(unit);
    })();
  }, [session]);

  if (!session) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <WorkforceDashboard
      unitName={isWorkforceAdmin(session) ? null : unitName}
      title="Workforce Dashboard"
      description="On-duty staff, leave, tasks, and unit activity at a glance."
    />
  );
}
