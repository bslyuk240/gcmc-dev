"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import type { TestCatalogItem } from "@/lib/data/lab-store";

const CATEGORIES = ["All", "Haematology", "Microbiology", "Clinical Chemistry", "Serology"];

export default function LabTestCatalogPage() {
  const { catalog } = useLabStore();
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [viewItem, setViewItem] = useState<TestCatalogItem | null>(null);
  const [search, setSearch] = useState("");

  const filtered = catalog
    .filter((c) => categoryFilter === "All" || c.category === categoryFilter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  const totalRevenuePotential = filtered.reduce((s, c) => s + c.price, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Catalog"
        description="Available laboratory tests with pricing, sample types, and turnaround times."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tests Available</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{catalog.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{CATEGORIES.length - 1}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price Range</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            ₦{Math.min(...catalog.map((c) => c.price))} — ₦{Math.max(...catalog.map((c) => c.price))}
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
                {["Code", "Test Name", "Category", "Department", "Sample Type", "Price", "Turnaround", "Action"].map((h) => (
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
                  <td className="px-5 py-3 font-bold text-slate-900">₦{item.price}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {item.turnaroundHours < 1 ? `${item.turnaroundHours * 60} min`
                      : item.turnaroundHours >= 24 ? `${Math.round(item.turnaroundHours / 24)} day${item.turnaroundHours >= 48 ? "s" : ""}`
                      : `${item.turnaroundHours} hr${item.turnaroundHours > 1 ? "s" : ""}`}
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline" onClick={() => setViewItem(item)}>Details</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No tests match your search.</td></tr>
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
              <div><p className="text-xs text-slate-500">Price</p><p className="font-bold text-lg text-slate-900">₦{viewItem.price}</p></div>
              <div><p className="text-xs text-slate-500">Turnaround</p>
                <p className="font-semibold">
                  {viewItem.turnaroundHours < 1 ? `${viewItem.turnaroundHours * 60} minutes`
                    : viewItem.turnaroundHours >= 24 ? `${Math.round(viewItem.turnaroundHours / 24)} day${viewItem.turnaroundHours >= 48 ? "s" : ""}`
                    : `${viewItem.turnaroundHours} hour${viewItem.turnaroundHours > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Description</p>
              <p className="text-slate-700">{viewItem.description}</p>
            </div>
          </div>
          <ModalFooter>
            <Button size="md" onClick={() => setViewItem(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
