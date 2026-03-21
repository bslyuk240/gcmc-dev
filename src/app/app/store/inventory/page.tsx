"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  fetchStoreInventory,
  upsertStoreInventoryItem,
  type StoreInventoryItem,
} from "@/lib/supabase/db";

const DOSAGE_FORMS = [
  "—", "Tablet", "Capsule", "Syrup", "Suspension", "Solution",
  "Vial", "Ampoule", "Infusion Bag", "Injection",
  "Inhaler", "Nasal Spray", "Eye Drops", "Ear Drops",
  "Cream", "Ointment", "Gel", "Patch",
  "Suppository", "Powder", "Granules", "Other",
];

const STATUS_STYLES: Record<string, string> = {
  "In Stock": "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700",
  "Out of Stock": "bg-slate-100 text-slate-500",
};

const CATEGORIES = ["PPE", "Medical", "Wound Care", "Sterilization", "Respiratory", "Admin", "Pharmaceutical", "Furniture", "Other"];
const UNITS = ["Box", "Pack", "Roll", "Piece", "Bottle", "Set", "Pair", "Litre", "Sheet", "Bag", "Units"];

const CSV_HEADERS = ["id", "name", "category", "form", "unit", "qty", "reorder", "unit_cost", "supplier"];

function deriveStatus(qty: number, reorder: number): string {
  if (qty === 0) return "Out of Stock";
  if (qty <= reorder * 0.3) return "Critical";
  if (qty <= reorder) return "Low Stock";
  return "In Stock";
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function toCSV(items: StoreInventoryItem[]): string {
  const header = ["ID", "Name", "Category", "Form", "Unit", "Qty", "Reorder Level", "Unit Cost (₦)", "Supplier"].join(",");
  const rows = items.map((i) =>
    [
      i.id,
      `"${i.name.replace(/"/g, '""')}"`,
      i.category,
      i.form ?? "",
      i.unit,
      i.qty,
      i.reorder,
      i.unitCost,
      `"${(i.supplier ?? "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

function parseCSV(text: string): StoreInventoryItem[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect header row (starts with "id" or "ID" or "Name"...)
  const firstLower = lines[0].toLowerCase();
  const dataLines = firstLower.startsWith("id") || firstLower.startsWith("name") ? lines.slice(1) : lines;

  const results: StoreInventoryItem[] = [];
  for (const line of dataLines) {
    // Simple CSV parse (handles quoted fields)
    const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
      c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c.trim()
    ) ?? [];

    const [id, name, category, form, unit, qty, reorder, unitCost, supplier] = cols;
    if (!name) continue;

    const qtyN = parseInt(qty) || 0;
    const reorderN = parseInt(reorder) || 10;
    results.push({
      id: id?.trim() || `STR-${Date.now()}-${results.length}`,
      name: name.trim(),
      category: category?.trim() || "Other",
      form: form?.trim() || undefined,
      unit: unit?.trim() || "Units",
      qty: qtyN,
      reorder: reorderN,
      unitCost: parseFloat(unitCost) || 0,
      supplier: supplier?.trim() || "",
      status: deriveStatus(qtyN, reorderN),
    });
  }
  return results;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreInventoryPage() {
  const [items, setItems] = useState<StoreInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<StoreInventoryItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importRows, setImportRows] = useState<StoreInventoryItem[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Add form
  const [aName, setAName] = useState(""); const [aCat, setACat] = useState("PPE");
  const [aUnit, setAUnit] = useState("Box"); const [aQty, setAQty] = useState("");
  const [aReorder, setAReorder] = useState(""); const [aCost, setACost] = useState("");
  const [aSupplier, setASupplier] = useState(""); const [aForm, setAForm] = useState("—");

  // Edit form
  const [eName, setEName] = useState(""); const [eQty, setEQty] = useState("");
  const [eReorder, setEReorder] = useState(""); const [eCost, setECost] = useState("");
  const [eSupplier, setESupplier] = useState(""); const [eForm, setEForm] = useState("—");

  useEffect(() => {
    fetchStoreInventory()
      .then(setItems)
      .catch(() => setToast({ message: "Failed to load inventory.", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const allCategories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = items.filter((i) =>
    (category === "All" || i.category === category) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())),
  );

  const totalValue = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const lowStock = items.filter((i) => i.status !== "In Stock").length;

  // ── Add ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(aQty) || 0; const reorder = parseInt(aReorder) || 10;
    const newItem: StoreInventoryItem = {
      id: `STR-${Date.now()}`,
      name: aName, category: aCat, form: aForm !== "—" ? aForm : undefined, unit: aUnit, qty, reorder,
      unitCost: parseFloat(aCost) || 0, supplier: aSupplier,
      status: deriveStatus(qty, reorder),
    };
    setItems((prev) => [newItem, ...prev]);
    setToast({ message: `${aName} added to inventory.`, type: "success" });
    setShowAdd(false);
    setAName(""); setACat("PPE"); setAUnit("Box"); setAQty(""); setAReorder(""); setACost(""); setASupplier(""); setAForm("—");
    await upsertStoreInventoryItem(newItem).catch(() => {});
  }

  // ── Edit ──
  function openEdit(item: StoreInventoryItem) {
    setEditItem(item); setEName(item.name); setEQty(String(item.qty));
    setEReorder(String(item.reorder)); setECost(String(item.unitCost)); setESupplier(item.supplier);
    setEForm(item.form ?? "—");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    const qty = parseInt(eQty) || 0; const reorder = parseInt(eReorder) || 0;
    const updated: StoreInventoryItem = {
      ...editItem, name: eName, form: eForm !== "—" ? eForm : undefined, qty, reorder,
      unitCost: parseFloat(eCost) || 0, supplier: eSupplier, status: deriveStatus(qty, reorder),
    };
    setItems((prev) => prev.map((i) => i.id === editItem.id ? updated : i));
    setToast({ message: `${eName} updated.`, type: "success" });
    setEditItem(null);
    await upsertStoreInventoryItem(updated).catch(() => {});
  }

  // ── CSV Export ──
  function handleExport() {
    const csv = toCSV(items);
    downloadFile(csv, `store-inventory-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  }

  function handleDownloadTemplate() {
    const template = [
      "ID,Name,Category,Form,Unit,Qty,Reorder Level,Unit Cost (₦),Supplier",
      'STR-001,"N95 Respirators",PPE,,Box,200,50,450,MedSupply Co.',
      'STR-002,"Surgical Gloves (Medium)",PPE,,Box,150,30,120,SafeGuard Ltd.',
      'STR-003,"Paracetamol 500mg",Pharmaceutical,Tablet,Pack,80,20,85,PharmDist Ltd.',
    ].join("\n");
    downloadFile(template, "store-inventory-template.csv", "text/csv");
  }

  // ── CSV Import ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setToast({ message: "No valid rows found in CSV. Check the format.", type: "error" });
      } else {
        setImportRows(rows);
        setShowImportPreview(true);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  async function confirmImport() {
    setImporting(true);
    setShowImportPreview(false);
    try {
      await Promise.all(importRows.map((row) => upsertStoreInventoryItem(row)));
      // Refresh from DB
      const fresh = await fetchStoreInventory();
      setItems(fresh);
      setToast({ message: `${importRows.length} items imported successfully.`, type: "success" });
    } catch {
      setToast({ message: "Import failed. Some items may not have saved.", type: "error" });
    } finally {
      setImporting(false);
      setImportRows([]);
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Store Inventory"
        description="Track and manage all hospital consumables, PPE, and medical supplies."
        action={
          <div className="flex items-center gap-2">
            <Button size="md" variant="outline" onClick={handleExport} disabled={items.length === 0}>
              ↓ Export CSV
            </Button>
            <Button size="md" variant="outline" onClick={() => csvInputRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "↑ Import CSV"}
            </Button>
            <Button size="md" onClick={() => setShowAdd(true)}>+ Add Item</Button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total SKUs</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{loading ? "—" : items.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Attention</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{loading ? "—" : lowStock}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Stock Value</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{loading ? "—" : `₦${totalValue.toLocaleString()}`}</p>
        </Card>
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
              {loading && (
                <tr><td colSpan={11} className="px-5 py-10 text-center text-sm text-slate-400">Loading…</td></tr>
              )}
              {!loading && filtered.map((item) => (
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
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status] ?? "bg-slate-100 text-slate-500"}`}>{item.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center">
                    <p className="text-sm text-slate-400">No items found.</p>
                    {items.length === 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-slate-400">Get started by adding items manually or importing a CSV.</p>
                        <button type="button" onClick={handleDownloadTemplate} className="text-xs font-medium text-[var(--accent)] hover:underline">
                          Download CSV template
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
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

      {/* CSV Import preview modal */}
      <Modal open={showImportPreview} onClose={() => setShowImportPreview(false)} title="Import Preview" className="max-w-3xl">
        <div className="space-y-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
            <strong>{importRows.length} items</strong> parsed from CSV. Review below then confirm to save to Supabase. Existing items with the same ID will be updated.
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {["ID", "Name", "Category", "Unit", "Qty", "Reorder", "Cost", "Supplier", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-400">{r.id}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="px-3 py-2 text-slate-500">{r.category}</td>
                    <td className="px-3 py-2 text-slate-500">{r.unit}</td>
                    <td className="px-3 py-2 font-bold">{r.qty}</td>
                    <td className="px-3 py-2 text-slate-500">{r.reorder}</td>
                    <td className="px-3 py-2">₦{r.unitCost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{r.supplier}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            Not what you expected?{" "}
            <button type="button" onClick={handleDownloadTemplate} className="font-medium text-[var(--accent)] hover:underline">Download the CSV template</button>
            {" "}to see the expected format.
          </p>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowImportPreview(false)}>Cancel</Button>
          <Button size="md" onClick={confirmImport}>Import {importRows.length} Items</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
