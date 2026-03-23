"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import {
  syncNhisFromSupabase,
  addHmoTariff,
  updateHmoTariff,
  removeHmoTariff,
  type HmoTariff,
} from "@/lib/data/nhis-store";
import { getPharmacyDrugList } from "@/lib/data/pharmacy-store";
import { getTestCatalog } from "@/lib/data/lab-store";

const SERVICE_CATEGORIES: HmoTariff["serviceCategory"][] = [
  "consultation", "lab", "pharmacy", "nursing", "procedure", "admission", "other",
];

const CATEGORY_LABELS: Record<HmoTariff["serviceCategory"], string> = {
  consultation: "Consultation",
  lab: "Laboratory",
  pharmacy: "Pharmacy",
  nursing: "Nursing",
  procedure: "Procedure",
  admission: "Admission",
  other: "Other",
};

type TariffFormData = {
  serviceCategory: HmoTariff["serviceCategory"];
  serviceName: string;
  hmoPrice: string;
  copayType: "percentage" | "fixed";
  copayValue: string;
  isActive: boolean;
  notes: string;
};

const EMPTY_FORM: TariffFormData = {
  serviceCategory: "consultation",
  serviceName: "",
  hmoPrice: "",
  copayType: "percentage",
  copayValue: "0",
  isActive: true,
  notes: "",
};

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export default function NhisTariffsPage() {
  const { schemes, tariffs, hydrated } = useNhisStore();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [activeTab, setActiveTab] = useState<HmoTariff["serviceCategory"]>("consultation");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<HmoTariff | null>(null);
  const [form, setForm] = useState<TariffFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    syncNhisFromSupabase();
  }, []);

  // Auto-select first active scheme
  useEffect(() => {
    if (!selectedSchemeId && schemes.length > 0) {
      const first = schemes.find((s) => s.isActive) ?? schemes[0];
      if (first) setSelectedSchemeId(first.id);
    }
  }, [schemes, selectedSchemeId]);

  function field<K extends keyof TariffFormData>(key: K, value: TariffFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd(category?: HmoTariff["serviceCategory"]) {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, serviceCategory: category ?? activeTab });
    setError(null);
    setShowModal(true);
  }

  function openEdit(tariff: HmoTariff) {
    setEditTarget(tariff);
    setForm({
      serviceCategory: tariff.serviceCategory,
      serviceName: tariff.serviceName,
      hmoPrice: String(tariff.hmoPrice),
      copayType: tariff.copayType,
      copayValue: String(tariff.copayValue),
      isActive: tariff.isActive,
      notes: tariff.notes ?? "",
    });
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTarget(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.serviceName.trim()) { setError("Service name is required."); return; }
    if (!selectedSchemeId) { setError("Please select a scheme first."); return; }
    const hmoPrice = parseFloat(form.hmoPrice);
    if (isNaN(hmoPrice) || hmoPrice < 0) { setError("HMO price must be a valid non-negative number."); return; }
    const copayValue = parseFloat(form.copayValue);
    if (isNaN(copayValue) || copayValue < 0) { setError("Copay value must be a valid non-negative number."); return; }

    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await updateHmoTariff(editTarget.id, {
          serviceCategory: form.serviceCategory,
          serviceName: form.serviceName.trim(),
          hmoPrice,
          copayType: form.copayType,
          copayValue,
          isActive: form.isActive,
          notes: form.notes.trim() || undefined,
        });
        setToast({ message: `Tariff "${form.serviceName}" updated.`, type: "success" });
      } else {
        await addHmoTariff({
          schemeId: selectedSchemeId,
          serviceCategory: form.serviceCategory,
          serviceName: form.serviceName.trim(),
          hmoPrice,
          copayType: form.copayType,
          copayValue,
          isActive: form.isActive,
          notes: form.notes.trim() || undefined,
        });
        // Switch to the saved category's tab so the new tariff is immediately visible
        setActiveTab(form.serviceCategory);
        setToast({ message: `Tariff "${form.serviceName}" added.`, type: "success" });
      }
      // Force a fresh pull from DB to guard against mutate-vs-sync race conditions
      syncNhisFromSupabase(true);
      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tariff: HmoTariff) {
    if (!confirm(`Delete tariff "${tariff.serviceName}"? This cannot be undone.`)) return;
    try {
      await removeHmoTariff(tariff.id);
      setToast({ message: `Tariff "${tariff.serviceName}" deleted.`, type: "info" });
      syncNhisFromSupabase(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete tariff";
      setToast({ message: msg, type: "error" });
    }
  }

  const schemeTariffs = tariffs.filter((t) => t.schemeId === selectedSchemeId);
  const grouped = SERVICE_CATEGORIES.reduce<Record<string, HmoTariff[]>>((acc, cat) => {
    acc[cat] = schemeTariffs.filter((t) => t.serviceCategory === cat);
    return acc;
  }, {});
  const activeTariffs = grouped[activeTab] ?? [];

  return (
    <div className="flex flex-col gap-0">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Page header */}
      <div className="px-6 pt-6 pb-4">
        <PageHeader
          title="Tariffs"
          description="Configure HMO pricing and copay rules per scheme and service category."
        />
      </div>

      {/* Scheme selector + Add button — sticky toolbar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Scheme:</label>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={selectedSchemeId}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
          >
            {schemes.length === 0 && <option value="">No schemes configured</option>}
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
        <Button onClick={() => openAdd()} disabled={!selectedSchemeId}>
          + Add Tariff
        </Button>
      </div>

      {/* Category tabs */}
      {selectedSchemeId && (
        <div className="border-b border-slate-200 bg-white px-6 overflow-x-auto">
          <nav className="flex gap-0 -mb-px min-w-max">
            {SERVICE_CATEGORIES.map((cat) => {
              const count = grouped[cat]?.length ?? 0;
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={[
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none",
                    isActive
                      ? "border-accent text-accent"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
                  ].join(" ")}
                >
                  {CATEGORY_LABELS[cat]}
                  <span
                    className={[
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : count > 0
                          ? "bg-slate-100 text-slate-600"
                          : "bg-slate-50 text-slate-400",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Tab content */}
      <div className="px-6 py-5">
        {!hydrated ? (
          <div className="rounded-xl border border-slate-100 bg-white px-5 py-12 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : !selectedSchemeId ? (
          <div className="rounded-xl border border-slate-100 bg-white px-5 py-12 text-center text-sm text-slate-400">
            Select a scheme to view tariffs.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Tab header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <span className="font-semibold text-slate-900">{CATEGORY_LABELS[activeTab]}</span>
                <span className="ml-2 text-sm text-slate-400">
                  {activeTariffs.length} tariff{activeTariffs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Button size="sm" onClick={() => openAdd(activeTab)} disabled={!selectedSchemeId}>
                + Add
              </Button>
            </div>

            {activeTariffs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="text-3xl">📋</div>
                <p className="text-sm font-medium text-slate-500">
                  No {CATEGORY_LABELS[activeTab].toLowerCase()} tariffs yet for this scheme.
                </p>
                <Button size="sm" variant="ghost" onClick={() => openAdd(activeTab)}>
                  + Add first tariff
                </Button>
              </div>
            ) : (
              <>
              <div className="grid gap-3 p-3 md:hidden">
                {activeTariffs.length === 0 ? null : activeTariffs.map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{t.serviceName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{CATEGORY_LABELS[t.serviceCategory]}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <MobileMeta label="HMO Price" value={fmt(t.hmoPrice)} />
                      <MobileMeta label="Copay Type" value={t.copayType} />
                      <MobileMeta label="Copay Value" value={t.copayType === "percentage" ? `${t.copayValue}%` : fmt(t.copayValue)} />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t)} className="text-red-500 hover:text-red-700">Delete</Button>
                    </div>
                  </Card>
                ))}
                {activeTariffs.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    No {CATEGORY_LABELS[activeTab].toLowerCase()} tariffs yet for this scheme.
                  </div>
                )}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Service Name", "HMO Price", "Copay Type", "Copay Value", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTariffs.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{t.serviceName}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{fmt(t.hmoPrice)}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-semibold capitalize">
                            {t.copayType}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-700">
                          {t.copayType === "percentage" ? `${t.copayValue}%` : fmt(t.copayValue)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {t.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(t)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal open={showModal} title={editTarget ? "Edit Tariff" : "Add Tariff"} onClose={closeModal}>
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Service Category *</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.serviceCategory}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    serviceCategory: e.target.value as HmoTariff["serviceCategory"],
                    serviceName: "",
                    hmoPrice: "",
                  }));
                }}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Service Name *</label>

              {form.serviceCategory === "pharmacy" ? (
                <>
                  <SearchableSelect
                    value={form.serviceName}
                    onChange={(val) => {
                      const drug = getPharmacyDrugList().find((d) => d.name === val);
                      field("serviceName", val);
                      if (drug && !form.hmoPrice) {
                        field("hmoPrice", String(drug.unitPrice));
                      }
                    }}
                    placeholder="Search drug from inventory…"
                    showGroups
                    options={getPharmacyDrugList().map((d) => ({
                      value: d.name,
                      label: d.name,
                      sublabel: `₦${d.unitPrice.toFixed(2)}/${d.unit}`,
                      group: d.category,
                    }))}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    HMO price auto-fills from inventory — adjust to the negotiated scheme rate.
                  </p>
                </>
              ) : form.serviceCategory === "lab" ? (
                <>
                  <SearchableSelect
                    value={form.serviceName}
                    onChange={(val) => {
                      const test = getTestCatalog().find((t) => t.name === val);
                      field("serviceName", val);
                      if (test && !form.hmoPrice) {
                        field("hmoPrice", String(test.price));
                      }
                    }}
                    placeholder="Search lab test from catalog…"
                    showGroups
                    options={getTestCatalog().map((t) => ({
                      value: t.name,
                      label: t.name,
                      sublabel: `${t.code} · ₦${t.price}`,
                      group: t.category,
                    }))}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    HMO price auto-fills from catalog — adjust to the negotiated scheme rate.
                  </p>
                </>
              ) : (
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.serviceName}
                  onChange={(e) => field("serviceName", e.target.value)}
                  placeholder={
                    form.serviceCategory === "consultation" ? "e.g. General Consultation" :
                    form.serviceCategory === "nursing" ? "e.g. Wound Dressing" :
                    form.serviceCategory === "procedure" ? "e.g. IV Cannulation" :
                    form.serviceCategory === "admission" ? "e.g. General Ward (per day)" :
                    "Service name"
                  }
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">HMO Price (₦) *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                type="number"
                min="0"
                step="0.01"
                value={form.hmoPrice}
                onChange={(e) => field("hmoPrice", e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Copay Type *</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.copayType}
                  onChange={(e) => field("copayType", e.target.value as "percentage" | "fixed")}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Copay Value {form.copayType === "percentage" ? "(%)" : "(₦)"}
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.copayValue}
                  onChange={(e) => field("copayValue", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={2}
                value={form.notes}
                onChange={(e) => field("notes", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="tariffActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => field("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="tariffActive" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Tariff"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
