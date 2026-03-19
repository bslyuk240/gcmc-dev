"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import {
  addFrontDeskCharge,
  updateFrontDeskChargeStatus,
  type FrontDeskCharge,
} from "@/lib/data/accounts-store";
import { fetchPatientRegistrations, type PatientRegistration } from "@/lib/supabase/db";

const CHARGE_TYPES: FrontDeskCharge["chargeType"][] = [
  "Registration", "Consultation", "Emergency", "Follow-up",
  "Procedure", "Lab", "Antenatal", "Other",
];

const CHARGE_PRESETS: Record<FrontDeskCharge["chargeType"], number> = {
  Registration: 50,
  Consultation: 80,
  Emergency: 150,
  "Follow-up": 40,
  Procedure: 200,
  Lab: 100,
  Antenatal: 120,
  Other: 50,
};

const CHARGE_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Waived: "bg-slate-100 text-slate-500",
  Partial: "bg-sky-50 text-sky-700",
};

export default function FrontDeskBillingPage() {
  const { frontDeskCharges, metrics } = useAccountsStore();

  const [patients, setPatients] = useState<PatientRegistration[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [payTarget, setPayTarget] = useState<FrontDeskCharge | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // New charge form
  const [newPatientId, setNewPatientId] = useState("");
  const [newChargeType, setNewChargeType] = useState<FrontDeskCharge["chargeType"]>("Consultation");
  const [newAmount, setNewAmount] = useState(String(CHARGE_PRESETS["Consultation"]));
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPatientRegistrations()
      .then((data) => { setPatients(data); setLoadingPatients(false); })
      .catch(() => setLoadingPatients(false));
  }, []);

  function handleAddCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatientId || !newAmount) return;
    const patientRecord = patients.find((p) => p.id === newPatientId);
    if (!patientRecord) return;
    setSubmitting(true);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const todayStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    setTimeout(() => {
      addFrontDeskCharge({
        id: `FDC-${Date.now()}`,
        patientName: patientRecord.patientName,
        patientId: patientRecord.patientId,
        chargeType: newChargeType,
        amount: parseFloat(newAmount) || 0,
        description: newDescription || `${newChargeType} fee`,
        createdAt: `${now} · ${todayStr}`,
        createdBy: "Front Desk (You)",
        status: "Pending",
      });
      setToast({ message: `Charge of ₦${newAmount} added for ${patientRecord.patientName}. Sent to Accounts.`, type: "success" });
      setShowNew(false);
      setNewPatientId(""); setNewChargeType("Consultation"); setNewDescription("");
      setNewAmount(String(CHARGE_PRESETS["Consultation"]));
      setSubmitting(false);
    }, 400);
  }

  function handleSendToAccounts(charge: FrontDeskCharge) {
    updateFrontDeskChargeStatus(charge.id, "Billed");
    setPayTarget(null);
    setToast({ message: `Charge for ${charge.patientName} sent to Accounts. They will collect payment.`, type: "success" });
  }

  function handleWaive(charge: FrontDeskCharge) {
    updateFrontDeskChargeStatus(charge.id, "Waived");
    setToast({ message: `Charge for ${charge.patientName} waived.`, type: "info" });
  }

  const pending = frontDeskCharges.filter((c) => c.status === "Pending");
  const collected = frontDeskCharges.filter((c) => c.status === "Paid");

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Front Desk Billing"
        description="Record patient registration and visit charges — Accounts department collects payments."
        action={<Button onClick={() => setShowNew(true)}>+ Add Charge</Button>}
      />

      {/* Info note */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-800">
        <strong>Role:</strong> Front Desk creates charges (registration, visit fees). The <strong>Accounts department</strong> collects all payments.
        Charges marked &quot;Sent to Accounts&quot; appear in the Accounts billing queue.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { label: "Pending Charges", value: pending.length, sub: `₦${metrics.frontDeskPendingValue.toFixed(0)} to be billed`, color: "text-amber-600" },
          { label: "Sent to Accounts", value: frontDeskCharges.filter((c) => c.status === "Billed").length, sub: "Awaiting collection", color: "text-sky-700" },
          { label: "Total Charges Today", value: frontDeskCharges.length, sub: "All statuses", color: "text-slate-900" },
          { label: "Waived", value: frontDeskCharges.filter((c) => c.status === "Waived").length, sub: "Exemptions granted", color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Pending charges — send to accounts */}
      {pending.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <h3 className="font-bold text-slate-900">Charges Awaiting Accounts</h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pending.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Patient", "Type", "Description", "Amount", "Created", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.patientName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">{c.chargeType}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.description}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₦{c.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setPayTarget(c)}>Send to Accounts</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleWaive(c)}>Waive</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* All charges */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">All Charges</h3>
          <Link href={`${INTERNAL_PREFIX}/accounts/invoices`} className="text-sm font-semibold text-accent hover:underline">
            View in Accounts →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Type", "Amount", "By", "Time", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {frontDeskCharges.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{c.patientName}</td>
                  <td className="px-5 py-3 text-slate-600">{c.chargeType}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{c.amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{c.createdBy}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{c.createdAt}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CHARGE_STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {frontDeskCharges.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">No charges recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Workflow:</strong> Register patient / create visit → add charge → send to Accounts → Accounts collects the payment from patient.
      </div>

      {/* Add charge modal */}
      <Modal open={showNew} onClose={() => !submitting && setShowNew(false)} title="Add Patient Charge">
        <form onSubmit={handleAddCharge} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Patient *</label>
            <select required value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)} className={inputCls}>
              <option value="">
                {loadingPatients ? "Loading patients…" : "Select patient…"}
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patientName} ({p.patientId || "No ID"})
                </option>
              ))}
            </select>
            {!loadingPatients && patients.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No patients registered yet.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Charge Type *</label>
              <select value={newChargeType} onChange={(e) => {
                const t = e.target.value as FrontDeskCharge["chargeType"];
                setNewChargeType(t);
                setNewAmount(String(CHARGE_PRESETS[t]));
              }} className={inputCls}>
                {CHARGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Amount (₦) *</label>
              <input type="number" min="0" step="0.01" required value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
            <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g. New patient card fee" className={inputCls} />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            ✓ This charge will immediately appear in Accounts for payment collection.
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)} disabled={submitting}>Cancel</Button>
            <Button size="md" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add Charge → Send to Accounts"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Confirm send to accounts modal */}
      {payTarget && (
        <Modal open={true} onClose={() => setPayTarget(null)} title="Send Charge to Accounts">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{payTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Charge Type</span><span>{payTarget.chargeType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Description</span><span className="text-right">{payTarget.description}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-semibold">Amount</span><span className="font-bold text-lg text-slate-900">₦{payTarget.amount.toFixed(2)}</span></div>
            </div>
            <p className="text-xs text-amber-700 rounded-lg bg-amber-50 px-3 py-2">This charge will be forwarded to Accounts. The Accounts team will collect payment from the patient.</p>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button size="md" onClick={() => handleSendToAccounts(payTarget)}>Send to Accounts</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
