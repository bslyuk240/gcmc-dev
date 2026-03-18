"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { fetchPharmacyInventory, upsertPharmacyInventoryItem } from "@/lib/supabase/db";
import {
  addRestockRequest,
  getRestockRequests,
  updateNurseRequestStatus,
  type NurseMedRequest,
} from "@/lib/data/pharmacy-store";

type StockStatus = "ok" | "low" | "critical" | "out";

type InventoryItem = {
  id: string;
  product: string;
  category: string;
  form: string;
  stock: number;
  reorderLevel: number;
  price: string;
  unitPrice: number;
  expiry: string;
  supplier: string;
  status: StockStatus;
};

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Solution",
  "Vial", "Ampoule", "Infusion Bag", "Injection",
  "Inhaler", "Nasal Spray", "Eye Drops", "Ear Drops",
  "Cream", "Ointment", "Gel", "Patch",
  "Suppository", "Powder", "Granules", "Other",
];


const CATEGORIES = ["All categories", "Analgesic", "Antibiotic", "Antidiabetic", "Antihypertensive", "Lipid-lowering", "Antihistamine", "Other"];
const STATUS_BADGE: Record<StockStatus, "success" | "warning" | "destructive" | "neutral"> = {
  ok: "success", low: "warning", critical: "destructive", out: "neutral",
};


const PAGE_SIZE = 6;

function calcStockStatus(stock: number, reorder: number): StockStatus {
  if (stock === 0) return "out";
  if (stock <= reorder * 0.3) return "critical";
  if (stock <= reorder) return "low";
  return "ok";
}

export default function PharmacyInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    fetchPharmacyInventory().then((data) => {
      setItems(data.map((d) => ({
        id: d.id,
        product: d.product,
        category: d.category,
        form: d.form,
        stock: d.stock,
        reorderLevel: d.reorderLevel,
        price: `₦ ${d.unitPrice.toFixed(2)}`,
        unitPrice: d.unitPrice,
        expiry: d.expiry,
        supplier: d.supplier,
        status: d.status,
      })));
      setLoadingItems(false);
    }).catch(() => setLoadingItems(false));
  }, []);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [page, setPage] = useState(0);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [dispenseItem, setDispenseItem] = useState<InventoryItem | null>(null);
  const [dispenseQty, setDispenseQty] = useState("1");
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockUrgency, setRestockUrgency] = useState<"Routine" | "Urgent" | "Critical">("Urgent");
  const [restockNotes, setRestockNotes] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);

  // Add medication form state
  const [showAdd, setShowAdd] = useState(false);
  const [aProduct, setAProduct] = useState("");
  const [aCategory, setACategory] = useState("Analgesic");
  const [aForm, setAForm] = useState("Tablet");
  const [aStock, setAStock] = useState("");
  const [aReorder, setAReorder] = useState("");
  const [aPrice, setAPrice] = useState("");
  const [aExpiry, setAExpiry] = useState("");
  const [aSupplier, setASupplier] = useState("");

  // Edit form
  const [editStock, setEditStock] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editSupplier, setEditSupplier] = useState("");
  const [editForm, setEditForm] = useState("");

  const { nurseRequests } = usePharmacyStore();
  const pendingNurseReqs = nurseRequests.filter((r) => r.status === "Requested" || r.status === "Preparing");

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    return (category === "All categories" || i.category === category) &&
      (!q || i.product.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function handleAddMedication(e: React.FormEvent) {
    e.preventDefault();
    const stock = parseInt(aStock) || 0;
    const reorder = parseInt(aReorder) || 0;
    const unitPrice = parseFloat(aPrice) || 0;
    const newItem: InventoryItem = {
      id: `INV-${String(items.length + 1).padStart(3, "0")}-${Date.now().toString().slice(-4)}`,
      product: aProduct,
      category: aCategory,
      form: aForm,
      stock,
      reorderLevel: reorder,
      price: `₦ ${unitPrice.toFixed(2)}`,
      unitPrice,
      expiry: aExpiry,
      supplier: aSupplier,
      status: calcStockStatus(stock, reorder),
    };
    setItems((prev) => [newItem, ...prev]);
    upsertPharmacyInventoryItem({ id: newItem.id, product: newItem.product, category: newItem.category, form: newItem.form, stock: newItem.stock, reorderLevel: newItem.reorderLevel, unitPrice: newItem.unitPrice, expiry: newItem.expiry, supplier: newItem.supplier, status: newItem.status }).catch(() => {});
    setToast({ message: `${aProduct} added to inventory.`, type: "success" });
    setShowAdd(false);
    setAProduct(""); setACategory("Analgesic"); setAForm("Tablet");
    setAStock(""); setAReorder(""); setAPrice(""); setAExpiry(""); setASupplier("");
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setEditStock(String(item.stock));
    setEditPrice(item.price);
    setEditExpiry(item.expiry);
    setEditSupplier(item.supplier);
    setEditForm(item.form);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    const newStock = parseInt(editStock) || 0;
    const status = calcStockStatus(newStock, editItem.reorderLevel);
    const updatedItem = { ...editItem, stock: newStock, price: editPrice, expiry: editExpiry, supplier: editSupplier, form: editForm, status };
    setItems((prev) => prev.map((i) => i.id === editItem.id ? updatedItem : i));
    upsertPharmacyInventoryItem({ id: updatedItem.id, product: updatedItem.product, category: updatedItem.category, form: updatedItem.form, stock: updatedItem.stock, reorderLevel: updatedItem.reorderLevel, unitPrice: updatedItem.unitPrice, expiry: updatedItem.expiry, supplier: updatedItem.supplier, status: updatedItem.status }).catch(() => {});
    setToast({ message: `${editItem.product} updated.`, type: "success" });
    setEditItem(null);
  }

  function handleDispense(e: React.FormEvent) {
    e.preventDefault();
    if (!dispenseItem) return;
    const qty = parseInt(dispenseQty) || 0;
    if (qty > dispenseItem.stock) {
      setToast({ message: "Not enough stock.", type: "error" });
      return;
    }
    const newStock = dispenseItem.stock - qty;
    const status = calcStockStatus(newStock, dispenseItem.reorderLevel);
    setItems((prev) => prev.map((i) => i.id === dispenseItem.id ? { ...i, stock: newStock, status } : i));

    // Auto-suggest restock if now low/critical/out
    if (status !== "ok") {
      setToast({ message: `${qty} unit(s) dispensed. Stock is now ${status} — consider requesting a restock from Store.`, type: "info" });
    } else {
      setToast({ message: `${qty} unit(s) of ${dispenseItem.product} dispensed.`, type: "success" });
    }
    setDispenseItem(null);
    setDispenseQty("1");
  }

  function openRestock(item: InventoryItem) {
    setRestockItem(item);
    setRestockQty(String(item.reorderLevel * 5));
    setRestockUrgency(item.status === "out" || item.status === "critical" ? "Critical" : "Urgent");
    setRestockNotes(`Current stock: ${item.stock} units. Reorder level: ${item.reorderLevel} units.`);
  }

  function handleSendRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!restockItem || !restockQty) return;

    // Check if a restock request for this item is already pending
    const existing = getRestockRequests().find(
      (r) => r.inventoryItemId === restockItem.id && (r.status === "Pending" || r.status === "Approved"),
    );
    if (existing) {
      setToast({ message: `A restock request for ${restockItem.product} is already pending (${existing.id}).`, type: "info" });
      setRestockItem(null);
      return;
    }

    const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    addRestockRequest({
      id: `PRX-${Date.now()}`,
      drug: restockItem.product,
      inventoryItemId: restockItem.id,
      currentStock: restockItem.stock,
      reorderLevel: restockItem.reorderLevel,
      qtyRequested: parseInt(restockQty) || restockItem.reorderLevel * 5,
      unit: "Units",
      urgency: restockUrgency,
      requestedBy: "Pharmacist (You)",
      requestedAt: now,
      status: "Pending",
      notes: restockNotes || undefined,
    });

    setToast({ message: `Restock request for ${restockItem.product} sent to Store.`, type: "success" });
    setRestockItem(null);
    setRestockNotes("");
  }

  function handlePrepareNurseReq(req: NurseMedRequest) {
    updateNurseRequestStatus(req.id, "Preparing");
    setToast({ message: `Preparing ${req.drug} for ${req.patientName}…`, type: "info" });
  }

  function handleReadyNurseReq(req: NurseMedRequest) {
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    updateNurseRequestStatus(req.id, "Ready", {
      preparedAt: `${now} · Mar 15, 2026`,
      preparedBy: "Pharmacist (You)",
    });
    setToast({ message: `${req.drug} for ${req.patientName} is ready for collection by Nursing.`, type: "success" });
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  const lowItems = items.filter((i) => i.status === "low" || i.status === "critical" || i.status === "out");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Inventory"
        description="Stock levels, expiry tracking, nurse requests, and Store restock."
        action={<Button size="md" onClick={() => setShowAdd(true)}>+ Add Medication</Button>}
      />

      {loadingItems && <p className="text-sm text-slate-400">Loading inventory…</p>}

      {/* Low stock alert banner */}
      {lowItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
          <svg className="h-4 w-4 shrink-0 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="font-semibold text-orange-800">{lowItems.length} item(s) need restocking:</span>
          <div className="flex flex-wrap gap-2">
            {lowItems.map((i) => (
              <button
                key={i.id}
                onClick={() => openRestock(i)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${i.status === "out" ? "bg-red-600 text-white" : i.status === "critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"} hover:opacity-80 transition-opacity`}
              >
                {i.product} ({i.stock} left) — Request Restock
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingNurseReqs.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
          <span className="text-sky-600 font-semibold">{pendingNurseReqs.length} nurse request{pendingNurseReqs.length > 1 ? "s" : ""} awaiting preparation.</span>
          <a href="/app/pharmacy/nurse-requests" className="ml-auto rounded-lg bg-sky-600 px-3 py-1 text-xs font-bold text-white hover:bg-sky-700 transition">
            Go to Nurse Requests →
          </a>
        </div>
      )}

      <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search product…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-accent focus:bg-white"
              />
            </div>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Product", "Form", "Category", "Stock", "Reorder Level", "Price", "Expiry", "Status", "Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50 ${item.status !== "ok" ? "bg-red-50/20" : ""}`}>
                    <td className="px-5 py-3 font-semibold text-slate-900">{item.product}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">{item.form}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{item.category}</td>
                    <td className={`px-5 py-3 font-bold ${item.status === "out" ? "text-red-600" : item.status === "critical" ? "text-red-500" : item.status === "low" ? "text-orange-600" : "text-slate-900"}`}>
                      {item.stock}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{item.reorderLevel}</td>
                    <td className="px-5 py-3 text-slate-600">{item.price}</td>
                    <td className="px-5 py-3 text-slate-600">{item.expiry}</td>
                    <td className="px-5 py-3"><StatusBadge variant={STATUS_BADGE[item.status]}>{item.status}</StatusBadge></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setDispenseItem(item); setDispenseQty("1"); }} disabled={item.status === "out"}>Dispense</Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                        {item.status !== "ok" && (
                          <Button size="sm" variant="ghost" onClick={() => openRestock(item)} className="text-orange-600 hover:text-orange-700">
                            Restock
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-400">No items found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400">Page {page + 1} of {Math.max(1, totalPages)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
            </div>
          </div>
      </Card>

      {/* Add Medication modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Medication" className="max-w-xl">
        <form id="add-med-form" onSubmit={handleAddMedication} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Drug / Product Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={aProduct}
              onChange={(e) => setAProduct(e.target.value)}
              placeholder="e.g. Amoxicillin 250mg"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
              <select required value={aCategory} onChange={(e) => setACategory(e.target.value)} className={inputCls}>
                {CATEGORIES.filter((c) => c !== "All categories").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Dosage Form <span className="text-red-500">*</span></label>
              <select required value={aForm} onChange={(e) => setAForm(e.target.value)} className={inputCls}>
                {DOSAGE_FORMS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Opening Stock <span className="text-red-500">*</span></label>
              <input
                required
                type="number"
                min="0"
                value={aStock}
                onChange={(e) => setAStock(e.target.value)}
                placeholder="e.g. 100"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Reorder Level <span className="text-red-500">*</span></label>
              <input
                required
                type="number"
                min="1"
                value={aReorder}
                onChange={(e) => setAReorder(e.target.value)}
                placeholder="e.g. 30"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Unit Price (₦) <span className="text-red-500">*</span></label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={aPrice}
                onChange={(e) => setAPrice(e.target.value)}
                placeholder="e.g. 2.50"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry (YYYY-MM) <span className="text-red-500">*</span></label>
              <input
                required
                value={aExpiry}
                onChange={(e) => setAExpiry(e.target.value)}
                placeholder="2027-06"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Supplier</label>
            <input
              value={aSupplier}
              onChange={(e) => setASupplier(e.target.value)}
              placeholder="e.g. PharmaCorp Ltd"
              className={inputCls}
            />
          </div>

          {aStock && aReorder && (
            <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
              calcStockStatus(parseInt(aStock) || 0, parseInt(aReorder) || 0) === "out" ? "bg-red-50 text-red-700" :
              calcStockStatus(parseInt(aStock) || 0, parseInt(aReorder) || 0) === "critical" ? "bg-red-50 text-red-600" :
              calcStockStatus(parseInt(aStock) || 0, parseInt(aReorder) || 0) === "low" ? "bg-orange-50 text-orange-700" :
              "bg-emerald-50 text-emerald-700"
            }`}>
              Stock status preview: <strong>{calcStockStatus(parseInt(aStock) || 0, parseInt(aReorder) || 0).toUpperCase()}</strong>
            </div>
          )}
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="md" type="submit" form="add-med-form">Add to Inventory</Button>
        </ModalFooter>
      </Modal>

      {/* Edit modal */}
      {editItem && (
        <Modal open={true} onClose={() => setEditItem(null)} title={`Edit — ${editItem.product}`}>
          <form id="edit-inv-form" onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dosage Form</label>
                <select value={editForm} onChange={(e) => setEditForm(e.target.value)} className={inputCls}>
                  {DOSAGE_FORMS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Qty</label>
                <input type="number" min="0" value={editStock} onChange={(e) => setEditStock(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price</label>
                <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry (YYYY-MM)</label>
                <input value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} placeholder="2026-06" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <input value={editSupplier} onChange={(e) => setEditSupplier(e.target.value)} className={inputCls} />
              </div>
            </div>
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button size="md" type="submit" form="edit-inv-form">Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Dispense modal */}
      {dispenseItem && (
        <Modal open={true} onClose={() => setDispenseItem(null)} title={`Dispense — ${dispenseItem.product}`}>
          <form id="dispense-form" onSubmit={handleDispense} className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Current Stock</span>
              <span className="font-bold text-slate-900">{dispenseItem.stock} units</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Dispense</label>
              <input type="number" min="1" max={dispenseItem.stock} value={dispenseQty} onChange={(e) => setDispenseQty(e.target.value)} className={inputCls} />
            </div>
            {dispenseItem.stock - (parseInt(dispenseQty) || 0) <= dispenseItem.reorderLevel && (
              <p className="text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                After dispensing, stock will be below reorder level. Consider requesting a restock from Store.
              </p>
            )}
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setDispenseItem(null)}>Cancel</Button>
            <Button size="md" type="submit" form="dispense-form">Confirm Dispense</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Restock request modal */}
      {restockItem && (
        <Modal open={true} onClose={() => setRestockItem(null)} title={`Request Restock from Store — ${restockItem.product}`}>
          <form id="restock-form" onSubmit={handleSendRestock} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Current Stock</span><span className="font-bold text-red-600">{restockItem.stock} units</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Reorder Level</span><span className="font-semibold">{restockItem.reorderLevel} units</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Supplier</span><span>{restockItem.supplier}</span></div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Quantity to Request</label>
              <input type="number" min="1" required value={restockQty} onChange={(e) => setRestockQty(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Urgency</label>
              <div className="flex gap-2 mt-1">
                {(["Routine", "Urgent", "Critical"] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setRestockUrgency(u)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${restockUrgency === u ? (u === "Critical" ? "bg-red-600 text-white" : u === "Urgent" ? "bg-orange-500 text-white" : "bg-sky-600 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
              <textarea rows={2} value={restockNotes} onChange={(e) => setRestockNotes(e.target.value)} placeholder="Reason for request…"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ This request will appear in the Store&apos;s supply requests queue for approval and fulfillment.
            </div>
            <ModalFooter>
              <Button variant="ghost" size="md" type="button" onClick={() => setRestockItem(null)}>Cancel</Button>
              <Button size="md" type="submit">Send Restock Request to Store</Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
