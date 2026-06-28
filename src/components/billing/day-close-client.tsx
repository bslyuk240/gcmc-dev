"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { fetchDayClose, money, postDayClose } from "@/lib/billing/client";
import type { DayClosureSummary } from "@/modules/billing/types";

export function DayCloseClient() {
  const [summary, setSummary] = useState<DayClosureSummary | null>(null);
  const [countedCash, setCountedCash] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchDayClose();
      setSummary(data);
      if (data.status === "open") setCountedCash(String(data.expectedCash || ""));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to load day close.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleClose() {
    const value = Number(countedCash);
    if (Number.isNaN(value)) {
      setToast({ message: "Enter a valid counted cash amount.", type: "error" });
      return;
    }
    setProcessing(true);
    try {
      const closed = await postDayClose({ countedCash: value, businessDate: summary?.businessDate });
      setSummary(closed);
      setToast({ message: "Business day closed successfully.", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Day close failed.", type: "error" });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Day Close" description="Reconcile cashier collections and close the business day." />
      {loading || !summary ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Business date", value: summary.businessDate },
              { label: "Collected", value: money(summary.collectedToday) },
              { label: "Expected cash", value: money(summary.expectedCash) },
              { label: "Status", value: summary.status },
            ].map((card) => (
              <Card key={card.label} className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
              </Card>
            ))}
          </div>

          {summary.status === "open" ? (
            <Card className="max-w-lg p-5">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Counted cash in drawer</label>
              <input
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <Button disabled={processing} onClick={() => void handleClose()} className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700">
                Close business day
              </Button>
            </Card>
          ) : (
            <Card className="max-w-lg p-5 text-sm text-slate-600">
              Closed {summary.closedAt ? new Date(summary.closedAt).toLocaleString("en-GB") : ""} by {summary.closedByName ?? "—"}.
              {summary.variance != null ? ` Variance: ${money(summary.variance)}.` : ""}
            </Card>
          )}
        </>
      )}
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
