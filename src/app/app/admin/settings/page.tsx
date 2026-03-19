"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useBillingPresets, invalidateBillingPresetsCache } from "@/lib/hooks/use-billing-presets";
import type { BillingPreset } from "@/lib/supabase/db";

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
};

const CATEGORY_ORDER = ["visit", "consultation", "procedure", "frontdesk"];

const TIMEZONES = [
  "(GMT+00:00) Coordinated Universal Time",
  "(GMT+00:00) Greenwich Mean Time",
  "(GMT+01:00) West Africa Time",
  "(GMT+02:00) Central Africa Time",
  "(GMT+03:00) East Africa Time",
  "(GMT+05:30) India Standard Time",
  "(GMT-05:00) Eastern Time (US)",
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [toast, setToast] = useState<ToastData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [hospitalName, setHospitalName] = useState("St. Mary's General Hospital");
  const [contactEmail, setContactEmail] = useState("admin@stmarys-hospital.org");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [switchboard, setSwitchboard] = useState("+1 (555) 0123-4567");
  const [address, setAddress] = useState("123 Medical Center Way, Healthcare District, North Avenue, 56789");
  const [generalSaving, setGeneralSaving] = useState(false);

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

  function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setGeneralSaving(true);
    setTimeout(() => { setGeneralSaving(false); setToast({ message: "General settings saved.", type: "success" }); }, 600);
  }
  function handleDiscard() {
    setHospitalName("St. Mary's General Hospital");
    setContactEmail("admin@stmarys-hospital.org");
    setTimezone(TIMEZONES[0]);
    setSwitchboard("+1 (555) 0123-4567");
    setAddress("123 Medical Center Way, Healthcare District, North Avenue, 56789");
    setToast({ message: "Changes discarded.", type: "info" });
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
        <nav className="flex gap-8" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-semibold transition ${activeTab === tab.id ? "text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
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
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-center text-xs font-bold leading-tight text-blue-200">HG HOSPITAL</div>
                <div className="flex flex-wrap gap-3">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={() => setToast({ message: "Logo uploaded successfully.", type: "success" })} />
                  <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95" onClick={() => fileInputRef.current?.click()}>Upload New</Button>
                  <Button variant="outline" size="md" onClick={() => setToast({ message: "Logo removed.", type: "info" })}>Remove</Button>
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
              <p className="text-xs text-slate-500">Last updated on Oct 24, 2023 at 14:30 PM</p>
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
            <strong>How this works:</strong> These rates are used system-wide — by Front Desk check-ins, Doctors' consultation fees, Nursing procedure charges, and manual Front Desk billing. Changes take effect immediately across all departments.
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
                  <div className="overflow-x-auto">
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
