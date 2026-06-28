"use client";

import { useState } from "react";
import { Card, platformBtnPrimaryLg } from "@/components/platform/page-shell";
import { updatePlatformSettingsAction } from "@/server/actions/platform/settings";
import type { PlatformSettings } from "@/lib/platform/settings";

const TABS = ["Plans", "Features", "Pricing Settings"] as const;

const CHECK = (
  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const DASH = <span className="text-slate-300">—</span>;

const PLANS_DATA = [
  { name: "Starter",    price: "₦50,000/mo",  tenants: 0, features: 12, status: "Active", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  { name: "Standard",  price: "₦150,000/mo", tenants: 0, features: 18, status: "Active", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { name: "Enterprise",price: "₦500,000/mo", tenants: 0, features: 24, status: "Active", color: "bg-purple-50 text-purple-700 ring-purple-200" },
  { name: "Trial",     price: "₦0/mo",       tenants: 0, features: 8,  status: "Active", color: "bg-slate-50 text-slate-600 ring-slate-200" },
];

const FEATURES = [
  { name: "Patient Records",     starter: true,  standard: true,  enterprise: true  },
  { name: "Appointments",        starter: true,  standard: true,  enterprise: true  },
  { name: "Pharmacy Module",     starter: true,  standard: true,  enterprise: true  },
  { name: "Lab Module",          starter: false, standard: true,  enterprise: true  },
  { name: "Radiology Module",    starter: false, standard: true,  enterprise: true  },
  { name: "HR & Payroll",        starter: false, standard: true,  enterprise: true  },
  { name: "Advanced Reports",    starter: false, standard: false, enterprise: true  },
  { name: "Custom Domain",       starter: false, standard: false, enterprise: true  },
  { name: "API Access",          starter: false, standard: true,  enterprise: true  },
  { name: "Priority Support",    starter: false, standard: false, enterprise: true  },
  { name: "Multi-branch",        starter: false, standard: false, enterprise: true  },
  { name: "Audit Trail",         starter: true,  standard: true,  enterprise: true  },
];

function koboToNaira(k: number) { return k / 100; }
function nairaToKobo(n: number) { return Math.round(n * 100); }

export function PlansClient({ settings }: { settings: PlatformSettings }) {
  const [tab, setTab] = useState<typeof TABS[number]>("Plans");

  const [starterNaira, setStarterNaira] = useState(koboToNaira(settings.pricing_starter_monthly_kobo));
  const [standardNaira, setStandardNaira] = useState(koboToNaira(settings.pricing_standard_monthly_kobo));
  const [enterpriseNaira, setEnterpriseNaira] = useState(koboToNaira(settings.pricing_enterprise_monthly_kobo));
  const [trialDays, setTrialDays] = useState(settings.trial_days);
  const [graceDays, setGraceDays] = useState(settings.grace_period_days);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg(null);
    const result = await updatePlatformSettingsAction({
      pricing_starter_monthly_kobo: nairaToKobo(starterNaira),
      pricing_standard_monthly_kobo: nairaToKobo(standardNaira),
      pricing_enterprise_monthly_kobo: nairaToKobo(enterpriseNaira),
      trial_days: trialDays,
      grace_period_days: graceDays,
    });
    setSaving(false);
    setSaveMsg(result.success ? "✓ Saved successfully" : result.error);
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Plans tab */}
        {tab === "Plans" && (
          <div className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Plan Name", "Price (Monthly)", "Tenants", "Features", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PLANS_DATA.map((p) => (
                    <tr key={p.name} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${p.color}`}>{p.name} Plan</span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{p.price}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.tenants}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.features}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Plan comparison */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold text-slate-700">Plan Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Features</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-sky-600">Starter</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-indigo-600">Standard</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-purple-600">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {FEATURES.map((f) => (
                      <tr key={f.name} className="hover:bg-slate-50/50">
                        <td className="px-5 py-2.5 text-slate-700">{f.name}</td>
                        <td className="px-5 py-2.5 text-center">{f.starter ? CHECK : DASH}</td>
                        <td className="px-5 py-2.5 text-center">{f.standard ? CHECK : DASH}</td>
                        <td className="px-5 py-2.5 text-center">{f.enterprise ? CHECK : DASH}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Features tab */}
        {tab === "Features" && (
          <div className="p-5">
            <p className="mb-4 text-sm text-slate-500">Features enabled per plan. Modify in the Pricing Settings tab to adjust plan prices.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">{f.name}</span>
                  <div className="flex gap-3">
                    {[["S", f.starter], ["St", f.standard], ["E", f.enterprise]].map(([label, val]) => (
                      <span key={String(label)} className={`flex h-5 w-6 items-center justify-center rounded text-[10px] font-bold ${val ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                        {String(label)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Settings tab */}
        {tab === "Pricing Settings" && (
          <form onSubmit={handleSave} className="p-5 space-y-6 max-w-xl">
            {saveMsg && <div className={`rounded-xl px-4 py-3 text-sm ${saveMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{saveMsg}</div>}

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Monthly Prices (₦)</h3>
              {[
                { label: "Starter plan",    value: starterNaira,    set: setStarterNaira },
                { label: "Standard plan",   value: standardNaira,   set: setStandardNaira },
                { label: "Enterprise plan", value: enterpriseNaira, set: setEnterpriseNaira },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-slate-600">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>
                    <input type="number" min={0} step={1000} required value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700">Lifecycle</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Trial period (days)</label>
                  <input type="number" min={0} required value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Grace period (days)</label>
                  <input type="number" min={0} required value={graceDays} onChange={(e) => setGraceDays(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className={`${platformBtnPrimaryLg} disabled:opacity-50`}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
