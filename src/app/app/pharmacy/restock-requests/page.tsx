"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useHMSSession } from "@/modules/rbac/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { addRestockRequest, type PharmacyRestockRequest } from "@/lib/data/pharmacy-store";
import { fetchStoreInventory, type StoreInventoryItem } from "@/lib/supabase/db";

function fmtDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return s; }
}

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-sky-50 text-sky-700",
  Fulfilled: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

const URGENCY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-orange-50 text-orange-700",
  Critical: "bg-red-50 text-red-700",
};

export default function PharmacyRestockRequestsPage() {
  const session = useHMSSession();
  const staffName = session?.full_name ?? "Pharmacist";
  const { restockRequests } = usePharmacyStore();

  const [showNew, setShowNew] = useState(false);
  const [viewReq, setViewReq] = useState<PharmacyRestockRequest | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [storeItems, setStoreItems] = useState<StoreInventoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // New request form
  const [selectedStoreItemId, setSelectedStoreItemId] = useState("");
  const [freeTextDrug, setFreeTextDrug] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("Units");
  const [newUrgency, setNewUrgency] = useState<"Routine" | "Urgent" | "Critical">("Routine");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    fetchStoreInventory()
      .then((all) => setStoreItems(all.filter((s) => s.category === "Pharmaceutical")))
      .catch(() => {});
  }, []);

  const selectedStoreItem = storeItems.find((s) => s.id === selectedStoreItemId);
  const drugName = selectedStoreItem ? selectedStoreItem.name : freeTextDrug;

  function resetForm() {
    setSelectedStoreItemId(""); setFreeTextDrug(""); setNewQty("");
    setNewUnit("Units"); setNewUrgency("Routine"); setNewNotes("");
  }

  async function handleNew(e: React.FormEvent) {
    e.preventDefault();
    if (!drugName) return;
    setSubmitting(true);
    const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    addRestockRequest({
      id: `PRX-${Date.now()}`,
      drug: drugName,
      inventoryItemId: undefined,
      storeInventoryId: selectedStoreItemId || undefined,
      storeSnapshot: selectedStoreItem ? { ...selectedStoreItem } : undefined,
      currentStock: 0,
      reorderLevel: selectedStoreItem?.reorder ?? 0,
      qtyRequested: newQty ? parseInt(newQty) : null,
      unit: selectedStoreItem?.unit ?? newUnit,
      urgency: newUrgency,
      requestedBy: staffName,
      requestedAt: now,
      status: "Pending",
      notes: newNotes || undefined,
    });
    setToast({ message: `Restock request for ${drugName} sent to Store.`, type: "success" });
    setShowNew(false);
    resetForm();
    setSubmitting(false);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restock Requests"
        description="Request and track stock replenishment from the store."
        action={<Button onClick={() => { resetForm(); setShowNew(true); }}>+ New Request</Button>}
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Requests <span className="text-sm font-normal text-slate-400">({restockRequests.length})</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Ref", "Drug", "Qty", "Urgency", "Requested By", "Date", "Status", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {restockRequests.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.drug}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.qtyRequested != null ? `${row.qtyRequested} ${row.unit}` : <span className="text-slate-400">Store decides</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${URGENCY_STYLES[row.urgency]}`}>{row.urgency}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.requestedBy}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmtDate(row.requestedAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => setViewReq(row)}>View</Button>
                  </td>
                </tr>
              ))}
              {restockRequests.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">No restock requests yet. Click &quot;+ New Request&quot; to raise one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New request modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Restock Request">
        <form id="restock-form" onSubmit={handleNew} className="space-y-4">

          {/* Store item selector */}
          {storeItems.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select from Store Inventory <span className="text-slate-400 font-normal">(Pharmaceutical items)</span>
              </label>
              <select
                value={selectedStoreItemId}
                onChange={(e) => { setSelectedStoreItemId(e.target.value); setFreeTextDrug(""); }}
                className={inputCls}
              >
                <option value="">— Choose a store item —</option>
                {storeItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.form ? ` (${s.form})` : ""} — In stock: {s.qty} {s.unit}
                  </option>
                ))}
              </select>
              {!selectedStoreItemId && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Or enter drug name manually
                  </label>
                  <input
                    value={freeTextDrug}
                    onChange={(e) => setFreeTextDrug(e.target.value)}
                    placeholder="e.g. Amoxicillin 500mg"
                    className={inputCls}
                  />
                </div>
              )}
              {selectedStoreItem && (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between"><span>Current store stock</span><span className="font-semibold">{selectedStoreItem.qty} {selectedStoreItem.unit}</span></div>
                  <div className="flex justify-between"><span>Reorder level</span><span>{selectedStoreItem.reorder} {selectedStoreItem.unit}</span></div>
                  {selectedStoreItem.supplier && <div className="flex justify-between"><span>Supplier</span><span>{selectedStoreItem.supplier}</span></div>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Drug / Item <span className="text-red-500">*</span></label>
              <input required value={freeTextDrug} onChange={(e) => setFreeTextDrug(e.target.value)} placeholder="e.g. Amoxicillin 500mg" className={inputCls} />
              <p className="mt-1 text-xs text-slate-400">No pharmaceutical items found in Store inventory yet.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="number" min="1" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Leave blank for Store to choose" className={inputCls} />
            </div>
            {!selectedStoreItem && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className={inputCls}>
                  {["Units", "Packs", "Boxes", "Bottles", "Vials", "Ampoules"].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
            <div className="flex gap-2 mt-1">
              {(["Routine", "Urgent", "Critical"] as const).map((u) => (
                <button key={u} type="button" onClick={() => setNewUrgency(u)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${newUrgency === u ? (u === "Critical" ? "bg-red-600 text-white" : u === "Urgent" ? "bg-orange-500 text-white" : "bg-sky-600 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea rows={2} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Reason for urgency, current stock…" className={`${inputCls} resize-none`} />
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            ✓ This will appear in Store&apos;s requests queue. Store will approve → fulfill → your inventory is updated.
            {selectedStoreItemId && <span className="ml-1 font-semibold">Linked to store item.</span>}
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button size="md" type="submit" form="restock-form" disabled={submitting || (!selectedStoreItemId && !freeTextDrug)}>
            {submitting ? "Submitting…" : "Send to Store"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* View detail modal */}
      {viewReq && (
        <Modal open={true} onClose={() => setViewReq(null)} title={`${viewReq.id} — Detail`}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[viewReq.status] ?? "bg-slate-100 text-slate-600"}`}>{viewReq.status}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${URGENCY_STYLES[viewReq.urgency]}`}>{viewReq.urgency}</span>
            </div>
            {([
              ["Drug", viewReq.drug],
              ["Quantity", viewReq.qtyRequested != null ? `${viewReq.qtyRequested} ${viewReq.unit}` : "Store decides"],
              ["Requested By", viewReq.requestedBy],
              ["Date", fmtDate(viewReq.requestedAt)],
              ...(viewReq.approvedQty != null ? [["Approved Qty", String(viewReq.approvedQty)]] : []),
              ...(viewReq.fulfilledAt ? [["Fulfilled At", viewReq.fulfilledAt]] : []),
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium">{val}</span>
              </div>
            ))}
            {viewReq.notes && <div className="rounded-lg bg-slate-50 p-3 text-slate-600">{viewReq.notes}</div>}
            {viewReq.storeSnapshot && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Store Snapshot</p>
                <div className="flex justify-between"><span>Name</span><span>{viewReq.storeSnapshot.name}</span></div>
                <div className="flex justify-between"><span>Category</span><span>{viewReq.storeSnapshot.category}</span></div>
                <div className="flex justify-between"><span>Unit</span><span>{viewReq.storeSnapshot.unit}</span></div>
                <div className="flex justify-between"><span>Qty</span><span>{viewReq.storeSnapshot.qty}</span></div>
                <div className="flex justify-between"><span>Reorder</span><span>{viewReq.storeSnapshot.reorder}</span></div>
                <div className="flex justify-between"><span>Supplier</span><span>{viewReq.storeSnapshot.supplier || "—"}</span></div>
              </div>
            )}
            {viewReq.storeInventoryId && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                ✓ Linked to Store inventory item — stock will be automatically updated on fulfillment.
              </div>
            )}
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setViewReq(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
