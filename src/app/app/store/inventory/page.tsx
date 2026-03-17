"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

type StoreItem = { id: string; name: string; category: string; form?: string; unit: string; qty: number; reorder: number; unitCost: number; supplier: string; status: string };

const DOSAGE_FORMS = [
  "—", "Tablet", "Capsule", "Syrup", "Suspension", "Solution",
  "Vial", "Ampoule", "Infusion Bag", "Injection",
  "Inhaler", "Nasal Spray", "Eye Drops", "Ear Drops",
  "Cream", "Ointment", "Gel", "Patch",
  "Suppository", "Powder", "Granules", "Other",
];

const INITIAL: StoreItem[] = [
  { id: "ITM-001", name: "Surgical Gloves (Medium)",    category: "PPE",            unit: "Box",   qty: 240, reorder: 50,  unitCost: 12.5, supplier: "MedSupply Co.",   status: "In Stock" },
  { id: "ITM-002", name: "N95 Respirators",             category: "PPE",            unit: "Pack",  qty: 35,  reorder: 40,  unitCost: 28.0, supplier: "SafeGuard Ltd.", status: "Low Stock" },
  { id: "ITM-003", name: "IV Cannula 18G",              category: "Medical",        unit: "Box",   qty: 120, reorder: 30,  unitCost: 18.0, supplier: "ClinTech",       status: "In Stock" },
  { id: "ITM-004", name: "Gauze Bandages 10cm",         category: "Wound Care",     unit: "Roll",  qty: 8,   reorder: 20,  unitCost: 3.5,  supplier: "MedSupply Co.",   status: "Critical" },
  { id: "ITM-005", name: "Disposable Syringes 5ml",     category: "Medical",        unit: "Box",   qty: 300, reorder: 100, unitCost: 9.0,  supplier: "ClinTech",       status: "In Stock" },
  { id: "ITM-006", name: "Alcohol Swabs",               category: "Sterilization",  unit: "Pack",  qty: 60,  reorder: 50,  unitCost: 4.0,  supplier: "SafeGuard Ltd.", status: "In Stock" },
  { id: "ITM-007", name: "Oxygen Masks (Adult)",        category: "Respiratory",    unit: "Piece", qty: 18,  reorder: 25,  unitCost: 6.0,  supplier: "MedEquip Co.",   status: "Low Stock" },
  { id: "ITM-008", name: "Patient Wristbands",          category: "Admin",          unit: "Roll",  qty: 0,   reorder: 10,  unitCost: 7.5,  supplier: "PrintPro",       status: "Out of Stock" },
  { id: "ITM-009", name: "Examination Table Paper",     category: "Admin",          unit: "Roll",  qty: 45,  reorder: 20,  unitCost: 5.0,  supplier: "PrintPro",       status: "In Stock" },
  { id: "ITM-010", name: "Latex-Free Gloves (Large)",   category: "PPE",            unit: "Box",   qty: 88,  reorder: 40,  unitCost: 14.0, supplier: "SafeGuard Ltd.", status: "In Stock" },
  { id: "ITM-011", name: "Paracetamol 500mg",           category: "Pharmaceutical", form: "Tablet",       unit: "Pack", qty: 500, reorder: 200, unitCost: 0.5,  supplier: "PharmaCorp",     status: "In Stock" },
  { id: "ITM-012", name: "Amoxicillin 500mg",           category: "Pharmaceutical", form: "Capsule",      unit: "Pack", qty: 120, reorder: 100, unitCost: 1.8,  supplier: "MedSupply Ltd.", status: "In Stock" },
  { id: "ITM-013", name: "IV Normal Saline 500ml",      category: "Pharmaceutical", form: "Infusion Bag", unit: "Box",  qty: 80,  reorder: 40,  unitCost: 5.0,  supplier: "PharmaCorp",     status: "In Stock" },
  { id: "ITM-014", name: "Ceftriaxone 1g",              category: "Pharmaceutical", form: "Vial",         unit: "Box",  qty: 30,  reorder: 20,  unitCost: 12.0, supplier: "Lifeline Pharma",status: "In Stock" },
  { id: "ITM-015", name: "Salbutamol Inhaler",          category: "Pharmaceutical", form: "Inhaler",      unit: "Piece",qty: 20,  reorder: 10,  unitCost: 15.0, supplier: "MedEquip Ltd.",  status: "In Stock" },
];

const STATUS_STYLES: Record<string, string> = {
  "In Stock": "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-500",
};

const CATEGORIES = ["PPE", "Medical", "Wound Care", "Sterilization", "Respiratory", "Admin", "Pharmaceutical", "Furniture", "Other"];
const UNITS = ["Box", "Pack", "Roll", "Piece", "Bottle", "Set", "Pair", "Litre", "Sheet", "Bag"];

function deriveStatus(qty: number, reorder: number): string {
  if (qty === 0) return "Out of Stock";
  if (qty <= reorder * 0.3) return "Critical";
  if (qty <= reorder) return "Low Stock";
  return "In Stock";
}

export default function StoreInventoryPage() {
  const [items, setItems] = useState<StoreItem[]>(INITIAL);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<StoreItem | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Add form
  const [aName, setAName] = useState(""); const [aCat, setACat] = useState("PPE");
  const [aUnit, setAUnit] = useState("Box"); const [aQty, setAQty] = useState("");
  const [aReorder, setAReorder] = useState(""); const [aCost, setACost] = useState("");
  const [aSupplier, setASupplier] = useState(""); const [aForm, setAForm] = useState("—");

  // Edit form (mirrors add)
  const [eName, setEName] = useState(""); const [eQty, setEQty] = useState("");
  const [eReorder, setEReorder] = useState(""); const [eCost, setECost] = useState("");
  const [eSupplier, setESupplier] = useState(""); const [eForm, setEForm] = useState("—");

  const allCategories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = items.filter((i) =>
    (category === "All" || i.category === category) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())),
  );

  const totalValue = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const lowStock = items.filter((i) => i.status !== "In Stock").length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(aQty) || 0; const reorder = parseInt(aReorder) || 10;
    const newItem: StoreItem = {
      id: `ITM-${String(items.length + 11).padStart(3, "0")}`,
      name: aName, category: aCat, form: aForm !== "—" ? aForm : undefined, unit: aUnit, qty, reorder,
      unitCost: parseFloat(aCost) || 0, supplier: aSupplier,
      status: deriveStatus(qty, reorder),
    };
    setItems((prev) => [...prev, newItem]);
    setToast({ message: `${aName} added to inventory.`, type: "success" });
    setShowAdd(false);
    setAName(""); setACat("PPE"); setAUnit("Box"); setAQty(""); setAReorder(""); setACost(""); setASupplier(""); setAForm("—");
  }

  function openEdit(item: StoreItem) {
    setEditItem(item); setEName(item.name); setEQty(String(item.qty));
    setEReorder(String(item.reorder)); setECost(String(item.unitCost)); setESupplier(item.supplier);
    setEForm(item.form ?? "—");
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    const qty = parseInt(eQty) || 0; const reorder = parseInt(eReorder) || 0;
    setItems((prev) => prev.map((i) => i.id === editItem.id
      ? { ...i, name: eName, form: eForm !== "—" ? eForm : undefined, qty, reorder, unitCost: parseFloat(eCost) || 0, supplier: eSupplier, status: deriveStatus(qty, reorder) }
      : i,
    ));
    setToast({ message: `${eName} updated.`, type: "success" });
    setEditItem(null);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Store Inventory"
        description="Track and manage all hospital consumables, PPE, and medical supplies."
        action={<Button size="md" onClick={() => setShowAdd(true)}>+ Add Item</Button>}
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total SKUs</p><p className="mt-1 text-3xl font-bold text-slate-900">{items.length}</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Attention</p><p className="mt-1 text-3xl font-bold text-red-600">{lowStock}</p></Card>
        <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Stock Value</p><p className="mt-1 text-3xl font-bold text-slate-900">₦{totalValue.toLocaleString()}</p></Card>
      </div>

      {/* Filters + table */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allCategories.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${category === c ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {["ID", "Name", "Category", "Form", "Unit", "Qty", "Reorder", "Unit Cost", "Supplier", "Status", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{item.id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-5 py-3 text-slate-500">{item.category}</td>
                  <td className="px-5 py-3">
                    {item.form
                      ? <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">{item.form}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{item.unit}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">{item.qty}</td>
                  <td className="px-5 py-3 text-slate-500">{item.reorder}</td>
                  <td className="px-5 py-3 text-slate-600">₦{item.unitCost.toFixed(2)}</td>
                  <td className="px-5 py-3 text-slate-500">{item.supplier}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>{item.status}</span></td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={11} className="px-5 py-10 text-center text-sm text-slate-400">No items found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add item modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item" className="max-w-xl">
        <form id="add-item-form" onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name <span className="text-red-500">*</span></label>
            <input required value={aName} onChange={(e) => setAName(e.target.value)} placeholder="e.g. Surgical Gloves (Medium)" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={aCat} onChange={(e) => setACat(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dosage Form <span className="text-slate-400 font-normal">(if medication)</span></label>
              <select value={aForm} onChange={(e) => setAForm(e.target.value)} className={inputCls}>
                {DOSAGE_FORMS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select value={aUnit} onChange={(e) => setAUnit(e.target.value)} className={inputCls}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input type="number" min="0" value={aQty} onChange={(e) => setAQty(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
              <input type="number" min="0" value={aReorder} onChange={(e) => setAReorder(e.target.value)} placeholder="20" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (₦)</label>
              <input type="number" step="0.01" min="0" value={aCost} onChange={(e) => setACost(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
            <input value={aSupplier} onChange={(e) => setASupplier(e.target.value)} placeholder="Supplier name" className={inputCls} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button size="md" type="submit" form="add-item-form">Add Item</Button>
        </ModalFooter>
      </Modal>

      {/* Edit modal */}
      {editItem && (
        <Modal open={true} onClose={() => setEditItem(null)} title={`Edit — ${editItem.name}`}>
          <form id="edit-item-form" onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
              <input value={eName} onChange={(e) => setEName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dosage Form <span className="text-slate-400 font-normal">(if medication)</span></label>
              <select value={eForm} onChange={(e) => setEForm(e.target.value)} className={inputCls}>
                {DOSAGE_FORMS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input type="number" min="0" value={eQty} onChange={(e) => setEQty(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                <input type="number" min="0" value={eReorder} onChange={(e) => setEReorder(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost</label>
                <input type="number" step="0.01" value={eCost} onChange={(e) => setECost(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input value={eSupplier} onChange={(e) => setESupplier(e.target.value)} className={inputCls} />
            </div>
          </form>
          <ModalFooter>
            <Button variant="ghost" size="md" type="button" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button size="md" type="submit" form="edit-item-form">Save Changes</Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
