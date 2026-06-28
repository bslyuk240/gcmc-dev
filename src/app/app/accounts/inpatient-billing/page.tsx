"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import type { InpatientStay, InpatientStaySummary } from "@/lib/inpatient/types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  discharged: "bg-slate-100 text-slate-600",
};

const SOURCE_STYLES: Record<string, string> = {
  inpatient: "bg-indigo-50 text-indigo-700",
  nursing: "bg-violet-50 text-violet-700",
  lab: "bg-sky-50 text-sky-700",
  pharmacy: "bg-amber-50 text-amber-700",
  consultation: "bg-emerald-50 text-emerald-700",
};

function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

function formatWhen(value?: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InpatientBillingPage() {
  const [stays, setStays] = useState<InpatientStay[]>([]);
  const [summary, setSummary] = useState<InpatientStaySummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "discharged" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const loadStays = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/inpatient/stays${query}`);
      if (res.ok) {
        const data = await res.json();
        setStays(data.stays ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadSummary = useCallback(async (stayId: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/inpatient/stays?stayId=${encodeURIComponent(stayId)}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary ?? null);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStays();
  }, [loadStays]);

  useEffect(() => {
    if (selectedId) void loadSummary(selectedId);
    else setSummary(null);
  }, [selectedId, loadSummary]);

  async function handleAddBedDay() {
    if (!selectedId) return;
    setActing(true);
    try {
      const res = await fetch("/api/inpatient/stays", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_bed_day", stayId: selectedId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not add bed-day charge.");
      setToast({ message: "Bed-day charge added.", type: "success" });
      await loadSummary(selectedId);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Could not add bed-day charge.",
        type: "error",
      });
    } finally {
      setActing(false);
    }
  }

  async function markInpatientChargePaid(chargeId: string) {
    setActing(true);
    try {
      const res = await fetch("/api/inpatient/charges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId, status: "Paid" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not update charge.");
      setToast({ message: "Charge marked as paid.", type: "success" });
      if (selectedId) await loadSummary(selectedId);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Could not update charge.",
        type: "error",
      });
    } finally {
      setActing(false);
    }
  }

  const selectedStay = stays.find((stay) => stay.id === selectedId) ?? summary?.stay ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inpatient Billing"
        description="Roll up bed days, consumables, nursing procedures, lab, pharmacy, and consultation charges for each admission stay."
      />

      <div className="flex flex-wrap gap-2">
        {(["active", "discharged", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setSelectedId(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === value ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="font-bold text-slate-900">Inpatient stays</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : stays.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">No inpatient stays found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stays.map((stay) => (
                <button
                  key={stay.id}
                  type="button"
                  onClick={() => setSelectedId(stay.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                    selectedId === stay.id ? "bg-violet-50/70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{stay.patientName}</p>
                      <p className="text-xs text-slate-500">
                        {stay.unit} · Bed {stay.bed ?? "--"} · {stay.patientId}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[stay.status]}`}>
                      {stay.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Admitted {formatWhen(stay.admittedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          {!selectedStay ? (
            <p className="py-16 text-center text-sm text-slate-400">Select a stay to view the inpatient bill rollup.</p>
          ) : summaryLoading && !summary ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedStay.patientName}</h3>
                  <p className="text-sm text-slate-500">
                    {selectedStay.unit} · Bed {selectedStay.bed ?? "--"} · Dr {selectedStay.doctorInCharge ?? "--"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatWhen(selectedStay.admittedAt)}
                    {selectedStay.dischargedAt ? ` → ${formatWhen(selectedStay.dischargedAt)}` : " → present"}
                  </p>
                </div>
                {selectedStay.status === "active" ? (
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => void handleAddBedDay()}>
                    Add today&apos;s bed day
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{money(summary?.totals.all ?? 0)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{money(summary?.totals.pending ?? 0)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paid</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{money(summary?.totals.paid ?? 0)}</p>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Source", "Category", "Description", "Amount", "Status", ""].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(summary?.lines ?? []).map((line) => (
                      <tr key={`${line.source}-${line.id}`}>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${SOURCE_STYLES[line.source] ?? "bg-slate-100 text-slate-600"}`}>
                            {line.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{line.category}</td>
                        <td className="px-4 py-3 text-slate-800">{line.description}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{money(line.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{line.status}</td>
                        <td className="px-4 py-3 text-right">
                          {line.source === "inpatient" && line.status !== "Paid" && line.status !== "Waived" ? (
                            <Button size="sm" variant="outline" disabled={acting} onClick={() => void markInpatientChargePaid(line.id)}>
                              Mark paid
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {(summary?.lines.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                          No charge lines yet for this stay.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-500">
                Nursing, lab, pharmacy, and consultation lines are linked automatically by patient ID during the stay window.
                Collect those charges from their respective Accounts billing pages.
              </p>
            </div>
          )}
        </Card>
      </div>

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
