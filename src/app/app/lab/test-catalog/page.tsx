"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { addTestCatalogItem, updateTestCatalogItem, type TestCatalogItem } from "@/lib/data/lab-store";

const CATEGORY_OPTIONS = ["Haematology", "Microbiology", "Clinical Chemistry", "Serology"];
const CATEGORIES = ["All", ...CATEGORY_OPTIONS];

const BLANK_FORM = {
  code: "",
  name: "",
  category: CATEGORY_OPTIONS[0],
  department: "Lab",
  sampleType: "",
  price: "",
  turnaroundHours: "",
  description: "",
};

type FormState = typeof BLANK_FORM;

function newCatalogId() {
  return `CAT-${Date.now().toString(36).toUpperCase()}`;
}

function fmtTurnaround(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours >= 24) return `${Math.round(hours / 24)} day${hours >= 48 ? "s" : ""}`;
  return `${hours} hr${hours > 1 ? "s" : ""}`;
}

export default function LabTestCatalogPage() {
  const { catalog } = useLabStore();
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<TestCatalogItem | null>(null);
  const [editTarget, setEditTarget] = useState<TestCatalogItem | null>(null); // null = new, non-null = edit
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const filtered = catalog
    .filter((c) => categoryFilter === "All" || c.category === categoryFilter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  const totalRevenuePotential = filtered.reduce((s, c) => s + c.price, 0);

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  function openAdd() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setFormOpen(true);
  }

  function openEdit(item: TestCatalogItem) {
    setEditTarget(item);
    setForm({
      code: item.code,
      name: item.name,
      category: item.category,
      department: item.department,
      sampleType: item.sampleType,
      price: String(item.price),
      turnaroundHours: String(item.turnaroundHours),
      description: item.description,
    });
    setFormOpen(true);
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const isValid = form.code.trim() && form.name.trim() && form.sampleType.trim() && Number(form.price) > 0 && Number(form.turnaroundHours) > 0;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    const item: TestCatalogItem = {
      id: editTarget?.id ?? newCatalogId(),
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      department: form.department.trim() || "Lab",
      sampleType: form.sampleType.trim(),
      price: Number(form.price),
      turnaroundHours: Number(form.turnaroundHours),
      description: form.description.trim(),
    };
    try {
      if (editTarget) {
        await updateTestCatalogItem(item);
        setToast({ message: `"${item.name}" updated successfully.`, type: "success" });
      } else {
        await addTestCatalogItem(item);
        setToast({ message: `"${item.name}" added to catalog.`, type: "success" });
      }
      setFormOpen(false);
    } catch {
      setToast({ message: "Save failed. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Catalog"
        description="Available laboratory tests with pricing, sample types, and turnaround times."
        action={<Button onClick={openAdd}>+ Add Test</Button>}
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tests Available</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{catalog.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{CATEGORY_OPTIONS.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price Range</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {catalog.length > 0
              ? `₦${Math.min(...catalog.map((c) => c.price)).toLocaleString()} — ₦${Math.max(...catalog.map((c) => c.price)).toLocaleString()}`
              : "—"}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test name or code..."
            className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-(--accent)/20" />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${categoryFilter === cat ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Test List</h3>
          <p className="text-xs text-slate-500">{filtered.length} test{filtered.length !== 1 ? "s" : ""} · Combined price: ₦{totalRevenuePotential.toLocaleString()}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Code", "Test Name", "Category", "Department", "Sample Type", "Price", "Turnaround", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs font-bold text-slate-600">{item.code}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-sky-50 text-sky-700 px-2.5 py-0.5 text-xs font-semibold">{item.category}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{item.department}</td>
                  <td className="px-5 py-3 text-slate-600">{item.sampleType}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{item.price.toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-500">{fmtTurnaround(item.turnaroundHours)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewItem(item)}>Details</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Edit</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                    {catalog.length === 0 ? (
                      <div className="space-y-2">
                        <p>No tests in catalog yet.</p>
                        <button onClick={openAdd} className="text-accent font-semibold hover:underline">+ Add your first test</button>
                      </div>
                    ) : "No tests match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Billing note:</strong> Prices listed here are used by Accounts for patient billing when tests are ordered. Doctors can reference turnaround times when setting test priority.
      </div>

      {/* Detail modal */}
      {viewItem && (
        <Modal open={true} onClose={() => setViewItem(null)} title={viewItem.name}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <div><p className="text-xs text-slate-500">Code</p><p className="font-mono font-bold">{viewItem.code}</p></div>
              <div><p className="text-xs text-slate-500">Category</p><p>{viewItem.category}</p></div>
              <div><p className="text-xs text-slate-500">Department</p><p>{viewItem.department}</p></div>
              <div><p className="text-xs text-slate-500">Sample Type</p><p>{viewItem.sampleType}</p></div>
              <div><p className="text-xs text-slate-500">Price</p><p className="font-bold text-lg text-slate-900">₦{viewItem.price.toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-500">Turnaround</p><p className="font-semibold">{fmtTurnaround(viewItem.turnaroundHours)}</p></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Description</p>
              <p className="text-slate-700">{viewItem.description || "—"}</p>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => { setViewItem(null); openEdit(viewItem); }}>Edit</Button>
            <Button size="md" onClick={() => setViewItem(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Add / Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? `Edit — ${editTarget.name}` : "Add New Test"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Test Code *</label>
              <input value={form.code} onChange={(e) => setField("code", e.target.value)}
                placeholder="e.g. FBC" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setField("category", e.target.value)} className={inputCls}>
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Test Name *</label>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Full Blood Count" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
              <input value={form.department} onChange={(e) => setField("department", e.target.value)}
                placeholder="e.g. Haematology" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Type *</label>
              <input value={form.sampleType} onChange={(e) => setField("sampleType", e.target.value)}
                placeholder="e.g. EDTA Blood" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₦) *</label>
              <input type="number" min="0" value={form.price} onChange={(e) => setField("price", e.target.value)}
                placeholder="e.g. 800" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Turnaround (hours) *</label>
              <input type="number" min="0.25" step="0.25" value={form.turnaroundHours} onChange={(e) => setField("turnaroundHours", e.target.value)}
                placeholder="e.g. 2" className={inputCls} />
              <p className="mt-1 text-xs text-slate-400">Use 0.5 for 30 min, 24 for 1 day</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)}
              placeholder="Brief clinical description of the test..." className={inputCls} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button size="md" disabled={!isValid || saving} onClick={handleSave}>
            {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Test"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
