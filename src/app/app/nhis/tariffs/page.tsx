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

export default function NhisTariffsPage() {
  const { schemes, tariffs, hydrated } = useNhisStore();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
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
    setForm({ ...EMPTY_FORM, serviceCategory: category ?? "consultation" });
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
        setToast({ message: `Tariff "${form.serviceName}" added.`, type: "success" });
      }
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete tariff";
      setToast({ message: msg, type: "error" });
    }
  }

  const schemeTariffs = tariffs.filter((t) => t.schemeId === selectedSchemeId);

  // Group by service category
  const grouped = SERVICE_CATEGORIES.reduce<Record<string, HmoTariff[]>>((acc, cat) => {
    acc[cat] = schemeTariffs.filter((t) => t.serviceCategory === cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tariffs"
        description="Configure HMO pricing and copay rules per scheme and service category."
      />

      {<Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Scheme selector */}
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Scheme:</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={selectedSchemeId}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
          >
            {schemes.length === 0 && <option value="">No schemes configured</option>}
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
        <Button onClick={() => openAdd()} disabled={!selectedSchemeId}>+ Add Tariff</Button>
      </Card>

      {!hydrated ? (
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
      ) : !selectedSchemeId ? (
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-8 text-center text-sm text-slate-400">Select a scheme to view tariffs.</div>
      ) : (
        <>
          {SERVICE_CATEGORIES.map((cat) => {
            const catTariffs = grouped[cat] ?? [];
            return (
              <Card key={cat} className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <h3 className="font-bold text-slate-900 capitalize">{cat} ({catTariffs.length})</h3>
                  <Button size="sm" variant="ghost" onClick={() => openAdd(cat)}>+ Add</Button>
                </div>
                {catTariffs.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-slate-400">No tariffs for this category.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {["Service Name", "HMO Price", "Copay Type", "Copay Value", "Status", "Actions"].map((h) => (
                            <th key={h} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {catTariffs.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50">
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
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(t)} className="text-red-500 hover:text-red-700">Delete</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}

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
                  // Clear service name when switching category so catalog/text doesn't mismatch
                  setForm((prev) => ({
                    ...prev,
                    serviceCategory: e.target.value as HmoTariff["serviceCategory"],
                    serviceName: "",
                    hmoPrice: "",
                  }));
                }}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
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
                      // Auto-fill HMO price from the drug's unit price
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
