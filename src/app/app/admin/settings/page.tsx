"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useBillingPresets, invalidateBillingPresetsCache } from "@/lib/hooks/use-billing-presets";
import type { BillingPreset } from "@/lib/supabase/db";
import { useTenantBranding, useSetTenantBranding } from "@/modules/tenant/tenant-context";
import {
  removeHospitalLogoAction,
  updateHospitalSettingsAction,
} from "@/server/actions/admin/update-hospital-settings";

const TABS = [
  { id: "general",       label: "General" },
  { id: "billing-rates", label: "Billing Rates" },
  { id: "security",      label: "Security" },
  { id: "notifications", label: "Notifications" },
];

const CATEGORY_LABELS: Record<string, string> = {
  visit:        "Visit / Check-in Fees (Front Desk)",
  frontdesk:    "Manual Front Desk Charges",
  consultation: "Doctor Consultation Fees",
  procedure:    "Nursing Procedure Charges",
  inpatient:    "Inpatient Bed-Day Rates",
};

const CATEGORY_ORDER = ["visit", "consultation", "procedure", "inpatient", "frontdesk"];

const TIMEZONES = [
  "(GMT+00:00) Coordinated Universal Time",
  "(GMT+00:00) Greenwich Mean Time",
  "(GMT+01:00) West Africa Time",
  "(GMT+02:00) Central Africa Time",
  "(GMT+03:00) East Africa Time",
  "(GMT+05:30) India Standard Time",
  "(GMT-05:00) Eastern Time (US)",
];

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  const branding = useTenantBranding();
  const setBranding = useSetTenantBranding();
  const [activeTab, setActiveTab] = useState("general");
  const [toast, setToast] = useState<ToastData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // ── Billing Rates tab ────────────────────────────────────────────────────
  const { presets, loading: presetsLoading, savePreset, removePreset } = useBillingPresets();
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc,   setEditDesc]   = useState("");
  const [addCategory, setAddCategory] = useState<string>("visit");
  const [addName,     setAddName]     = useState("");
  const [addAmount,   setAddAmount]   = useState("");
  const [addDesc,     setAddDesc]     = useState("");
  const [saving,      setSaving]      = useState(false);

  function startEdit(p: BillingPreset) {
    setEditingId(p.id);
    setEditAmount(String(p.amount));
    setEditDesc(p.description ?? "");
  }

  async function commitEdit(p: BillingPreset) {
    setSaving(true);
    await savePreset({ ...p, amount: parseFloat(editAmount) || 0, description: editDesc });
    setEditingId(null);
    setSaving(false);
    setToast({ message: `"${p.name}" updated.`, type: "success" });
  }

  async function handleDelete(p: BillingPreset) {
    if (!confirm(`Delete "${p.name}" from ${CATEGORY_LABELS[p.category] ?? p.category}?`)) return;
    await removePreset(p.id);
    setToast({ message: `"${p.name}" deleted.`, type: "info" });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addAmount) return;
    setSaving(true);
    const result = await savePreset({
      category: addCategory, name: addName.trim(),
      amount: parseFloat(addAmount) || 0, description: addDesc.trim(),
      isActive: true,
    });
    setSaving(false);
    if (result) {
      invalidateBillingPresetsCache();
      setAddName(""); setAddAmount(""); setAddDesc("");
      setToast({ message: `"${result.name}" added to ${CATEGORY_LABELS[addCategory] ?? addCategory}.`, type: "success" });
    } else {
      setToast({ message: "Failed to add — name may already exist in that category.", type: "error" });
    }
  }

  // General tab state
  const [hospitalName, setHospitalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONES[2]);
  const [switchboard, setSwitchboard] = useState("");
  const [address, setAddress] = useState("");
  const [generalSaving, setGeneralSaving] = useState(false);

  useEffect(() => {
    setHospitalName(branding.name);
    setContactEmail(branding.email);
    setTimezone(branding.timezone || TIMEZONES[2]);
    setSwitchboard(branding.phone);
    setAddress(branding.address);
  }, [branding]);

  function resetGeneralForm() {
    setHospitalName(branding.name);
    setContactEmail(branding.email);
    setTimezone(branding.timezone || TIMEZONES[2]);
    setSwitchboard(branding.phone);
    setAddress(branding.address);
  }

  // Security tab state
  const [require2FA, setRequire2FA] = useState(true);
  const [pwdExpiry, setPwdExpiry] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // Notification tab state
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [approvalEmails, setApprovalEmails] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [ticketAlert, setTicketAlert] = useState(true);
  const [leaveAlert, setLeaveAlert] = useState(true);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setGeneralSaving(true);
    const result = await updateHospitalSettingsAction({
      name: hospitalName,
      settings: {
        email: contactEmail,
        phone: switchboard,
        address,
        timezone,
      },
    });
    setGeneralSaving(false);
    if (result.success) {
      setBranding(result.branding);
      setToast({ message: "General settings saved.", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
  }
  function handleDiscard() {
    resetGeneralForm();
    setToast({ message: "Changes discarded.", type: "info" });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Client-side guards (server enforces the same limits) ──────────────
    const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_LOGO_BYTES) {
      setToast({ message: "Logo must be 2 MB or smaller.", type: "error" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setToast({ message: "Only PNG, JPG, WebP, and SVG logos are allowed.", type: "error" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/admin/hospital-logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error ?? "Logo upload failed.", type: "error" });
        return;
      }
      if (data.branding) setBranding(data.branding);
      setToast({ message: "Logo uploaded successfully.", type: "success" });
    } catch {
      setToast({ message: "Logo upload failed.", type: "error" });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    setLogoUploading(true);
    const result = await removeHospitalLogoAction();
    setLogoUploading(false);
    if (result.success) {
      setBranding(result.branding);
      setToast({ message: "Logo removed.", type: "info" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
  }
  function handleSaveSecurity() {
    setToast({ message: "Security settings saved.", type: "success" });
  }
  function handleSaveNotifications() {
    setToast({ message: "Notification preferences saved.", type: "success" });
  }
  function handleSaveInApp() {
    setToast({ message: "In-app alert preferences saved.", type: "success" });
  }

  return (
    <div className="w-full max-w-none space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure your hospital&apos;s system-wide preferences and identity.</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-3 sm:gap-8" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative rounded-full px-3 py-2 text-sm font-semibold transition sm:rounded-none sm:px-0 sm:py-0 ${activeTab === tab.id ? "bg-blue-50 text-blue-700 sm:bg-transparent" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" aria-hidden />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* General tab content */}
      {activeTab === "general" && (
        <div className="space-y-8">
          <Card className="w-full max-w-none p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">General Hospital Information</h2>
            <p className="mt-1 text-sm text-slate-500">Update your hospital&apos;s public profile and regional settings.</p>

            {/* Hospital Logo */}
            <div className="mt-8">
              <label className="block text-sm font-medium text-slate-700">Hospital Logo</label>
              <p className="mt-1 text-sm text-slate-500">Recommended size: 512×512px (PNG or SVG).</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-center text-xs font-bold leading-tight text-blue-200">
                    {branding.shortName}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                  <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
                    {logoUploading ? "Uploading…" : "Upload New"}
                  </Button>
                  <Button variant="outline" size="md" onClick={handleRemoveLogo} disabled={logoUploading || !branding.logoUrl}>Remove</Button>
                </div>
              </div>
            </div>

            {/* Form grid */}
            <form onSubmit={handleSaveGeneral}>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="hospital-name" className="block text-sm font-medium text-slate-700">Hospital Name</label>
                <input id="hospital-name" type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700">Contact Email</label>
                <input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">Default Timezone</label>
                <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500">
                  {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="switchboard" className="block text-sm font-medium text-slate-700">Main Switchboard</label>
                <input id="switchboard" type="tel" value={switchboard} onChange={(e) => setSwitchboard(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-slate-700">Address</label>
                <textarea id="address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <p className="text-xs text-slate-500">
                {branding.updatedAt
                  ? `Last updated ${new Date(branding.updatedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                  : "Not yet saved"}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="md" type="button" onClick={handleDiscard}>Discard Changes</Button>
                <Button size="md" type="submit" className="bg-[var(--accent)] text-white hover:opacity-95" disabled={generalSaving}>{generalSaving ? "Saving…" : "Save Changes"}</Button>
              </div>
            </div>
            </form>
          </Card>

          {/* Security/Compliance cards - full width grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="flex gap-4 rounded-xl border-blue-100 bg-blue-50/50 p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">2FA Enabled</h3>
                <p className="mt-1 text-sm text-slate-600">Your account is secured with two-factor authentication.</p>
              </div>
            </Card>
            <Card className="flex gap-4 rounded-xl border-blue-100 bg-blue-50/50 p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /><path strokeWidth="2" d="M12 3v12m0 0l4-4m-4 4L8 15" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Auto-Backup</h3>
                <p className="mt-1 text-sm text-slate-600">System backups are performed every 6 hours automatically.</p>
              </div>
            </Card>
            <Card className="flex gap-4 rounded-xl border-blue-100 bg-blue-50/50 p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">HIPAA Compliant</h3>
                <p className="mt-1 text-sm text-slate-600">System meets all latest security standards for patient data.</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Billing Rates tab ── */}
      {activeTab === "billing-rates" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
            <strong>How this works:</strong> These rates are used system-wide — Front Desk check-ins, doctor consultations, nursing procedures (Ward/Emergency), inpatient bed-day charges, and manual Front Desk billing. Changes take effect immediately.
          </div>

          {presetsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : (
            CATEGORY_ORDER.map((cat) => {
              const rows = presets.filter((p) => p.category === cat);
              return (
                <Card key={cat} className="overflow-hidden p-0">
                  <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{CATEGORY_LABELS[cat] ?? cat}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{rows.length} rate{rows.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="space-y-3 p-3 md:hidden">
                    {rows.map((p) => (
                      <Card key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{CATEGORY_LABELS[cat] ?? cat}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-900">₦{p.amount.toFixed(2)}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <MobileMeta label="Description" value={editingId === p.id ? "Editing" : (p.description || "—")} />
                        </div>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          {editingId === p.id ? (
                            <>
                              <Button size="sm" onClick={() => commitEdit(p)} disabled={saving}>
                                {saving ? "Saving…" : "Save"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(p)} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(p)} className="text-xs font-semibold text-red-500 hover:underline">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </Card>
                    ))}
                    {rows.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                        No rates configured. Add one below.
                      </div>
                    )}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {["Name", "Description", "Amount (₦)", ""].map((h) => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">{p.name}</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">
                              {editingId === p.id
                                ? <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[var(--accent)]" />
                                : (p.description || <span className="text-slate-300">—</span>)
                              }
                            </td>
                            <td className="px-5 py-3 font-bold text-slate-900 whitespace-nowrap">
                              {editingId === p.id
                                ? <input type="number" min="0" step="0.01" value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-24 rounded border border-slate-200 px-2 py-1 text-sm font-bold outline-none focus:border-[var(--accent)]" />
                                : `₦${p.amount.toFixed(2)}`
                              }
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {editingId === p.id ? (
                                  <>
                                    <Button size="sm" onClick={() => commitEdit(p)} disabled={saving}>
                                      {saving ? "Saving…" : "Save"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEdit(p)}
                                      className="text-xs font-semibold text-[var(--accent)] hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(p)}
                                      className="text-xs font-semibold text-red-500 hover:underline">Delete</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-400">
                              No rates configured. Add one below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })
          )}

          {/* Add new preset */}
          <Card className="p-6">
            <h3 className="mb-4 font-bold text-slate-900">Add New Rate</h3>
            <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
                <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]">
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Name <span className="text-red-500">*</span></label>
                <input type="text" required value={addName} onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Ultrasound"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Amount (₦) <span className="text-red-500">*</span></label>
                <input type="number" required min="0" step="0.01" value={addAmount} onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                <input type="text" value={addDesc} onChange={(e) => setAddDesc(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <Button type="submit" size="md" disabled={saving}>
                  {saving ? "Adding…" : "+ Add Rate"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Security tab */}
      {activeTab === "security" && (
        <div className="space-y-8">
          <Card className="w-full max-w-none p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">Authentication & Access</h2>
            <p className="mt-1 text-sm text-slate-500">Control login security and session behaviour for all staff.</p>
            <div className="mt-8 space-y-6">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Require two-factor authentication (2FA)</p>
                  <p className="text-sm text-slate-500">All admin and clinical staff must use 2FA to sign in.</p>
                </div>
                <input type="checkbox" checked={require2FA} onChange={(e) => setRequire2FA(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Enforce password expiry</p>
                  <p className="text-sm text-slate-500">Require password change every 90 days.</p>
                </div>
                <input type="checkbox" checked={pwdExpiry} onChange={(e) => setPwdExpiry(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700">Session timeout (minutes)</label>
                <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 30)} min="5" max="480" className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
              <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95" onClick={handleSaveSecurity}>Save Security Settings</Button>
            </div>
          </Card>
          <Card className="w-full max-w-none p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">Audit & Compliance</h2>
            <p className="mt-1 text-sm text-slate-500">Review compliance posture. Retention settings are managed by IT under <strong>IT → System</strong>.</p>
            <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-3 text-sm text-sky-800">
              Audit log retention, backup schedules, and data retention policies are configured in the IT portal under <em>System</em> to keep all infrastructure controls in one place.
            </div>
          </Card>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === "notifications" && (
        <div className="space-y-8">
          <Card className="w-full max-w-none p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">Email Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Choose which events trigger emails to admins and department leads.</p>
            <div className="mt-8 space-y-4">
              {[
                { label: "Critical alerts (system down, backup failed)", desc: "Sent immediately to all admins", val: criticalAlerts, set: setCriticalAlerts },
                { label: "Approval requests (refunds, overrides)", desc: "Sent to configured approvers", val: approvalEmails, set: setApprovalEmails },
                { label: "Daily digest", desc: "Summary of activity and pending items", val: dailyDigest, set: setDailyDigest },
                { label: "Weekly report", desc: "KPIs and report summary", val: weeklyReport, set: setWeeklyReport },
              ].map((item) => (
                <label key={item.label} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                </label>
              ))}
            </div>
            <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
              <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95" onClick={handleSaveNotifications}>Save Notification Preferences</Button>
            </div>
          </Card>
          <Card className="w-full max-w-none p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">In-app alerts</h2>
            <p className="mt-1 text-sm text-slate-500">Show banner and bell notifications for these events.</p>
            <div className="mt-6 space-y-3">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3"><span className="text-sm font-medium text-slate-700">Low stock (pharmacy / store)</span><input type="checkbox" checked={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" /></label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3"><span className="text-sm font-medium text-slate-700">New IT ticket assigned</span><input type="checkbox" checked={ticketAlert} onChange={(e) => setTicketAlert(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" /></label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3"><span className="text-sm font-medium text-slate-700">Leave request pending approval</span><input type="checkbox" checked={leaveAlert} onChange={(e) => setLeaveAlert(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" /></label>
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95" onClick={handleSaveInApp}>Save</Button>
            </div>
          </Card>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

