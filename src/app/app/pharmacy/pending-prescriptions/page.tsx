"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  updatePrescriptionStatus,
  addPharmacyBill,
  type SharedPrescription,
} from "@/lib/data/pharmacy-store";

type Tab = "All Pending" | "Urgent" | "Waiting for Pickup" | "Dispensed";

const STATUS_TONE: Record<string, string> = {
  Pending: "bg-blue-100 text-blue-800",
  Processing: "bg-amber-100 text-amber-800",
  Urgent: "bg-red-100 text-red-800",
  Dispensed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-600",
};

export default function PendingPrescriptionsPage() {
  const { prescriptions } = usePharmacyStore();
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Pharmacist";

  const [activeTab, setActiveTab] = useState<Tab>("All Pending");
  const [dispenseTarget, setDispenseTarget] = useState<SharedPrescription | null>(null);
  const [dispenseNotes, setDispenseNotes] = useState("");
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastData | null>(null);
  const [dispensing, setDispensing] = useState(false);

  const urgent = prescriptions.filter((p) => p.urgency === "Urgent" && p.status !== "Dispensed" && p.status !== "Cancelled");
  const waitingPickup = prescriptions.filter((p) => readyIds.has(p.id) && !collectedIds.has(p.id));
  const allPending = prescriptions.filter((p) => p.status !== "Dispensed" && p.status !== "Cancelled" && !collectedIds.has(p.id));
  const dispensed = prescriptions.filter((p) => p.status === "Dispensed");

  const tabs: { label: string; tab: Tab; count: number; color?: string }[] = [
    { label: "All Pending", tab: "All Pending", count: allPending.length },
    { label: "Urgent", tab: "Urgent", count: urgent.length, color: urgent.length > 0 ? "text-red-600" : undefined },
    { label: "Waiting for Pickup", tab: "Waiting for Pickup", count: waitingPickup.length },
    { label: "Dispensed Today", tab: "Dispensed", count: dispensed.length },
  ];

  const displayed =
    activeTab === "Urgent" ? urgent
    : activeTab === "Waiting for Pickup" ? waitingPickup
    : activeTab === "Dispensed" ? dispensed
    : allPending;

  function calcTotal(rx: SharedPrescription): number {
    return rx.totalCost ?? rx.drugs.reduce((sum, d) => {
      const qty = parseInt(d.qty) || 1;
      return sum + qty * (d.unitPrice ?? 0);
    }, 0);
  }

  function handleDispense() {
    if (!dispenseTarget) return;
    setDispensing(true);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const total = calcTotal(dispenseTarget);

    const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    setTimeout(() => {
      updatePrescriptionStatus(dispenseTarget.id, "Dispensed", {
        dispensedAt: `${now} · ${dateStr}`,
        dispensedBy: staffName,
        totalCost: total,
      });

      // Create billing record → visible in Accounts
      addPharmacyBill({
        id: `PBILL-${Date.now()}`,
        prescriptionId: dispenseTarget.id,
        patientName: dispenseTarget.patientName,
        patientId: dispenseTarget.patientId,
        drugs: dispenseTarget.drugs.map((d) => `${d.name} × ${d.qty}`).join(", "),
        totalCost: total,
        dispensedAt: `${now} · ${dateStr}`,
        billStatus: "Pending",
        source: "prescription",
      });

      setReadyIds((prev) => new Set([...prev, dispenseTarget.id]));
      setToast({
        message: `${dispenseTarget.id} dispensed for ${dispenseTarget.patientName}. Bill ₦${total.toFixed(2)} sent to Accounts.`,
        type: "success",
      });
      setDispenseTarget(null);
      setDispenseNotes("");
      setDispensing(false);
    }, 700);
  }

  function markCollected(id: string, patientName: string) {
    setCollectedIds((prev) => new Set([...prev, id]));
    setToast({ message: `${patientName} collected their medication.`, type: "success" });
  }

  function getRowStatus(rx: SharedPrescription): string {
    if (collectedIds.has(rx.id)) return "Collected";
    if (rx.status === "Dispensed" && readyIds.has(rx.id)) return "Ready";
    if (rx.status === "Dispensed") return "Dispensed";
    if (rx.urgency === "Urgent") return "Urgent";
    return rx.status;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pending Prescriptions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Doctor-written prescriptions arrive here in real time. Dispense and auto-generate billing for Accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {urgent.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {urgent.length} urgent
            </span>
          )}
          <Button size="md" variant="outline" onClick={() => setToast({ message: "List refreshed.", type: "info" })}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 px-1">
        {tabs.map(({ label, tab, count, color }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 pb-3 pt-2 text-sm font-bold transition ${
              activeTab === tab
                ? "border-[var(--accent)] text-[var(--accent-foreground)]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            } ${color ?? ""}`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                {["Rx ID", "Patient", "From Doctor", "Dept", "Received", "Drugs", "Est. Cost", "Status", "Action"].map((col) => (
                  <th key={col} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((row) => {
                const rowStatus = getRowStatus(row);
                const total = calcTotal(row);
                return (
                  <tr key={row.id} className={`hover:bg-slate-50/70 ${row.urgency === "Urgent" && row.status === "Pending" ? "bg-red-50/30" : ""}`}>
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">{row.id}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{row.patientName}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      <div>{row.doctorName}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{row.department}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{row.createdAt}</td>
                    <td className="px-5 py-3.5">
                      {row.drugs.map((d, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium text-slate-700">{d.name}</span>
                          <span className="text-slate-400"> — {d.qty} · {d.frequency}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">
                      {total > 0 ? `₦${total.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[rowStatus] ?? "bg-slate-100 text-slate-600"}`}>
                        {rowStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(row.status === "Pending" || row.status === "Processing") && !readyIds.has(row.id) && (
                        <Button size="sm" onClick={() => { setDispenseTarget(row); setDispenseNotes(""); }}>
                          Dispense
                        </Button>
                      )}
                      {readyIds.has(row.id) && !collectedIds.has(row.id) && (
                        <Button size="sm" variant="outline" onClick={() => markCollected(row.id, row.patientName)}>
                          Mark Collected
                        </Button>
                      )}
                      {(row.status === "Dispensed" && !readyIds.has(row.id)) && (
                        <span className="text-xs text-emerald-600 font-semibold">✓ Dispensed</span>
                      )}
                      {collectedIds.has(row.id) && (
                        <span className="text-xs text-slate-400">Collected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                    No prescriptions in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Flow note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-0.5">
        <p><strong className="text-slate-700">Flow:</strong> Doctor writes prescription (Consultations page) → appears here instantly → Dispense → bill auto-sent to Accounts → patient collects.</p>
      </div>

      {/* Dispense modal */}
      {dispenseTarget && (
        <Modal open={true} onClose={() => !dispensing && setDispenseTarget(null)} title={`Dispense ${dispenseTarget.id}`}>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{dispenseTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span>{dispenseTarget.doctorName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Department</span><span>{dispenseTarget.department}</span></div>
              {dispenseTarget.urgency === "Urgent" && (
                <div className="flex justify-between"><span className="text-slate-500">Urgency</span><span className="font-bold text-red-600">URGENT</span></div>
              )}
            </div>
            <div className="space-y-1.5">
              {dispenseTarget.drugs.map((d, i) => (
                <div key={i} className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.qty} · {d.frequency} · {d.duration}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    ₦{((parseInt(d.qty) || 1) * (d.unitPrice ?? 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between rounded-lg bg-violet-50 px-3 py-2 font-bold text-violet-900">
              <span>Total</span>
              <span>₦{calcTotal(dispenseTarget).toFixed(2)}</span>
            </div>
            {dispenseTarget.notes && (
              <p className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                <strong>Doctor notes:</strong> {dispenseTarget.notes}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700">Pharmacist notes <span className="text-slate-400">(optional)</span></label>
              <textarea
                rows={2}
                value={dispenseNotes}
                onChange={(e) => setDispenseNotes(e.target.value)}
                placeholder="Substitution, counselling notes…"
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
              />
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ Dispensing will automatically create a <strong>₦{calcTotal(dispenseTarget).toFixed(2)} bill</strong> in Accounts.
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setDispenseTarget(null)} disabled={dispensing}>Cancel</Button>
            <Button size="md" onClick={handleDispense} disabled={dispensing}>
              {dispensing ? "Dispensing…" : "Confirm & Dispense"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
