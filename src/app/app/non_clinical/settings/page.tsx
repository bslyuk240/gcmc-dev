"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { UnitManager } from "@/components/non-clinical/unit-manager";
import { useHMSSession } from "@/modules/rbac/hooks";
import { isWorkforceAdmin } from "@/lib/workforce/access";

export default function WorkforceSettingsPage() {
  const session = useHMSSession();
  const canManageUnits = session && isWorkforceAdmin(session);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Settings"
        description="Configure units, shift defaults, and department context."
      />

      <Card className="p-5">
        <h3 className="font-bold text-slate-900">Department Info</h3>
        <p className="mt-2 text-sm text-slate-600">
          Non-clinical functions (Transport, Security, Cleaning, Store logistics) are organized as
          units under one Workforce Portal. Staff see their unit context; HODs manage their assigned unit.
        </p>
      </Card>

      {canManageUnits ? (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Units</h2>
          <UnitManager />
        </section>
      ) : (
        <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Unit configuration is managed by HR and Admin. Contact your administrator to update unit settings.
        </Card>
      )}
    </div>
  );
}
