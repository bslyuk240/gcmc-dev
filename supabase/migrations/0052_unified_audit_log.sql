-- 0052: Unified audit log — extend platform_audit_log + create per-tenant audit_log

-- ─── 1. Fix platform_audit_log schema ────────────────────────────────────────
-- Drop the broken FK (actor_id was referencing platform_admins which hospital staff don't exist in)
ALTER TABLE public.platform_audit_log
  DROP CONSTRAINT IF EXISTS platform_audit_log_actor_id_fkey;

-- Re-add as a soft reference to auth.users (no hard FK — actors may be deleted)
-- We store actor_name as a denormalised field so display never breaks on deletion.

-- Add missing columns
ALTER TABLE public.platform_audit_log
  ADD COLUMN IF NOT EXISTS hospital_id  UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal       TEXT NOT NULL DEFAULT 'platform'
                              CHECK (portal IN ('platform','management','staff','system')),
  ADD COLUMN IF NOT EXISTS department   TEXT,
  ADD COLUMN IF NOT EXISTS actor_name   TEXT;

-- Backfill portal for existing rows (they are all platform-admin actions)
UPDATE public.platform_audit_log SET portal = 'platform' WHERE portal IS NULL OR portal = '';

-- Indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_pal_hospital_id  ON public.platform_audit_log (hospital_id);
CREATE INDEX IF NOT EXISTS idx_pal_portal       ON public.platform_audit_log (portal);
CREATE INDEX IF NOT EXISTS idx_pal_created_at   ON public.platform_audit_log (created_at DESC);

-- ─── 2. Widen RLS on platform_audit_log to also allow hospital events ─────────
-- Platform admins can read everything; hospital rows are inserted via service role.
-- (No change needed — existing policy already uses auth_is_platform_admin() which covers SELECT)

-- ─── 3. Per-tenant audit_log table (hospital portal events visible inside /app) ─
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  actor_id     UUID,               -- soft ref — no FK so deletions don't break history
  actor_name   TEXT,               -- denormalised display name
  department   TEXT,
  portal       TEXT NOT NULL DEFAULT 'management'
                 CHECK (portal IN ('management','staff','system')),
  payload      JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Hospital staff can read their own hospital's log
CREATE POLICY "hospital_staff_read_audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (hospital_id = auth_hospital_id());

-- Service role (admin client) can insert — no INSERT policy needed for anon/authenticated
-- because we always use createAdminClient() to write audit events.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_al_hospital_id ON public.audit_log (hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_actor_id    ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_al_action      ON public.audit_log (action);
