"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { canReviewWorkforceLeave, isWorkforceAdmin } from "@/lib/workforce/access";

export default function WorkforceMyTeamPage() {
  const session = useHMSSession();
  const { staff } = useHRStore();
  const [unitName, setUnitName] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void fetchMyNcUnit(session.staff_id).then(setUnitName);
  }, [session]);

  if (!session || (!canReviewWorkforceLeave(session) && !isWorkforceAdmin(session))) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <p className="text-lg font-semibold text-slate-700">HOD access required</p>
          <p className="mt-1 text-sm text-slate-400">My Team is available to unit heads, HR, and Admin.</p>
        </div>
      </div>
    );
  }

  const team = staff.filter(
    (s) => s.department === "Non-Clinical Staff" && s.status === "Active" && (!unitName || s.unit === unitName),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        description={unitName ? `Supervise ${unitName} staff — assign shifts, tasks, and approve leave.` : "Supervise non-clinical staff across units."}
      />

      <div className="flex flex-wrap gap-2">
        {[
          { href: `${INTERNAL_PREFIX}/non_clinical/attendance-rota`, label: "Assign Shifts" },
          { href: `${INTERNAL_PREFIX}/non_clinical/leave`, label: "Approve Leave" },
          { href: `${INTERNAL_PREFIX}/non_clinical/tasks`, label: "Assign Tasks" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--accent)]/40 hover:text-[var(--accent)]">
            {link.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Staff Member", "Role", "Unit", "Phone", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {team.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3">{s.role}</td>
                <td className="px-5 py-3">{s.unit ?? "—"}</td>
                <td className="px-5 py-3">{s.phone || "—"}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{s.status}</span></td>
              </tr>
            ))}
            {team.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No team members found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
