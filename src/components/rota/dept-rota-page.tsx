"use client";

import { PageHeader } from "@/components/layout/page-header";
import { DeptRotaBuilder } from "@/components/rota/dept-rota-builder";
import { useHMSSession } from "@/modules/rbac/hooks";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import { DB_TO_STAFF_DEPT } from "@/lib/data/hr-store";

export function DeptRotaPage({ department }: { department: DBDepartmentKey }) {
  const session = useHMSSession();
  const deptDisplayName = DB_TO_STAFF_DEPT[department] ?? department;

  const isHod   = session?.role === "hod";
  const isAdmin = session?.role === "admin";
  const isHR    = session?.role === "hr_manager" || session?.role === "hr_staff";
  const canManage = isHod || isAdmin || isHR;

  if (!session) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rota Management" description={`${deptDisplayName} shift schedules.`} />
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          Rota management is available to Heads of Department, HR, and Admin. Your current role does not have access to manage rotas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rota Management"
        description={`Manage weekly shift schedules for the ${deptDisplayName} department.`}
      />
      <DeptRotaBuilder department={department} deptDisplayName={deptDisplayName} />
    </div>
  );
}
