"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import {
  fetchCashDeskQueue,
  groupLinesByPatient,
  money,
  postBillingPayment,
  postBillingWaive,
} from "@/lib/billing/client";
import { applyHmoTariff } from "@/lib/nhis/client";
import { departmentLabel } from "@/modules/billing/mappers";
import type { BillingChargeLine, CashDeskQueue } from "@/modules/billing/types";

type PayMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

const DEPT_FILTERS = [
  { id: "", label: "All" },
  { id: "frontdesk", label: "Front Desk" },
  { id: "doctors", label: "Consultation" },
  { id: "lab", label: "Lab" },
  { id: "nurses", label: "Nursing" },
  { id: "pharmacy", label: "Pharmacy" },
];

export function CashDeskClient() {
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<CashDeskQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState(searchParams.get("department") ?? "");
  const [patientFilter, setPatientFilter] = useState(searchParams.get("patientId") ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<BillingChargeLine | null>(null);
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [reference, setReference] = useState("");
  const [waiveReason, setWaiveReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCashDeskQueue({
        department: deptFilter || undefined,
        patientId: patientFilter || undefined,
      });
      setQueue(data);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to load queue.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [deptFilter, patientFilter]);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    const poll = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
      clearInterval(poll);
    };
  }, [load]);

  const groups = useMemo(() => groupLinesByPatient(queue?.lines ?? []), [queue?.lines]);
  const selectedLines = useMemo(
    () => (queue?.lines ?? []).filter((line) => selectedIds.has(line.id)),
    [queue?.lines, selectedIds],
  );
  const selectedTotal = selectedLines.reduce((sum, line) => sum + line.balanceDue, 0);

  function toggleLine(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApplyHmo(line: BillingChargeLine) {
    setProcessing(true);
    try {
      await applyHmoTariff(line.id);
      setToast({ message: "HMO tariff applied — collect copay only.", type: "success" });
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "HMO pricing failed.", type: "error" });
    } finally {
      setProcessing(false);
    }
  }

  function selectPatientGroup(lines: BillingChargeLine[]) {
    setSelectedIds(new Set(lines.map((line) => line.id)));
    const hasHmo = lines.some((line) => line.isHmo);
    if (hasHmo) setMethod("Insurance");
    setPayOpen(true);
  }

  async function handlePay() {
    if (!selectedLines.length) return;
    setProcessing(true);
    try {
      const result = await postBillingPayment({
        chargeLineIds: selectedLines.map((line) => line.id),
        method,
        reference,
      });
      setToast({
        message: `Payment ${result.paymentNumber} recorded — ${money(result.totalAmount)}.`,
        type: "success",
      });
      setSelectedIds(new Set());
      setPayOpen(false);
      setReference("");
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Payment failed.", type: "error" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleWaive() {
    if (!waiveTarget || !waiveReason.trim()) return;
    setProcessing(true);
    try {
      await postBillingWaive({ chargeLineId: waiveTarget.id, reason: waiveReason.trim() });
      setToast({ message: `Charge waived for ${waiveTarget.patientName}.`, type: "success" });
      setWaiveTarget(null);
      setWaiveReason("");
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Waiver failed.", type: "error" });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Desk"
        description="Unified collection queue. HMO pricing auto-applies when charges are created for verified enrollments."
        action={
          selectedLines.length > 0 ? (
            <Button onClick={() => setPayOpen(true)} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              Collect {money(selectedTotal)} ({selectedLines.length})
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open charges", value: String(queue?.totals.openCount ?? 0) },
          { label: "Open balance", value: money(queue?.totals.openBalance ?? 0) },
          { label: "Collected today", value: money(queue?.totals.collectedToday ?? 0) },
          { label: "Receipts today", value: String(queue?.totals.collectedCount ?? 0) },
        ].map((card) => (
          <Card key={card.label} className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {DEPT_FILTERS.map((filter) => (
          <button
            key={filter.id || "all"}
            type="button"
            onClick={() => setDeptFilter(filter.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              deptFilter === filter.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-800">Open charges</h2>
          <p className="mt-0.5 text-xs text-slate-400">Select lines or collect all charges for a patient in one payment.</p>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-sm text-slate-400">Loading queue…</p>
        ) : groups.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400">No open charges in this queue.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {groups.map((group) => (
              <div key={group.patientId} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`${INTERNAL_PREFIX}/accounts/patients/${encodeURIComponent(group.patientId)}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                      {group.patientName}
                    </Link>
                    <p className="text-xs text-slate-400">{group.patientId} · {group.lines.length} charge(s) · {money(group.balance)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => selectPatientGroup(group.lines)}>
                    Collect all
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {group.lines.map((line) => (
                    <label key={line.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(line.id)}
                        onChange={() => toggleLine(line.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{line.description}</span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            {departmentLabel(line.department)}
                          </span>
                          {line.isHmo ? (
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">HMO</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(line.billableAt).toLocaleString("en-GB")}
                          {line.isHmo && line.copayAmount != null ? (
                            <> · Copay {money(line.copayAmount)} · HMO {money(line.hmoAmount ?? 0)}</>
                          ) : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{money(line.balanceDue)}</p>
                        <div className="mt-1 flex justify-end gap-2">
                          {!line.isHmo ? (
                            <button type="button" onClick={() => void handleApplyHmo(line)} className="text-[11px] font-semibold text-blue-600 hover:underline" title="Retry if auto-apply did not run">
                              Retry HMO
                            </button>
                          ) : null}
                          <button type="button" onClick={() => setWaiveTarget(line)} className="text-[11px] font-semibold text-slate-500 hover:text-red-600">
                            Waive
                          </button>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Receive payment">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{selectedLines.length} charge(s) · Total {money(selectedTotal)}</p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Payment method</p>
            <div className="flex flex-wrap gap-2">
              {(["Cash", "POS / Card", "Mobile Money", "Insurance"] as PayMethod[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${method === value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference or note (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
          <Button disabled={processing || selectedTotal <= 0} onClick={() => void handlePay()} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {processing ? "Processing…" : `Receive ${money(selectedTotal)}`}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!waiveTarget} onClose={() => setWaiveTarget(null)} title="Waive charge">
        {waiveTarget ? (
          <>
            <p className="text-sm text-slate-600">{waiveTarget.patientName} — {waiveTarget.description} ({money(waiveTarget.balanceDue)})</p>
            <textarea
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="Reason for waiver (required)"
              className="mt-3 min-h-[96px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <ModalFooter>
              <Button variant="outline" onClick={() => setWaiveTarget(null)}>Cancel</Button>
              <Button disabled={processing || !waiveReason.trim()} onClick={() => void handleWaive()} className="bg-red-600 text-white hover:bg-red-700">
                Confirm waiver
              </Button>
            </ModalFooter>
          </>
        ) : null}
      </Modal>

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
