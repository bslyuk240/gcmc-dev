"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { recordInpatientConsumable, resolveActiveInpatientStayId } from "@/lib/inpatient/client";

type RecordConsumableModalProps = {
  open: boolean;
  patientName: string;
  patientId: string;
  bed?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function RecordConsumableModal({
  open,
  patientName,
  patientId,
  bed,
  onClose,
  onSuccess,
  onError,
}: RecordConsumableModalProps) {
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitAmount, setUnitAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDescription("");
      setQuantity("1");
      setUnitAmount("");
    }
  }, [open]);

  async function handleSubmit() {
    if (!description.trim()) {
      onError("Item description is required.");
      return;
    }

    const qty = Number(quantity);
    const amount = Number(unitAmount);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(amount) || amount < 0) {
      onError("Enter a valid quantity and unit amount.");
      return;
    }

    setSubmitting(true);
    try {
      const stayId = await resolveActiveInpatientStayId(patientId);
      if (!stayId) throw new Error("No active inpatient stay found for this patient.");

      const result = await recordInpatientConsumable({
        stayId,
        description: description.trim(),
        quantity: qty,
        unitAmount: amount,
      });
      if (result.error) throw new Error(result.error);

      onSuccess(`Consumable charge recorded for ${patientName}.`);
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not record consumable.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={`Record Materials - ${patientName}`}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-900">{bed ?? "Inpatient"}</span> / {patientId}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Item / material used</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. IV set, oxygen mask, dressing pack"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Quantity</label>
            <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Unit amount (NGN)</label>
            <input value={unitAmount} onChange={(event) => setUnitAmount(event.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          This posts a consumable line to the patient&apos;s inpatient stay for Accounts to collect.
        </div>
      </div>
      <ModalFooter>
        <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button size="md" disabled={submitting || !description.trim()} onClick={() => void handleSubmit()}>
          {submitting ? "Saving..." : "Record charge"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
