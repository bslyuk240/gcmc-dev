import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_MONTHLY_KOBO } from "@/lib/platform/pricing";

export type PlatformSettings = {
  id: string;
  // Pricing
  pricing_starter_monthly_kobo: number;
  pricing_standard_monthly_kobo: number;
  pricing_enterprise_monthly_kobo: number;
  trial_days: number;
  grace_period_days: number;
  // Email
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string | null;
  // Payment
  paystack_public_key: string | null;
  // Security
  session_timeout_minutes: number;
  password_min_length: number;
  require_2fa: boolean;
  // Platform identity
  platform_name: string;
  platform_url: string | null;
  platform_currency: string;
  platform_timezone: string;
  platform_date_fmt: string;
  // Notifications
  notif_new_tenant: boolean;
  notif_payment: boolean;
  notif_sub_expiring: boolean;
  notif_system_alerts: boolean;
  notif_weekly_report: boolean;
  updated_at: string;
};

const DEFAULTS: Omit<PlatformSettings, "id" | "updated_at"> = {
  pricing_starter_monthly_kobo: PLAN_MONTHLY_KOBO.starter,
  pricing_standard_monthly_kobo: PLAN_MONTHLY_KOBO.standard,
  pricing_enterprise_monthly_kobo: PLAN_MONTHLY_KOBO.enterprise,
  trial_days: 14,
  grace_period_days: 7,
  email_from_name: "HMS Platform",
  email_from_address: "noreply@hmsplatform.com",
  email_reply_to: null,
  paystack_public_key: null,
  session_timeout_minutes: 480,
  password_min_length: 8,
  require_2fa: false,
  platform_name: "HMS Platform",
  platform_url: null,
  platform_currency: "NGN",
  platform_timezone: "Africa/Lagos",
  platform_date_fmt: "DD/MM/YYYY",
  notif_new_tenant: true,
  notif_payment: true,
  notif_sub_expiring: true,
  notif_system_alerts: true,
  notif_weekly_report: false,
};

function row(data: Record<string, unknown>): PlatformSettings {
  const d = (k: string, fallback: unknown) => data[k] ?? fallback;
  return {
    id: String(data.id),
    pricing_starter_monthly_kobo: Number(d("pricing_starter_monthly_kobo", DEFAULTS.pricing_starter_monthly_kobo)),
    pricing_standard_monthly_kobo: Number(d("pricing_standard_monthly_kobo", DEFAULTS.pricing_standard_monthly_kobo)),
    pricing_enterprise_monthly_kobo: Number(d("pricing_enterprise_monthly_kobo", DEFAULTS.pricing_enterprise_monthly_kobo)),
    trial_days: Number(d("trial_days", DEFAULTS.trial_days)),
    grace_period_days: Number(d("grace_period_days", DEFAULTS.grace_period_days)),
    email_from_name: String(d("email_from_name", DEFAULTS.email_from_name)),
    email_from_address: String(d("email_from_address", DEFAULTS.email_from_address)),
    email_reply_to: data.email_reply_to ? String(data.email_reply_to) : null,
    paystack_public_key: data.paystack_public_key ? String(data.paystack_public_key) : null,
    session_timeout_minutes: Number(d("session_timeout_minutes", DEFAULTS.session_timeout_minutes)),
    password_min_length: Number(d("password_min_length", DEFAULTS.password_min_length)),
    require_2fa: Boolean(d("require_2fa", DEFAULTS.require_2fa)),
    platform_name: String(d("platform_name", DEFAULTS.platform_name)),
    platform_url: data.platform_url ? String(data.platform_url) : null,
    platform_currency: String(d("platform_currency", DEFAULTS.platform_currency)),
    platform_timezone: String(d("platform_timezone", DEFAULTS.platform_timezone)),
    platform_date_fmt: String(d("platform_date_fmt", DEFAULTS.platform_date_fmt)),
    notif_new_tenant: Boolean(d("notif_new_tenant", true)),
    notif_payment: Boolean(d("notif_payment", true)),
    notif_sub_expiring: Boolean(d("notif_sub_expiring", true)),
    notif_system_alerts: Boolean(d("notif_system_alerts", true)),
    notif_weekly_report: Boolean(d("notif_weekly_report", false)),
    updated_at: String(data.updated_at),
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = createAdminClient();
  if (!admin) return { id: "", updated_at: new Date().toISOString(), ...DEFAULTS };

  const { data } = await admin
    .from("platform_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { id: "", updated_at: new Date().toISOString(), ...DEFAULTS };
  return row(data as Record<string, unknown>);
}
