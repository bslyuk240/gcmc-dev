"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Toast, type ToastData } from "@/components/ui/toast";
import { fetchBillingLedger, money } from "@/lib/billing/client";
import { departmentLabel, paymentMethodLabel } from "@/modules/billing/mappers";
import type { BillingLedgerEntry } from "@/modules/billing/types";

export function TransactionLedgerClient() {
  const [entries, setEntries] = useState<BillingLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setEntries(await fetchBillingLedger());
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : "Failed to load ledger.", type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Transaction Ledger" description="All posted billing payments with charge allocations." />
      <Card>
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{entry.paymentNumber}</p>
                    <p className="text-xs text-slate-400">
                      {paymentMethodLabel(entry.paymentMethod)} · {entry.receivedByName} · {new Date(entry.receivedAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">{money(entry.totalAmount)}</p>
                </div>
                <div className="mt-2 space-y-1">
                  {entry.allocations.map((alloc) => (
                    <p key={alloc.id} className="text-xs text-slate-600">
                      {alloc.patientName ?? "Patient"} — {alloc.chargeDescription ?? "Charge"} ({money(alloc.amount)})
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
