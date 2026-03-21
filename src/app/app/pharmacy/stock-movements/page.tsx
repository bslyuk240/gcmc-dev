"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { addPharmacyBill, type PharmacyBill } from "@/lib/data/pharmacy-store";
import {
  adjustPharmacyInventoryStock,
  fetchPharmacyInventory,
  fetchPharmacyStockMovements,
  insertPharmacyStockMovement,
  type PharmacyInventoryItem,
  type PharmacyStockMovement,
} from "@/lib/supabase/db";
import { printReceipt } from "@/lib/utils/print-receipt";

type MoveType = "all" | "in" | "dispense" | "adjustment";

type StockMove = {
  id: string;
  date: string;
  item: string;
  type: "in" | "dispense" | "adjustment";
  qty: number;
  source: string;
  ref: string;
  performedBy: string;
};

const TYPE_STYLE: Record<StockMove["type"], string> = {
  in: "bg-emerald-100 text-emerald-700",
  dispense: "bg-red-100 text-red-700",
  adjustment: "bg-amber-100 text-amber-700",
};

const TYPE_LABEL: Record<StockMove["type"], string> = {
  in: "Stock In",
  dispense: "Dispensed",
  adjustment: "Adjustment",
};

function calcStockStatus(stock: number, reorder: number) {
  if (stock === 0) return "out";
  if (stock <= reorder * 0.3) return "critical";
  if (stock <= reorder) return "low";
  return "ok";
}

function fmtMovementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapMovement(row: PharmacyStockMovement, inventoryById: Map<string, PharmacyInventoryItem>): StockMove {
  const item = inventoryById.get(row.inventoryId);
  const type: StockMove["type"] = row.movementType === "in" ? "in" : row.movementType === "adjustment" ? "adjustment" : "dispense";
  const signedQty = row.movementType === "in" ? row.quantity : -Math.abs(row.quantity);

  return {
    id: row.id,
    date: fmtMovementDate(row.createdAt),
    item: item?.product ?? row.sourceDestination ?? row.refNo ?? "Unknown item",
    type,
    qty: signedQty,
    source: row.sourceDestination ?? row.refNo ?? "Pharmacy",
    ref: row.refNo ?? row.referenceId ?? row.id,
    performedBy: row.createdBy ?? "System",
  };
}

export default function PharmacyStockMovementsPage() {
  const { bills } = usePharmacyStore();
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [inventoryItems, setInventoryItems] = useState<PharmacyInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MoveType>("all");
  const [searchQ, setSearchQ] = useState("");
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Walk-in dispense form
  const [wiPatient, setWiPatient] = useState("");
  const [wiDrugId, setWiDrugId] = useState("");
  const [wiQty, setWiQty] = useState("1");
  const [wiNotes, setWiNotes] = useState("");

  // Adjustment form
  const [adjItemId, setAdjItemId] = useState("");
  const [adjQty, setAdjQty] = useState("");
  const [adjType, setAdjType] = useState<"in" | "adjustment">("adjustment");
  const [adjReason, setAdjReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [inventory, movementRows] = await Promise.all([
          fetchPharmacyInventory(),
          fetchPharmacyStockMovements(),
        ]);
        if (cancelled) return;

        setInventoryItems(inventory);
        const inventoryById = new Map(inventory.map((item) => [item.id, item]));
        setMoves(movementRows.map((row) => mapMovement(row, inventoryById)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inventoryById = useMemo(() => new Map(inventoryItems.map((item) => [item.id, item])), [inventoryItems]);

  const allItems: SelectOption[] = inventoryItems.map((item) => ({
    value: item.id,
    label: item.product,
    sublabel: `${item.category} · ${item.form} · ₦${item.unitPrice.toFixed(2)}/unit · stock ${item.stock}`,
    group: item.category,
  }));

  const displayed = useMemo(() => {
    const q = searchQ.toLowerCase();
    return moves.filter((move) => {
      if (filter !== "all" && move.type !== filter) return false;
      if (!q) return true;
      return move.item.toLowerCase().includes(q) || move.source.toLowerCase().includes(q) || move.ref.toLowerCase().includes(q);
    });
  }, [filter, moves, searchQ]);

  const totalIn = moves.filter((move) => move.qty > 0).reduce((sum, move) => sum + move.qty, 0);
  const totalOut = moves.filter((move) => move.qty < 0).reduce((sum, move) => sum + Math.abs(move.qty), 0);

  function updateInventoryItem(itemId: string, delta: number) {
    setInventoryItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const stock = Math.max(0, item.stock + delta);
      return { ...item, stock, status: calcStockStatus(stock, item.reorderLevel) };
    }));
  }

  async function handleWalkinDispense(e: React.FormEvent) {
    e.preventDefault();
    const item = inventoryById.get(wiDrugId);
    if (!item || !wiPatient.trim()) return;

    const qty = Math.max(1, parseInt(wiQty) || 1);
    const total = qty * item.unitPrice;
    const now = new Date().toISOString();
    const displayTime = fmtMovementDate(now);
    const refId = `WI-${Date.now()}`;

    await adjustPharmacyInventoryStock(item.id, -qty).catch(() => {});
    await insertPharmacyStockMovement({
      inventoryId: item.id,
      movementType: "dispense",
      quantity: qty,
      sourceDestination: `Walk-in - ${wiPatient.trim()}`,
      refNo: refId,
      createdBy: "Pharmacist (You)",
      createdAt: now,
    });

    updateInventoryItem(item.id, -qty);
    setMoves((prev) => [{
      id: refId,
      date: displayTime,
      item: item.product,
      type: "dispense",
      qty: -qty,
      source: `Walk-in - ${wiPatient.trim()}`,
      ref: refId,
      performedBy: "Pharmacist (You)",
    }, ...prev]);

    addPharmacyBill({
      id: `PBILL-${Date.now()}`,
      prescriptionId: refId,
      patientName: wiPatient.trim(),
      patientId: `WI-${Date.now()}`,
      drugs: `${item.product} × ${qty}`,
      totalCost: total,
      dispensedAt: displayTime,
      billStatus: "Pending",
      source: "walk-in",
    } as PharmacyBill);

    setToast({ message: `Walk-in dispense recorded. ₦${total.toFixed(2)} bill sent to Accounts.`, type: "success" });
    setWalkinOpen(false);

    printReceipt({
      title: "Pharmacy Dispense Receipt",
      subtitle: item.product,
      refNumber: refId,
      lines: [
        { label: "Patient/Customer", value: wiPatient.trim() },
        { label: "Medication", value: item.product },
        { label: "Form", value: item.form || "—" },
        { label: "Quantity", value: `${qty}` },
        { label: "Unit Price", value: `₦${item.unitPrice.toFixed(2)}` },
        { label: "Notes", value: wiNotes || "—" },
        { label: "Status", value: "DISPENSED", bold: true },
      ],
      total: { label: "Total Amount", value: `₦${total.toFixed(2)}` },
      footer: "Medication dispensed over the counter. Proof of purchase.",
      copyLabel: "CUSTOMER COPY",
    });

    setWiPatient("");
    setWiDrugId("");
    setWiQty("1");
    setWiNotes("");
  }

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const item = inventoryById.get(adjItemId);
    if (!item || !adjQty) return;

    const qty = Math.max(1, parseInt(adjQty) || 1);
    const delta = adjType === "in" ? qty : -qty;
    const now = new Date().toISOString();
    const displayTime = fmtMovementDate(now);
    const refId = `ADJ-${Date.now()}`;

    await adjustPharmacyInventoryStock(item.id, delta).catch(() => {});
    await insertPharmacyStockMovement({
      inventoryId: item.id,
      movementType: adjType,
      quantity: qty,
      sourceDestination: adjReason.trim() || "Manual adjustment",
      refNo: refId,
      createdBy: "Pharmacist (You)",
      createdAt: now,
    });

    updateInventoryItem(item.id, delta);
    setMoves((prev) => [{
      id: refId,
      date: displayTime,
      item: item.product,
      type: adjType === "in" ? "in" : "adjustment",
      qty: delta,
      source: adjReason.trim() || "Manual adjustment",
      ref: refId,
      performedBy: "Pharmacist (You)",
    }, ...prev]);

    setToast({ message: `Stock ${adjType === "in" ? "addition" : "adjustment"} recorded for ${item.product}.`, type: "success" });
    setAdjustOpen(false);
    setAdjItemId("");
    setAdjQty("");
    setAdjReason("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="Track pharmacy stock in, dispenses, adjustments, and walk-in sales."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Total Movements", value: String(moves.length), color: "text-slate-900" },
          { label: "Units Received", value: `+${totalIn}`, color: "text-emerald-600" },
          { label: "Units Dispensed", value: `-${totalOut}`, color: "text-red-600" },
          { label: "Billed Revenue", value: `₦${bills.reduce((sum, bill) => sum + bill.totalCost, 0).toLocaleString()}`, color: "text-violet-700" },
        ].map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${card.color}`}>{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search item or source…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-accent focus:bg-white sm:w-52"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["all", "in", "dispense", "adjustment"] as MoveType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filter === type ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {type === "all" ? "All" : type === "in" ? "Stock In" : type === "dispense" ? "Dispensed" : "Adjustment"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>+ Adjustment</Button>
          <Button size="sm" onClick={() => setWalkinOpen(true)}>+ Walk-in Dispense</Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Item", "Type", "Qty", "Source / Description", "Ref", "By"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && displayed.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{row.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.item}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_STYLE[row.type]}`}>{TYPE_LABEL[row.type]}</span>
                  </td>
                  <td className={`px-4 py-3 font-bold ${row.qty > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {row.qty > 0 ? `+${row.qty}` : row.qty}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{row.source}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.ref}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.performedBy}</td>
                </tr>
              ))}
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">Loading movements…</td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No movements match your filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <p><strong className="text-slate-700">Flow:</strong> real stock changes are written to the ledger when pharmacy records a walk-in sale or adjustment, and when Store fulfills a restock request.</p>
      </div>

      <Modal open={walkinOpen} onClose={() => setWalkinOpen(false)} title="Walk-in Dispense">
        <form onSubmit={handleWalkinDispense} className="space-y-4">
          <p className="text-sm text-slate-500">Record a direct counter sale or dispensing without a doctor prescription.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Patient / Customer Name <span className="text-red-500">*</span></label>
            <input
              required
              value={wiPatient}
              onChange={(e) => setWiPatient(e.target.value)}
              placeholder="Full name or description"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Medication <span className="text-red-500">*</span></label>
            <div className="mt-1.5">
              <SearchableSelect
                options={allItems}
                value={wiDrugId}
                onChange={setWiDrugId}
                placeholder={inventoryItems.length ? "Search or select medication…" : "No inventory items available"}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Quantity</label>
            <input
              type="number"
              min="1"
              value={wiQty}
              onChange={(e) => setWiQty(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
          {wiDrugId && wiQty && inventoryById.get(wiDrugId) && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Estimated total: <strong>₦{((parseInt(wiQty) || 1) * inventoryById.get(wiDrugId)!.unitPrice).toFixed(2)}</strong>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Notes <span className="text-slate-400">(optional)</span></label>
            <textarea
              rows={2}
              value={wiNotes}
              onChange={(e) => setWiNotes(e.target.value)}
              placeholder="Counselling notes, special instructions…"
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setWalkinOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!wiPatient || !wiDrugId}>Record Dispense</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Stock Adjustment">
        <form onSubmit={handleAdjustment} className="space-y-4">
          <p className="text-sm text-slate-500">Record expired stock removal, counting errors, or manual stock additions.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Item <span className="text-red-500">*</span></label>
            <div className="mt-1.5">
              <SearchableSelect
                options={allItems}
                value={adjItemId}
                onChange={setAdjItemId}
                placeholder={inventoryItems.length ? "Search or select medication…" : "No inventory items available"}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <div className="mt-1.5 flex gap-3">
              {(["in", "adjustment"] as const).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="adjType" value={type} checked={adjType === type} onChange={() => setAdjType(type)} />
                  <span>{type === "in" ? "Stock Addition" : "Removal / Correction"}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Quantity <span className="text-red-500">*</span></label>
            <input
              required
              type="number"
              min="1"
              value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)}
              placeholder="Number of units"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Reason / Reference</label>
            <input
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Expired, count correction, write-off…"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!adjItemId || !adjQty}>Save Adjustment</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
