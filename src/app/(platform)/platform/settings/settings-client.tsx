"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updatePlatformSettingsAction } from "@/server/actions/platform/settings";
import { formatNairaFromKobo } from "@/lib/platform/pricing";
import { Card, platformInputClass } from "@/components/platform/page-shell";
import type { PlatformSettings } from "@/lib/platform/settings";

function koboToNaira(kobo: number) { return kobo / 100; }
function nairaToKobo(naira: number) { return Math.round(naira * 100); }

export function SettingsClient({ settings }: { settings: PlatformSettings }) {
  const [starterNaira, setStarterNaira] = useState(koboToNaira(settings.pricing_starter_monthly_kobo));
  const [standardNaira, setStandardNaira] = useState(koboToNaira(settings.pricing_standard_monthly_kobo));
  const [enterpriseNaira, setEnterpriseNaira] = useState(koboToNaira(settings.pricing_enterprise_monthly_kobo));
  const [trialDays, setTrialDays] = useState(settings.trial_days);
  const [graceDays, setGraceDays] = useState(settings.grace_period_days);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updatePlatformSettingsAction({
      pricing_starter_monthly_kobo: nairaToKobo(starterNaira),
      pricing_standard_monthly_kobo: nairaToKobo(standardNaira),
      pricing_enterprise_monthly_kobo: nairaToKobo(enterpriseNaira),
      trial_days: trialDays,
      grace_period_days: graceDays,
    });

    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Settings saved successfully.
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Plan Pricing</h2>
          <p className="mt-0.5 text-sm text-slate-500">Monthly prices in Naira (₦). Used for invoice generation.</p>
        </div>

        {[
          { label: "Starter", value: starterNaira, set: setStarterNaira },
          { label: "Standard", value: standardNaira, set: setStandardNaira },
          { label: "Enterprise", value: enterpriseNaira, set: setEnterpriseNaira },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-slate-700">
              {label} plan — monthly (₦)
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Stored as {formatNairaFromKobo(nairaToKobo(value))}/month
            </p>
          </div>
        ))}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Lifecycle Windows</h2>
          <p className="mt-0.5 text-sm text-slate-500">Applied when creating new trial subscriptions.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Trial period (days)</label>
          <input
            type="number" min={0} max={365} required
            value={trialDays}
            onChange={(e) => setTrialDays(Number(e.target.value))}
            className={platformInputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Grace period after expiry (days)</label>
          <input
            type="number" min={0} max={90} required
            value={graceDays}
            onChange={(e) => setGraceDays(Number(e.target.value))}
            className={platformInputClass}
          />
        </div>
      </Card>

      {settings.updated_at && (
        <p className="text-xs text-slate-400">
          Last updated: {new Date(settings.updated_at).toLocaleString("en-NG")}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
