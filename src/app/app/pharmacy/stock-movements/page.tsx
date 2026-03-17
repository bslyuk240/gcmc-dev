"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import {
  addPharmacyBill,
  PHARMACY_DRUG_LIST,
  type PharmacyBill,
} from "@/lib/data/pharmacy-store";
import { printReceipt } from "@/lib/utils/print-receipt";

type MoveType = "all" | "in" | "out" | "dispense" | "adjustment";

type StockMove = {
  id: string;
  date: string;
  item: string;
  type: "in" | "out" | "dispense" | "adjustment";
  qty: number;
  source: string;
  ref: string;
  performedBy: string;
};

const SEED_MOVES: StockMove[] = [
  { id: "M001", date: "Mar 15, 2026", item: "Paracetamol 500mg", type: "dispense", qty: -21, source: "Rx RX-2026-001 – Alice Thompson", ref: "RX-2026-001", performedBy: "Pharmacist" },
  { id: "M002", date: "Mar 15, 2026", item: "Amoxicillin 500mg", type: "in", qty: 200, source: "Store Restock – PRX-1001", ref: "PRX-1001", performedBy: "Store Keeper" },
  { id: "M003", date: "Mar 14, 2026", item: "Metformin 850mg", type: "dispense", qty: -60, source: "Rx RX-2026-003 – Ama Owusu", ref: "RX-2026-003", performedBy: "Pharmacist" },
  { id: "M004", date: "Mar 14, 2026", item: "IV Normal Saline 500ml", type: "in", qty: 50, source: "Store Supply – ST-004", ref: "ST-004", performedBy: "Store Keeper" },
  { id: "M005", date: "Mar 13, 2026", item: "Ceftriaxone 1g IV", type: "dispense", qty: -5, source: "Nurse Request – NR-2026-001", ref: "NR-2026-001", performedBy: "Pharmacist" },
  { id: "M006", date: "Mar 13, 2026", item: "Lisinopril 10mg", type: "adjustment", qty: -3, source: "Stock count variance – expired units removed", ref: "ADJ-001", performedBy: "Senior Pharmacist" },
  { id: "M007", date: "Mar 12, 2026", item: "Artemether-Lumefantrine", type: "in", qty: 100, source: "Store Restock", ref: "PRX-1002", performedBy: "Store Keeper" },
  { id: "M008", date: "Mar 12, 2026", item: "Aspirin 75mg", type: "dispense", qty: -30, source: "Rx RX-2026-002 – Kofi Mensah", ref: "RX-2026-002", performedBy: "Pharmacist" },
];

const TYPE_STYLE: Record<string, string> = {
  in: "bg-emerald-100 text-emerald-700",
  out: "bg-red-100 text-red-700",
  dispense: "bg-violet-100 text-violet-700",
  adjustment: "bg-amber-100 text-amber-700",
};

const TYPE_LABEL: Record<string, string> = {
  in: "Stock In",
  out: "Stock Out",
  dispense: "Dispensed",
  adjustment: "Adjustment",
};

export default function PharmacyStockMovementsPage() {
  const { bills } = usePharmacyStore();
  const [moves, setMoves] = useState<StockMove[]>(SEED_MOVES);
  const [filter, setFilter] = useState<MoveType>("all");
  const [searchQ, setSearchQ] = useState("");
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Walk-in dispense form
  const [wiPatient, setWiPatient] = useState("");
  const [wiDrug, setWiDrug] = useState("");
  const [wiQty, setWiQty] = useState("1");
  const [wiNotes, setWiNotes] = useState("");

  // Adjustment form
  const [adjItem, setAdjItem] = useState("");
  const [adjQty, setAdjQty] = useState("");
  const [adjType, setAdjType] = useState<"in" | "adjustment">("adjustment");
  const [adjReason, setAdjReason] = useState("");

  const allItems: SelectOption[] = PHARMACY_DRUG_LIST.map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: `${d.category} · ₦${d.unitPrice}/unit`,
    group: d.category,
  }));

  const displayed = moves.filter((m) => {
    if (filter !== "all" && m.type !== filter) return false;
    if (searchQ && !m.item.toLowerCase().includes(searchQ.toLowerCase()) && !m.source.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const totalIn = moves.filter((m) => m.qty > 0).reduce((s, m) => s + m.qty, 0);
  const totalOut = moves.filter((m) => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0);

  function handleWalkinDispense(e: React.FormEvent) {
    e.preventDefault();
    const drug = PHARMACY_DRUG_LIST.find((d) => d.id === wiDrug);
    if (!drug || !wiPatient) return;
    const qty = parseInt(wiQty) || 1;
    const total = qty * drug.unitPrice;
    const now = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const refId = `WI-${Date.now()}`;

    setMoves((prev) => [{
      id: refId,
      date: now,
      item: drug.name,
      type: "dispense",
      qty: -qty,
      source: `Walk-in – ${wiPatient}`,
      ref: refId,
      performedBy: "Pharmacist (You)",
    }, ...prev]);

    // Bill for accounts
    addPharmacyBill({
      id: `PBILL-${Date.now()}`,
      prescriptionId: refId,
      patientName: wiPatient,
      patientId: `WI-${Date.now()}`,
      drugs: `${drug.name} × ${qty}`,
      totalCost: total,
      dispensedAt: now,
      billStatus: "Pending",
      source: "walk-in",
    } as PharmacyBill);

    setToast({ message: `Walk-in dispense recorded. ₦${total.toFixed(2)} bill sent to Accounts.`, type: "success" });
    setWalkinOpen(false);

    // Auto-print receipt
    printReceipt({
      title: "Pharmacy Dispense Receipt",
      subtitle: drug.name,
      refNumber: `WI-${Date.now().toString().slice(-6)}`,
      lines: [
        { label: "Patient/Customer", value: wiPatient },
        { label: "Medication",       value: drug.name },
        { label: "Form",             value: drug.unit },
        { label: "Quantity",         value: `${qty}` },
        { label: "Unit Price",       value: `₦${drug.unitPrice.toFixed(2)}` },
        { label: "Notes",            value: wiNotes || "—" },
        { label: "Status",           value: "DISPENSED", bold: true },
      ],
      total: { label: "Total Amount", value: `₦${total.toFixed(2)}` },
      footer: "Medication dispensed over the counter. Proof of purchase.",
      copyLabel: "CUSTOMER COPY",
    });

    setWiPatient(""); setWiDrug(""); setWiQty("1"); setWiNotes("");
  }

  function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const drug = PHARMACY_DRUG_LIST.find((d) => d.id === adjItem);
    if (!drug || !adjQty) return;
    const qty = parseInt(adjQty);
    const now = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const refId = `ADJ-${Date.now()}`;

    setMoves((prev) => [{
      id: refId,
      date: now,
      item: drug.name,
      type: adjType,
      qty: adjType === "in" ? Math.abs(qty) : -Math.abs(qty),
      source: adjReason || "Manual adjustment",
      ref: refId,
      performedBy: "Pharmacist (You)",
    }, ...prev]);

    setToast({ message: `Stock ${adjType === "in" ? "addition" : "adjustment"} recorded for ${drug.name}.`, type: "success" });
    setAdjustOpen(false);
    setAdjItem(""); setAdjQty(""); setAdjReason("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="Track all pharmacy stock in, dispenses, nurse requests, adjustments, and walk-in sales."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Total Movements", value: String(moves.length), color: "text-slate-900" },
          { label: "Units Received", value: `+${totalIn}`, color: "text-emerald-600" },
          { label: "Units Dispensed", value: `-${totalOut}`, color: "text-red-600" },
          { label: "Billed Revenue", value: `₦${bills.reduce((s, b) => s + b.totalCost, 0).toLocaleString()}`, color: "text-violet-700" },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${c.color}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters and actions */}
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
              className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-accent focus:bg-white w-full sm:w-52"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["all", "in", "dispense", "adjustment"] as MoveType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === t ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t === "all" ? "All" : TYPE_LABEL[t] ?? t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>+ Adjustment</Button>
          <Button size="sm" onClick={() => setWalkinOpen(true)}>+ Walk-in Dispense</Button>
        </div>
      </div>

      {/* Movements table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Item", "Type", "Qty", "Source / Description", "Ref", "By"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.item}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_STYLE[row.type]}`}>
                      {TYPE_LABEL[row.type]}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-bold ${row.qty > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {row.qty > 0 ? `+${row.qty}` : row.qty}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{row.source}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.ref}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.performedBy}</td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No movements match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Walk-in dispense modal */}
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
                value={wiDrug}
                onChange={setWiDrug}
                placeholder="Search or select drug…"
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
          {wiDrug && wiQty && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Estimated total: <strong>₦{((parseInt(wiQty) || 1) * (PHARMACY_DRUG_LIST.find((d) => d.id === wiDrug)?.unitPrice ?? 0)).toFixed(2)}</strong>
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
            <Button type="submit" disabled={!wiPatient || !wiDrug}>Record Dispense</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Adjustment modal */}
      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Stock Adjustment">
        <form onSubmit={handleAdjustment} className="space-y-4">
          <p className="text-sm text-slate-500">Record expired stock removal, counting errors, or manual stock additions.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Item <span className="text-red-500">*</span></label>
            <div className="mt-1.5">
              <SearchableSelect
                options={allItems}
                value={adjItem}
                onChange={setAdjItem}
                placeholder="Search or select drug…"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <div className="mt-1.5 flex gap-3">
              {(["in", "adjustment"] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="adjType" value={t} checked={adjType === t} onChange={() => setAdjType(t)} />
                  <span>{t === "in" ? "Stock Addition" : "Removal / Correction"}</span>
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
              placeholder="e.g., Expired stock removed, Counting error corrected…"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!adjItem || !adjQty}>Save Adjustment</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
