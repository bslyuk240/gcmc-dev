"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { RotaBuilder } from "@/components/non-clinical/rota-builder";
import { useHMSSession } from "@/modules/rbac/hooks";
import { fetchNonClinicalUnits, fetchMyNcUnit, type NcUnit } from "@/lib/supabase/db";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function NonClinicalRotaPage() {
  const session = useHMSSession();

  const [units, setUnits]         = useState<NcUnit[]>([]);
  const [myUnit, setMyUnit]       = useState<string | null>(null);
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const isHod   = session?.role === "hod";
  const isHR    = session?.role === "hr_manager" || session?.role === "hr_staff";
  const isAdmin = session?.role === "admin";
  const canManageAll = isHR || isAdmin;

  useEffect(() => {
    if (!session) return;
    void (async () => {
      setLoading(true);
      try {
        const [fetchedUnits, hodUnit] = await Promise.all([
          fetchNonClinicalUnits(),
          isHod ? fetchMyNcUnit(session.staff_id) : Promise.resolve(null),
        ]);
        setUnits(fetchedUnits);
        if (isHod && hodUnit) {
          setMyUnit(hodUnit);
          setActiveUnit(hodUnit);
        } else if (canManageAll && fetchedUnits.length > 0) {
          setActiveUnit(fetchedUnits[0].name);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !session) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
      </div>
    );
  }

  // ── HOD with no unit assigned yet ─────────────────────────────────────────
  if (isHod && !myUnit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unit Rota" description="Manage shift schedules for your unit." />
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5">
          <p className="font-semibold text-amber-900">No unit assigned yet</p>
          <p className="mt-1 text-sm text-amber-700">
            You have been given the Head of Department role for Non-Clinical Staff, but you have
            not been assigned to a specific unit yet. Please ask HR to assign you as Unit Head
            for your unit from the{" "}
            <Link href={`${INTERNAL_PREFIX}/non_clinical`} className="font-semibold underline">
              Non-Clinical overview page
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // ── No access ─────────────────────────────────────────────────────────────
  if (!canManageAll && !isHod) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unit Rota" description="Shift schedules for non-clinical units." />
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600">
          Rota management is available to Unit Heads (HODs) and HR. Your role does not have
          access to create or edit rotas.
        </div>
      </div>
    );
  }

  // ── No units exist ────────────────────────────────────────────────────────
  if (units.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unit Rota" description="Shift schedules for non-clinical units." />
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-500">
          No units have been created yet. Visit the{" "}
          <Link href={`${INTERNAL_PREFIX}/non_clinical`} className="font-semibold text-[var(--accent)] hover:underline">
            overview page
          </Link>{" "}
          to add units.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Rota"
        description={
          isHod && myUnit
            ? `Managing shifts for ${myUnit}`
            : "Manage shift schedules across all non-clinical units."
        }
      />

      {/* Unit tabs — HR/Admin can switch between units; HOD sees only their unit */}
      {canManageAll && units.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {units.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setActiveUnit(u.name)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeUnit === u.name
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Rota builder */}
      {activeUnit ? (
        <RotaBuilder unitName={activeUnit} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-400">
          Select a unit above to view or edit its rota.
        </div>
      )}
    </div>
  );
}
