"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { getPendingSetupsAction, type PendingSetupRecord } from "@/server/actions/it/get-pending-setups";
import { markSetupDoneAction } from "@/server/actions/it/mark-setup-done";

const DEPT_LABELS: Record<string, string> = {
  doctors: "Doctors", nurses: "Nurses", pharmacy: "Pharmacy",
  lab: "Lab", frontdesk: "Front Desk", accounts: "Accounts",
  store: "Store", hr: "HR", it: "IT", admin: "Admin",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", hod: "Head of Dept", hr_manager: "HR Manager",
  hr_staff: "HR Staff", doctor: "Doctor", nurse: "Nurse",
  pharmacist: "Pharmacist", pharmacy_assistant: "Pharmacy Assistant",
  lab_scientist: "Lab Scientist", accountant: "Accountant",
  front_desk_staff: "Front Desk Staff", store_keeper: "Store Keeper",
  it_staff: "IT Staff", viewer: "Viewer",
};

export default function ITOnboardingQueuePage() {
  const [records, setRecords] = useState<PendingSetupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await getPendingSetupsAction();
    if (result.success) {
      setRecords(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMarkDone(userId: string, name: string) {
    setMarking(userId);
    const result = await markSetupDoneAction(userId);
    if (result.success) {
      setRecords((prev) => prev.filter((r) => r.id !== userId));
      setToast({ message: `${name} marked as setup complete.`, type: "success" });
    } else {
      setToast({ message: `Failed: ${result.error}`, type: "error" });
    }
    setMarking(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Onboarding Queue"
          description="New staff accounts awaiting IT workstation and system setup confirmation."
        />
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
          Loading…
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
          <p className="font-semibold text-slate-500">All clear</p>
          <p className="mt-1 text-sm">No pending IT setups. All staff accounts are confirmed.</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">
              Pending Setup{" "}
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {records.length}
              </span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{r.full_name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {DEPT_LABELS[r.department] ?? r.department}
                    </span>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                      {ROLE_LABELS[r.role] ?? r.role}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{r.email}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Account created{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleMarkDone(r.id, r.full_name)}
                    disabled={marking === r.id}
                  >
                    {marking === r.id ? "Saving…" : "Mark Setup Done"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
