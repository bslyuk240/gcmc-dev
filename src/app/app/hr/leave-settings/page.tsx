"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { setLeavePolicy, type LeaveYearPolicy } from "@/lib/data/hr-store";

export default function LeaveSettingsPage() {
  const session = useHMSSession();
  const { leavePolicies } = useHRStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [annualDays, setAnnualDays] = useState("21");
  const [carryForwardDays, setCarryForwardDays] = useState("0");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [saving, setSaving] = useState(false);

  const currentPolicy = useMemo(
    () => leavePolicies.find((policy) => policy.year === year) ?? null,
    [leavePolicies, year],
  );

  useEffect(() => {
    if (currentPolicy) {
      setAnnualDays(String(currentPolicy.annualDays));
      setCarryForwardDays(String(currentPolicy.carryForwardDays));
      setNotes(currentPolicy.notes ?? "");
      return;
    }
    setAnnualDays("21");
    setCarryForwardDays("0");
    setNotes("");
  }, [currentPolicy]);

  const policyYears = [...leavePolicies].sort((left, right) => right.year - left.year);
  const currentEntitlement = Number(annualDays || 0) + Number(carryForwardDays || 0);

  async function handleSave() {
    if (!Number.isFinite(year) || year < 2000) {
      setToast({ type: "error", message: "Enter a valid policy year." });
      return;
    }

    const policy: LeaveYearPolicy = {
      year,
      annualDays: Number(annualDays) || 0,
      carryForwardDays: Number(carryForwardDays) || 0,
      notes: notes.trim() || undefined,
      updatedBy: session?.full_name ?? "HR Manager",
      createdAt: currentPolicy?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await setLeavePolicy(policy);
      setToast({ type: "success", message: `Leave policy saved for ${year}.` });
    } catch {
      setToast({ type: "error", message: "Failed to save leave policy." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <PageHeader
        title="Annual Leave Settings"
        description="Set the leave entitlement for the year. Staff leave balances will read from this policy."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Policy Year", value: year, color: "text-slate-900" },
          { label: "Annual Days", value: Number(annualDays || 0), color: "text-indigo-700" },
          { label: "Carry Forward", value: Number(carryForwardDays || 0), color: "text-emerald-700" },
          { label: "Current Entitlement", value: currentEntitlement, color: "text-violet-700" },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4 p-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Edit Policy</h3>
            <p className="text-sm text-slate-500">Choose a year and set the entitlement used by staff leave balances.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Year</label>
              <input
                type="number"
                min={2000}
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Annual Days</label>
              <input
                type="number"
                min={0}
                value={annualDays}
                onChange={(event) => setAnnualDays(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Carry Forward Days</label>
              <input
                type="number"
                min={0}
                value={carryForwardDays}
                onChange={(event) => setCarryForwardDays(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Updated By</label>
              <input
                value={session?.full_name ?? "HR Manager"}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Policy notes, carry-over rules, or HR guidance..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="md" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save Policy"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Saved Policies</h3>
            <p className="text-sm text-slate-500">The staff portal uses the most recent policy for the selected year.</p>
          </div>
          <div className="space-y-3">
            {policyYears.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                No leave policies saved yet.
              </div>
            )}
            {policyYears.map((policy) => (
              <button
                key={policy.year}
                type="button"
                onClick={() => setYear(policy.year)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  policy.year === year
                    ? "border-violet-200 bg-violet-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{policy.year}</p>
                    <p className="text-xs text-slate-500">
                      {policy.annualDays} annual days
                      {policy.carryForwardDays > 0 ? ` + ${policy.carryForwardDays} carry forward` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {policy.year === year ? "Active" : "Loaded"}
                  </span>
                </div>
                {policy.notes && <p className="mt-2 text-xs text-slate-500">{policy.notes}</p>}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
