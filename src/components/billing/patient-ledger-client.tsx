"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import {
  fetchPatientLedger,
  fetchPatientSearch,
  money,
  postBillingPayment,
} from "@/lib/billing/client";
import { departmentLabel, paymentMethodLabel } from "@/modules/billing/mappers";
import type { PatientLedgerSummary, PatientSearchResult } from "@/modules/billing/types";

export function PatientSearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await fetchPatientSearch(query);
        if (alive) setResults(rows);
      } catch (error) {
        if (alive) setToast({ message: error instanceof Error ? error.message : "Search failed.", type: "error" });
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader title="Patient Accounts" description="Search patients with open balances and open their ledger." />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by patient name or ID…"
        className="w-full max-w-xl rounded-xl border border-slate-200 px-4 py-3 text-sm"
      />
      <Card>
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-400">Searching…</p>
        ) : results.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">No patients with open balances found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map((patient) => (
              <Link
                key={patient.patientId}
                href={`${INTERNAL_PREFIX}/accounts/patients/${encodeURIComponent(patient.patientId)}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">{patient.patientName}</p>
                  <p className="text-xs text-slate-400">{patient.patientId} · {patient.openCount} open charge(s)</p>
                </div>
                <p className="font-bold text-emerald-700">{money(patient.openBalance)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

export function PatientLedgerClient({ patientId }: { patientId: string }) {
  const [ledger, setLedger] = useState<PatientLedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPatientLedger(patientId);
      setLedger(data);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to load ledger.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
  }, [load]);

  async function collectAll() {
    if (!ledger) return;
    const openIds = ledger.charges.filter((c) => c.status === "open" || c.status === "partial").map((c) => c.id);
    if (!openIds.length) return;
    setProcessing(true);
    try {
      const result = await postBillingPayment({ chargeLineIds: openIds, method: "Cash" });
      setToast({ message: `Payment ${result.paymentNumber} recorded.`, type: "success" });
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Payment failed.", type: "error" });
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading patient ledger…</p>;
  if (!ledger) return <p className="text-sm text-slate-400">No billing records for this patient.</p>;

  const openLines = ledger.charges.filter((c) => c.status === "open" || c.status === "partial");

  return (
    <div className="space-y-6">
      <PageHeader
        title={ledger.patientName}
        description={`Patient ID ${ledger.patientId} · Open balance ${money(ledger.openBalance)}`}
        action={
          openLines.length > 0 ? (
            <Button disabled={processing} onClick={() => void collectAll()} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              Collect all open ({money(ledger.openBalance)})
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="px-4 py-4"><p className="text-xs uppercase text-slate-500">Open balance</p><p className="text-2xl font-bold">{money(ledger.openBalance)}</p></Card>
        <Card className="px-4 py-4"><p className="text-xs uppercase text-slate-500">Open charges</p><p className="text-2xl font-bold">{ledger.openCount}</p></Card>
        <Card className="px-4 py-4"><p className="text-xs uppercase text-slate-500">Paid today</p><p className="text-2xl font-bold">{money(ledger.paidToday)}</p></Card>
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold">Charges</h2></div>
        <div className="divide-y divide-slate-100">
          {ledger.charges.map((line) => (
            <div key={line.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-slate-800">{line.description}</p>
                <p className="text-xs text-slate-400">{departmentLabel(line.department)} · {line.status}</p>
              </div>
              <p className="font-semibold">{money(line.balanceDue || line.totalAmount)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold">Payments today</h2></div>
        {ledger.payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">No payments recorded today.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ledger.payments.map((payment) => (
              <div key={payment.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{payment.paymentNumber}</p>
                  <p className="font-semibold">{money(payment.totalAmount)}</p>
                </div>
                <p className="text-xs text-slate-400">{paymentMethodLabel(payment.paymentMethod)} · {new Date(payment.receivedAt).toLocaleString("en-GB")}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Link href={`${INTERNAL_PREFIX}/accounts/cash-desk?patientId=${encodeURIComponent(patientId)}`} className="text-sm font-semibold text-emerald-700 hover:underline">
        Open in Cash Desk →
      </Link>

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
