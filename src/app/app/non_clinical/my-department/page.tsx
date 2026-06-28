"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import { isWorkforceAdmin } from "@/lib/workforce/access";
import { UnitManager } from "@/components/non-clinical/unit-manager";

export default function WorkforceMyDepartmentPage() {
  const session = useHMSSession();
  const { staff } = useHRStore();
  const [unitName, setUnitName] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (isWorkforceAdmin(session)) return;
    void fetchMyNcUnit(session.staff_id).then(setUnitName);
  }, [session]);

  const unitStaff = staff.filter(
    (s) => s.department === "Non-Clinical Staff" && (!unitName || s.unit === unitName),
  );
  const active = unitStaff.filter((s) => s.status === "Active");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Department"
        description={unitName ? `${unitName} — staff list and daily activity.` : "All non-clinical units and staff."}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Staff", value: unitStaff.length },
          { label: "Active", value: active.length },
          { label: "Inactive", value: unitStaff.length - active.length },
        ].map((s) => (
          <Card key={s.label} className="border-0 bg-lime-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-lime-800">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Department Members</h3>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Name", "Role", "Unit", "Phone", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unitStaff.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3">{s.role}</td>
                <td className="px-5 py-3">{s.unit ?? "—"}</td>
                <td className="px-5 py-3">{s.phone || "—"}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{s.status}</span></td>
              </tr>
            ))}
            {unitStaff.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No staff in this view.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      {isWorkforceAdmin(session!) ? (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Unit Management</h2>
          <UnitManager />
        </section>
      ) : null}
    </div>
  );
}
