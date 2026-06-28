-- 0051: Extend platform_settings with email and gateway config

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS email_from_name    TEXT NOT NULL DEFAULT 'HMS Platform',
  ADD COLUMN IF NOT EXISTS email_from_address TEXT NOT NULL DEFAULT 'noreply@hmsplatform.com',
  ADD COLUMN IF NOT EXISTS email_reply_to     TEXT,

  -- Paystack (public key only — secret key stays in env)
  ADD COLUMN IF NOT EXISTS paystack_public_key TEXT,

  -- Security
  ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER NOT NULL DEFAULT 480,
  ADD COLUMN IF NOT EXISTS password_min_length     INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS require_2fa             BOOLEAN NOT NULL DEFAULT false,

  -- Platform identity (for settings page general tab)
  ADD COLUMN IF NOT EXISTS platform_name     TEXT NOT NULL DEFAULT 'HMS Platform',
  ADD COLUMN IF NOT EXISTS platform_url      TEXT,
  ADD COLUMN IF NOT EXISTS platform_currency TEXT NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS platform_timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
  ADD COLUMN IF NOT EXISTS platform_date_fmt TEXT NOT NULL DEFAULT 'DD/MM/YYYY',

  -- Notification flags
  ADD COLUMN IF NOT EXISTS notif_new_tenant    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_payment       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_sub_expiring  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_system_alerts BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_report BOOLEAN NOT NULL DEFAULT false;
