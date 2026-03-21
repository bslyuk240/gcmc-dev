"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import {
  syncNhisFromSupabase,
  addHmoEnrollment,
  updateHmoEnrollment,
  type HmoEnrollment,
} from "@/lib/data/nhis-store";

type EnrollmentFormData = {
  patientId: string;
  schemeId: string;
  memberId: string;
  planName: string;
  copayPercentage: string;
  validFrom: string;
  validUntil: string;
  authorizedBy: string;
  notes: string;
  isActive: boolean;
};

const EMPTY_FORM: EnrollmentFormData = {
  patientId: "",
  schemeId: "",
  memberId: "",
  planName: "",
  copayPercentage: "0",
  validFrom: "",
  validUntil: "",
  authorizedBy: "",
  notes: "",
  isActive: true,
};

function formatDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NhisPatientsPage() {
  const { schemes, enrollments, hydrated } = useNhisStore();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<HmoEnrollment | null>(null);
  const [form, setForm] = useState<EnrollmentFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [schemeFilter, setSchemeFilter] = useState("all");

  useEffect(() => {
    syncNhisFromSupabase();
  }, []);

  function field<K extends keyof EnrollmentFormData>(key: K, value: EnrollmentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  }

  function openEdit(e: HmoEnrollment) {
    setEditTarget(e);
    setForm({
      patientId: e.patientId,
      schemeId: e.schemeId,
      memberId: e.memberId,
      planName: e.planName ?? "",
      copayPercentage: String(e.copayPercentage),
      validFrom: e.validFrom ?? "",
      validUntil: e.validUntil ?? "",
      authorizedBy: e.authorizedBy ?? "",
      notes: e.notes ?? "",
      isActive: e.isActive,
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
    if (!form.patientId.trim()) { setError("Patient ID is required."); return; }
    if (!form.schemeId) { setError("Please select an HMO scheme."); return; }
    if (!form.memberId.trim()) { setError("Member ID is required."); return; }

    const copay = parseFloat(form.copayPercentage);
    if (isNaN(copay) || copay < 0 || copay > 100) { setError("Copay percentage must be between 0 and 100."); return; }

    setSaving(true);
    setError(null);
    try {
      const selectedScheme = schemes.find((s) => s.id === form.schemeId);
      const schemeName = selectedScheme?.name ?? "";

      if (editTarget) {
        await updateHmoEnrollment(editTarget.id, {
          schemeId: form.schemeId,
          memberId: form.memberId.trim(),
          planName: form.planName.trim() || undefined,
          copayPercentage: copay,
          isActive: form.isActive,
          validFrom: form.validFrom || undefined,
          validUntil: form.validUntil || undefined,
          authorizedBy: form.authorizedBy.trim() || undefined,
          notes: form.notes.trim() || undefined,
          schemeName,
        });
        setToast({ message: `Enrollment for patient ${form.patientId} updated.`, type: "success" });
      } else {
        await addHmoEnrollment(
          {
            patientId: form.patientId.trim(),
            schemeId: form.schemeId,
            memberId: form.memberId.trim(),
            planName: form.planName.trim() || undefined,
            copayPercentage: copay,
            isActive: form.isActive,
            validFrom: form.validFrom || undefined,
            validUntil: form.validUntil || undefined,
            authorizedBy: form.authorizedBy.trim() || undefined,
            notes: form.notes.trim() || undefined,
          },
          schemeName,
          form.patientId.trim(), // patientName placeholder; will be joined from DB on next sync
        );
        setToast({ message: `Patient ${form.patientId} enrolled in ${schemeName}.`, type: "success" });
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

  async function handleDeactivate(enrollment: HmoEnrollment) {
    try {
      await updateHmoEnrollment(enrollment.id, { isActive: false });
      setToast({ message: `Enrollment for ${enrollment.patientName} deactivated.`, type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate enrollment";
      setToast({ message: msg, type: "error" });
    }
  }

  const filtered = enrollments.filter((e) => {
    if (schemeFilter !== "all" && e.schemeId !== schemeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.patientName.toLowerCase().includes(q) ||
      (e.patientDisplayId ?? "").toLowerCase().includes(q) ||
      e.memberId.toLowerCase().includes(q) ||
      e.schemeName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrolled Patients"
        description="Manage patient HMO enrollments, member IDs, and plan details."
      />

      {<Toast toast={toast} onDismiss={() => setToast(null)} />}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-slate-900">
            Patient Enrollments ({filtered.length}{filtered.length !== enrollments.length ? ` of ${enrollments.length}` : ""})
          </h3>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={schemeFilter}
              onChange={(e) => setSchemeFilter(e.target.value)}
            >
              <option value="all">All Schemes</option>
              {schemes.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Search name, ID, member…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button onClick={openAdd}>+ Enroll Patient</Button>
          </div>
        </div>

        {!hydrated ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Patient", "Patient ID", "Member ID", "Scheme", "Plan", "Copay %", "Valid Until", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">
                      {search ? "No enrollments match your search." : "No enrolled patients yet."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{e.patientName || e.patientDisplayId || e.patientId}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{e.patientDisplayId || "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{e.memberId}</td>
                      <td className="px-5 py-3 text-slate-600">{e.schemeName}</td>
                      <td className="px-5 py-3 text-slate-600">{e.planName || "—"}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">{e.copayPercentage}%</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatDate(e.validUntil)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {e.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
                          {e.isActive && (
                            <Button size="sm" variant="ghost" onClick={() => handleDeactivate(e)}>Deactivate</Button>
                          )}
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
          title={editTarget ? "Edit Enrollment" : "Enroll Patient"}
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
                <label className="mb-1 block text-xs font-semibold text-slate-600">Patient ID (Hospital No.) *</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-slate-50"
                  value={form.patientId}
                  onChange={(e) => field("patientId", e.target.value)}
                  placeholder="e.g. HSP-000123"
                  disabled={!!editTarget}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">HMO Scheme *</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.schemeId}
                  onChange={(e) => field("schemeId", e.target.value)}
                >
                  <option value="">— Select Scheme —</option>
                  {schemes.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Member ID *</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.memberId}
                  onChange={(e) => field("memberId", e.target.value)}
                  placeholder="HMO member number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Plan Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={form.planName}
                  onChange={(e) => field("planName", e.target.value)}
                  placeholder="e.g. Standard, Executive"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Copay Percentage (%)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.copayPercentage}
                onChange={(e) => field("copayPercentage", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Valid From</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => field("validFrom", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Valid Until</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => field("validUntil", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Authorized By</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={form.authorizedBy}
                onChange={(e) => field("authorizedBy", e.target.value)}
                placeholder="Authorizing officer name"
              />
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
                id="enrollmentActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => field("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="enrollmentActive" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Enroll Patient"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
