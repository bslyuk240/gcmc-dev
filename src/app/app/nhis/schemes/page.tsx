"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import { syncNhisFromSupabase, addHmoScheme, updateHmoScheme, type HmoScheme } from "@/lib/data/nhis-store";

type SchemeFormData = {
  name: string;
  code: string;
  type: "capitation" | "fee_for_service";
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const EMPTY_FORM: SchemeFormData = {
  name: "",
  code: "",
  type: "fee_for_service",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  address: "",
  notes: "",
  isActive: true,
};

export default function NhisSchemesPage() {
  const { schemes, hydrated } = useNhisStore();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<HmoScheme | null>(null);
  const [form, setForm] = useState<SchemeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    syncNhisFromSupabase();
  }, []);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  }

  function openEdit(scheme: HmoScheme) {
    setEditTarget(scheme);
    setForm({
      name: scheme.name,
      code: scheme.code,
      type: scheme.type,
      contactPerson: scheme.contactPerson ?? "",
      contactPhone: scheme.contactPhone ?? "",
      contactEmail: scheme.contactEmail ?? "",
      address: scheme.address ?? "",
      notes: scheme.notes ?? "",
      isActive: scheme.isActive,
    });
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTarget(null);
    setError(null);
  }

  function field(key: keyof SchemeFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Scheme name is required."); return; }
    if (!form.code.trim()) { setError("Scheme code is required."); return; }

    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        await updateHmoScheme(editTarget.id, {
          name: form.name.trim(),
          code: form.code.trim(),
          type: form.type,
          contactPerson: form.contactPerson.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
          isActive: form.isActive,
        });
        setToast({ message: `Scheme "${form.name}" updated successfully.`, type: "success" });
      } else {
        await addHmoScheme({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          type: form.type,
          contactPerson: form.contactPerson.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
          isActive: form.isActive,
        });
        setToast({ message: `Scheme "${form.name}" added successfully.`, type: "success" });
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

  async function handleToggleActive(scheme: HmoScheme) {
    try {
      await updateHmoScheme(scheme.id, { isActive: !scheme.isActive });
      setToast({ message: `Scheme "${scheme.name}" ${!scheme.isActive ? "activated" : "deactivated"}.`, type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update scheme";
      setToast({ message: msg, type: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HMO Schemes"
        description="Manage NHIS and HMO scheme configurations, contacts, and status."
      />

      {<Toast toast={toast} onDismiss={() => setToast(null)} />}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Schemes ({schemes.length})</h3>
          <Button onClick={openAdd}>+ Add Scheme</Button>
        </div>

        {!hydrated ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Name", "Code", "Type", "Contact Person", "Phone", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schemes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                      No HMO schemes configured yet. Click &quot;Add Scheme&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  schemes.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{s.code}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-semibold">
                          {s.type === "fee_for_service" ? "Fee-for-Service" : "Capitation"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{s.contactPerson || "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{s.contactPhone || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggleActive(s)}>
                            {s.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <Modal
          open={showModal}
          title={editTarget ? "Edit HMO Scheme" : "Add HMO Scheme"}
          onClose={closeModal}
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Scheme Name *</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                  placeholder="e.g. NHIS Basic"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Code *</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.code}
                  onChange={(e) => field("code", e.target.value.toUpperCase())}
                  placeholder="e.g. NHIS-BASIC"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Type *</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.type}
                onChange={(e) => field("type", e.target.value as "capitation" | "fee_for_service")}
              >
                <option value="fee_for_service">Fee-for-Service</option>
                <option value="capitation">Capitation</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Contact Person</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.contactPerson}
                  onChange={(e) => field("contactPerson", e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.contactPhone}
                  onChange={(e) => field("contactPhone", e.target.value)}
                  placeholder="+234..."
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                type="email"
                value={form.contactEmail}
                onChange={(e) => field("contactEmail", e.target.value)}
                placeholder="scheme@hmo.ng"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={2}
                value={form.address}
                onChange={(e) => field("address", e.target.value)}
                placeholder="Office address"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={2}
                value={form.notes}
                onChange={(e) => field("notes", e.target.value)}
                placeholder="Any additional information"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="schemeActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => field("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="schemeActive" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Scheme"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
