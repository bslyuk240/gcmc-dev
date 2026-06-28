"use client";

import { useState } from "react";
import { Card, platformBtnPrimaryLg, platformBtnAccentOutline, platformBtnOutline, platformBtnDangerOutline } from "@/components/platform/page-shell";
import {
  updateGeneralSettingsAction,
  updateEmailSettingsAction,
  updateSecuritySettingsAction,
  updatePaymentSettingsAction,
} from "@/server/actions/platform/settings";
import { sendTestEmailAction } from "@/server/actions/platform/send-test-email";
import type { PlatformSettings } from "@/lib/platform/settings";

// ─── Shared components ────────────────────────────────────────────────────────
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";
const labelClass = "block text-sm font-medium text-slate-700";

function Toggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${enabled ? "bg-slate-900" : "bg-slate-200"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function SaveMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const ok = msg.startsWith("✓");
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
      {msg}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-2">{children}</h3>;
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-3 sm:items-start">
      <div className="pt-2.5">
        <label className={labelClass}>{label}</label>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function EnvBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${configured ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
      {configured ? "✓ Configured" : "✗ Not set"}
    </span>
  );
}

function SaveBtn({ saving, label = "Save Changes" }: { saving: boolean; label?: string }) {
  return (
    <button type="submit" disabled={saving} className={`${platformBtnPrimaryLg} disabled:opacity-50`}>
      {saving ? "Saving…" : label}
    </button>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────
const TABS = ["General","Email Settings","Payment Gateways","Security","Custom Domain","Backup & Restore","Integrations","System Settings"] as const;
type Tab = typeof TABS[number];

// ─── Main component ───────────────────────────────────────────────────────────
type EnvStatus = {
  hasResendKey: boolean;
  hasPaystackSecret: boolean;
  mailFrom: string | null;
  emailFromAddress: string | null;
  supabaseUrl: string | null;
  nodeEnv: string;
  defaultSlug: string;
};

export function SettingsPageClient({ settings, envStatus }: { settings: PlatformSettings; envStatus: EnvStatus }) {
  const [tab, setTab] = useState<Tab>("General");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      {/* Left sidebar */}
      <nav className="hidden w-48 shrink-0 sm:block">
        <div className="space-y-0.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`w-full rounded-none px-3 py-2.5 text-left text-sm font-medium transition-colors ${tab === t ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile select */}
      <select value={tab} onChange={(e) => setTab(e.target.value as Tab)}
        className="sm:hidden w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400">
        {TABS.map((t) => <option key={t}>{t}</option>)}
      </select>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {tab === "General"          && <GeneralTab    s={settings} />}
        {tab === "Email Settings"   && <EmailTab      s={settings} envStatus={envStatus} />}
        {tab === "Payment Gateways" && <PaymentTab    s={settings} envStatus={envStatus} />}
        {tab === "Security"         && <SecurityTab   s={settings} />}
        {tab === "Custom Domain"    && <CustomDomainTab />}
        {tab === "Backup & Restore" && <BackupTab     />}
        {tab === "Integrations"     && <IntegrationsTab envStatus={envStatus} />}
        {tab === "System Settings"  && <SystemTab     envStatus={envStatus} />}
      </div>
    </div>
  );
}

// ─── General ─────────────────────────────────────────────────────────────────
function GeneralTab({ s }: { s: PlatformSettings }) {
  const [name, setName]       = useState(s.platform_name);
  const [url, setUrl]         = useState(s.platform_url ?? "");
  const [currency, setCurrency] = useState(s.platform_currency);
  const [tz, setTz]           = useState(s.platform_timezone);
  const [fmt, setFmt]         = useState(s.platform_date_fmt);
  const [notifs, setNotifs]   = useState({
    notif_new_tenant:    s.notif_new_tenant,
    notif_payment:       s.notif_payment,
    notif_sub_expiring:  s.notif_sub_expiring,
    notif_system_alerts: s.notif_system_alerts,
    notif_weekly_report: s.notif_weekly_report,
  });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const result = await updateGeneralSettingsAction({ platform_name: name, platform_url: url || undefined, platform_currency: currency, platform_timezone: tz, platform_date_fmt: fmt, ...notifs });
    setSaving(false);
    setMsg(result.success ? "✓ General settings saved." : result.error);
    if (result.success) setTimeout(() => setMsg(null), 4000);
  }

  const notifLabels: [keyof typeof notifs, string][] = [
    ["notif_new_tenant",    "New Tenant Registration"],
    ["notif_payment",       "Payment Received"],
    ["notif_sub_expiring",  "Subscription Expiring"],
    ["notif_system_alerts", "System Alerts"],
    ["notif_weekly_report", "Weekly Reports"],
  ];

  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">General Settings</h2></div>
      <form onSubmit={onSubmit} className="divide-y divide-slate-100">
        <div className="space-y-5 px-6 py-5">
          <SectionTitle>Platform Identity</SectionTitle>
          <FieldRow label="Platform Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </FieldRow>
          <FieldRow label="Platform URL" hint="Used in email links">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hms.yourcompany.com" className={inputClass} />
          </FieldRow>
          <FieldRow label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
              <option value="NGN">NGN (₦) — Nigerian Naira</option>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="GBP">GBP (£) — British Pound</option>
              <option value="GHS">GHS (₵) — Ghanaian Cedi</option>
              <option value="KES">KES (KSh) — Kenyan Shilling</option>
            </select>
          </FieldRow>
          <FieldRow label="Timezone">
            <select value={tz} onChange={(e) => setTz(e.target.value)} className={inputClass}>
              <option value="Africa/Lagos">Africa/Lagos (UTC+1)</option>
              <option value="Africa/Accra">Africa/Accra (UTC+0)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2)</option>
              <option value="UTC">UTC</option>
            </select>
          </FieldRow>
          <FieldRow label="Date Format">
            <select value={fmt} onChange={(e) => setFmt(e.target.value)} className={inputClass}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </FieldRow>
        </div>

        <div className="space-y-4 px-6 py-5">
          <SectionTitle>Notification Settings</SectionTitle>
          {notifLabels.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{label}</span>
              <Toggle enabled={notifs[key]} onToggle={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <SaveMsg msg={msg} />
          <SaveBtn saving={saving} />
        </div>
      </form>
    </Card>
  );
}

// ─── Email Settings ───────────────────────────────────────────────────────────
function EmailTab({ s, envStatus }: { s: PlatformSettings; envStatus: EnvStatus }) {
  const [fromName, setFromName]   = useState(s.email_from_name);
  const [fromEmail, setFromEmail] = useState(s.email_from_address);
  const [replyTo, setReplyTo]     = useState(s.email_reply_to ?? "");
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting]     = useState(false);
  const [testMsg, setTestMsg]     = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const result = await updateEmailSettingsAction({ email_from_name: fromName, email_from_address: fromEmail, email_reply_to: replyTo || undefined });
    setSaving(false);
    setMsg(result.success ? "✓ Email settings saved." : result.error);
    if (result.success) setTimeout(() => setMsg(null), 4000);
  }

  async function onSendTest(e: React.FormEvent) {
    e.preventDefault(); setTesting(true); setTestMsg(null);
    if (!testEmail) { setTesting(false); setTestMsg("Enter a recipient email first."); return; }
    const result = await sendTestEmailAction(testEmail);
    setTesting(false);
    setTestMsg(
      result.success
        ? `✓ Test email sent to ${testEmail}${result.data?.from ? ` from ${result.data.from}` : ""}`
        : result.error,
    );
  }

  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">Email Settings</h2></div>
      <div className="divide-y divide-slate-100">
        {/* Resend status */}
        <div className="space-y-4 px-6 py-5">
          <SectionTitle>Resend Integration</SectionTitle>
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">RESEND_API_KEY</p>
              <p className="text-xs text-slate-500">Set in your environment variables / hosting config</p>
            </div>
            <EnvBadge configured={envStatus.hasResendKey} />
          </div>
          {!envStatus.hasResendKey && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <p className="font-semibold">Setup required</p>
              <p className="mt-0.5 text-xs">Add <code className="rounded bg-amber-100 px-1 font-mono">RESEND_API_KEY=re_xxxx</code> to your <code className="rounded bg-amber-100 px-1 font-mono">.env.local</code> file. Get your key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com/api-keys</a>.</p>
            </div>
          )}
          {(envStatus.mailFrom || envStatus.emailFromAddress) && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              <p className="font-semibold">Environment sender override active</p>
              <p className="mt-0.5 text-xs">
                Outbound email uses{" "}
                <code className="rounded bg-sky-100 px-1 font-mono">
                  {envStatus.mailFrom ?? envStatus.emailFromAddress}
                </code>{" "}
                from your env file — not the saved fields below. Restart the dev server after changing env vars.
              </p>
            </div>
          )}
        </div>

        {/* From address config */}
        <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
          <SectionTitle>Sender Configuration</SectionTitle>
          <FieldRow label="From Name" hint="Used when MAIL_FROM is not set in env">
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} required placeholder="HMS Platform" className={inputClass} />
          </FieldRow>
          <FieldRow label="From Email" hint="Must be a domain verified in Resend (e.g. noreply@skolahq.com)">
            <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required placeholder="noreply@yourdomain.com" className={inputClass} />
          </FieldRow>
          <FieldRow label="Reply-To" hint="Optional — where replies go">
            <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@yourdomain.com" className={inputClass} />
          </FieldRow>
          <div className="flex items-center justify-between">
            <SaveMsg msg={msg} />
            <SaveBtn saving={saving} />
          </div>
        </form>

        {/* Test email */}
        <form onSubmit={onSendTest} className="space-y-4 px-6 py-5">
          <SectionTitle>Send Test Email</SectionTitle>
          <p className="text-xs text-slate-500">Sends a test message using your Resend config. Requires <code className="rounded bg-slate-100 px-1 font-mono">RESEND_API_KEY</code> to be set.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button type="submit" disabled={testing || !envStatus.hasResendKey}
              className={`${platformBtnAccentOutline} disabled:opacity-50 whitespace-nowrap`}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          {testMsg && (
            <p className={`text-xs font-medium ${testMsg.startsWith("✓") ? "text-emerald-700" : "text-red-700"}`}>{testMsg}</p>
          )}
        </form>

        {/* Email lifecycle events */}
        <div className="px-6 py-5">
          <SectionTitle>Lifecycle Emails</SectionTitle>
          <div className="mt-4 space-y-3">
            {[
              { event: "Hospital approved",      trigger: "approveSignupRequestAction", status: "active" },
              { event: "Hospital suspended",     trigger: "updatePlatformHospitalStatusAction", status: "active" },
              { event: "Invoice sent",           trigger: "sendPlatformInvoiceAction", status: "manual" },
              { event: "Subscription trial end", trigger: "Cron / background job", status: "planned" },
            ].map((e) => (
              <div key={e.event} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{e.event}</p>
                  <p className="text-xs font-mono text-slate-400">{e.trigger}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  e.status === "active" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                  e.status === "manual" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                  "bg-slate-100 text-slate-500"}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Payment Gateways ─────────────────────────────────────────────────────────
function PaymentTab({ s, envStatus }: { s: PlatformSettings; envStatus: EnvStatus }) {
  const [publicKey, setPublicKey] = useState(s.paystack_public_key ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const result = await updatePaymentSettingsAction({ paystack_public_key: publicKey || undefined });
    setSaving(false);
    setMsg(result.success ? "✓ Payment settings saved." : result.error);
    if (result.success) setTimeout(() => setMsg(null), 4000);
  }

  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">Payment Gateways</h2></div>
      <div className="divide-y divide-slate-100">
        {/* Paystack */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00C3F7]/10">
              <span className="text-sm font-black text-[#00C3F7]">PS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Paystack</p>
              <p className="text-xs text-slate-500">Accept NGN payments from hospital tenants</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">PAYSTACK_SECRET_KEY</p>
              <EnvBadge configured={envStatus.hasPaystackSecret} />
            </div>
            {!envStatus.hasPaystackSecret && (
              <p className="text-xs text-slate-500">Add <code className="rounded bg-slate-200 px-1 font-mono">PAYSTACK_SECRET_KEY=sk_live_xxx</code> to your environment variables.</p>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <FieldRow label="Public Key" hint="Safe to store — used in frontend">
              <input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="pk_live_xxxx" className={inputClass} />
            </FieldRow>
            <FieldRow label="Webhook URL" hint="Add this to your Paystack dashboard">
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <code className="flex-1 text-xs text-slate-600">{`${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/webhooks/paystack`}</code>
                <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/webhooks/paystack`)}
                  className="text-xs font-semibold text-indigo-600 hover:underline">Copy</button>
              </div>
            </FieldRow>
            <div className="flex items-center justify-between">
              <SaveMsg msg={msg} />
              <SaveBtn saving={saving} />
            </div>
          </form>
        </div>

        {/* Other gateways placeholder */}
        <div className="px-6 py-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Other Gateways</p>
          {[{ name: "Stripe", desc: "USD/GBP payments", icon: "S" }, { name: "Flutterwave", desc: "Pan-Africa payments", icon: "F" }].map((g) => (
            <div key={g.name} className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-4 py-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">{g.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{g.name}</p>
                  <p className="text-xs text-slate-400">{g.desc}</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Coming soon</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────
function SecurityTab({ s }: { s: PlatformSettings }) {
  const [sessionTimeout, setSessionTimeout] = useState(s.session_timeout_minutes);
  const [minPwdLen, setMinPwdLen]           = useState(s.password_min_length);
  const [require2fa, setRequire2fa]         = useState(s.require_2fa);
  const [saving, setSaving]                 = useState(false);
  const [msg, setMsg]                       = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const result = await updateSecuritySettingsAction({ session_timeout_minutes: sessionTimeout, password_min_length: minPwdLen, require_2fa: require2fa });
    setSaving(false);
    setMsg(result.success ? "✓ Security settings saved." : result.error);
    if (result.success) setTimeout(() => setMsg(null), 4000);
  }

  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">Security</h2></div>
      <form onSubmit={onSubmit} className="divide-y divide-slate-100">
        <div className="space-y-5 px-6 py-5">
          <SectionTitle>Session & Authentication</SectionTitle>
          <FieldRow label="Session Timeout" hint="Platform admin sessions">
            <select value={sessionTimeout} onChange={(e) => setSessionTimeout(Number(e.target.value))} className={inputClass}>
              {[60, 120, 240, 480, 720, 1440].map((m) => <option key={m} value={m}>{m < 60 ? `${m}m` : `${m/60}h`}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Min Password Length" hint="Applies to new tenant staff accounts">
            <div className="flex items-center gap-3 mt-1.5">
              <input type="range" min={6} max={20} value={minPwdLen} onChange={(e) => setMinPwdLen(Number(e.target.value))} className="flex-1 accent-indigo-600" />
              <span className="w-8 text-center text-sm font-bold text-slate-700">{minPwdLen}</span>
            </div>
          </FieldRow>
          <div className="flex items-center justify-between">
            <div>
              <p className={labelClass}>Require 2FA</p>
              <p className="text-xs text-slate-400">Enforce for all platform admin accounts</p>
            </div>
            <Toggle enabled={require2fa} onToggle={() => setRequire2fa((v) => !v)} />
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <SectionTitle>IP Allowlist</SectionTitle>
          <p className="text-sm text-slate-500">Restrict platform admin access to specific IP ranges. Coming soon.</p>
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
            No IP restrictions configured — all IPs allowed
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <SaveMsg msg={msg} />
          <SaveBtn saving={saving} />
        </div>
      </form>
    </Card>
  );
}

// ─── Custom Domain ────────────────────────────────────────────────────────────
function CustomDomainTab() {
  const [domain, setDomain] = useState("");
  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">Custom Domain</h2></div>
      <div className="divide-y divide-slate-100">
        <div className="space-y-4 px-6 py-5">
          <SectionTitle>Wildcard Domain Setup</SectionTitle>
          <p className="text-sm text-slate-600">Each hospital tenant gets a subdomain: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">hospital-slug.yourdomain.com</code></p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">DNS Configuration</p>
            <div className="space-y-2">
              {[
                { type: "A / CNAME", name: "*.yourdomain.com", value: "Your server IP or hosting CNAME" },
                { type: "A / CNAME", name: "yourdomain.com",   value: "Same as above" },
              ].map((r) => (
                <div key={r.name} className="grid grid-cols-3 gap-2 text-xs">
                  <span className="rounded bg-blue-50 px-2 py-1 font-mono font-bold text-blue-700">{r.type}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-600">{r.name}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-500">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">Hosting note</p>
            <p className="mt-0.5 text-xs">If using <strong>Netlify</strong>: wildcard SSL requires Pro plan or Cloudflare proxy. <strong>Vercel</strong>: wildcard subdomains work out of the box — recommended.</p>
          </div>

          <FieldRow label="Your domain">
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourhospital.com" className={inputClass} />
          </FieldRow>
          <p className="text-xs text-slate-400">Once DNS propagates, update <code className="rounded bg-slate-100 px-1 font-mono">DEFAULT_HOSPITAL_SLUG</code> in your env to test.</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Backup & Restore ─────────────────────────────────────────────────────────
function BackupTab() {
  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">Backup & Restore</h2></div>
      <div className="divide-y divide-slate-100">
        <div className="space-y-4 px-6 py-5">
          <SectionTitle>Database Backups</SectionTitle>
          <p className="text-sm text-slate-600">Supabase automatically backs up your database. Manage backups from the Supabase dashboard.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Point-in-time", desc: "Last 7 days on Pro plan", status: "Auto" },
              { label: "Daily snapshots", desc: "Retained for 30 days", status: "Auto" },
              { label: "Manual backup",  desc: "Export on demand", status: "Manual" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">{b.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{b.desc}</p>
                <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{b.status}</span>
              </div>
            ))}
          </div>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
            className={platformBtnOutline}>
            Open Supabase Dashboard →
          </a>
        </div>

        <div className="space-y-4 px-6 py-5">
          <SectionTitle>Data Export</SectionTitle>
          <p className="text-sm text-slate-500">Export platform data for reporting or migration purposes.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {["Hospitals (CSV)", "Invoices (CSV)", "Audit Logs (CSV)", "Staff Profiles (CSV)"].map((e) => (
              <button key={e} type="button"
                className={`${platformBtnOutline} justify-start text-left font-medium`}>
                Export: {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Integrations ─────────────────────────────────────────────────────────────
function IntegrationsTab({ envStatus }: { envStatus: EnvStatus }) {
  const integrations = [
    { name: "Resend",      desc: "Transactional email delivery",  configured: envStatus.hasResendKey,      docs: "https://resend.com/docs" },
    { name: "Supabase",    desc: "Database, auth, and storage",   configured: !!envStatus.supabaseUrl,     docs: "https://supabase.com/docs" },
    { name: "Paystack",    desc: "Payment processing (NGN)",      configured: envStatus.hasPaystackSecret, docs: "https://paystack.com/docs" },
    { name: "Sentry",      desc: "Error monitoring & alerting",   configured: false,                       docs: "https://sentry.io/docs" },
    { name: "Slack",       desc: "Admin notifications to Slack",  configured: false,                       docs: "https://api.slack.com" },
  ];

  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">Integrations</h2></div>
      <div className="divide-y divide-slate-100">
        {integrations.map((i) => (
          <div key={i.name} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                {i.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                <p className="text-xs text-slate-500">{i.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <EnvBadge configured={i.configured} />
              <a href={i.docs} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 hover:underline">Docs</a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── System Settings ──────────────────────────────────────────────────────────
function SystemTab({ envStatus }: { envStatus: EnvStatus }) {
  return (
    <Card>
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-bold text-slate-700">System Settings</h2></div>
      <div className="divide-y divide-slate-100">
        <div className="space-y-3 px-6 py-5">
          <SectionTitle>Environment</SectionTitle>
          {[
            { label: "Node Environment",    value: envStatus.nodeEnv },
            { label: "Supabase URL",        value: envStatus.supabaseUrl ? envStatus.supabaseUrl.replace("https://", "").slice(0, 30) + "…" : "Not set" },
            { label: "Default Tenant Slug", value: envStatus.defaultSlug },
            { label: "App Version",         value: "v2.4.1" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
              <span className="text-sm text-slate-600">{r.label}</span>
              <code className="rounded bg-slate-200 px-2 py-0.5 text-xs font-mono text-slate-700 capitalize">{r.value}</code>
            </div>
          ))}
        </div>

        <div className="space-y-4 px-6 py-5">
          <SectionTitle>Danger Zone</SectionTitle>
          <div className="rounded-xl border border-dashed border-red-200 bg-red-50/50 p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Clear server cache</p>
            <p className="text-xs text-slate-500">Forces a fresh revalidation of all cached pages on next request.</p>
            <button type="button"
              className={platformBtnDangerOutline}>
              Clear cache
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
