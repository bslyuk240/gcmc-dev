-- 0050: Hospital self-registration / signup requests

CREATE TABLE IF NOT EXISTS public.hospital_signup_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hospital identity
  hospital_name     TEXT NOT NULL CHECK (char_length(hospital_name) BETWEEN 2 AND 200),
  slug              TEXT NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]$'),
  short_name        TEXT CHECK (char_length(short_name) <= 20),

  -- Plan
  plan              TEXT NOT NULL DEFAULT 'standard'
                      CHECK (plan IN ('starter', 'standard', 'enterprise')),

  -- Contact
  contact_email     TEXT NOT NULL,
  contact_phone     TEXT,
  address           TEXT,

  -- Owner / first admin
  owner_name        TEXT NOT NULL,
  owner_email       TEXT NOT NULL,

  -- Review state
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason  TEXT,
  notes             TEXT,

  -- Provisioned hospital (set on approval)
  hospital_id       UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.hospital_signup_requests ENABLE ROW LEVEL SECURITY;

-- Public: anyone can INSERT a signup request (no auth required)
CREATE POLICY "public_insert_signup" ON public.hospital_signup_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Platform admins can read and update all
CREATE POLICY "platform_admin_all" ON public.hospital_signup_requests
  FOR ALL TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

-- Platform staff can read
CREATE POLICY "platform_staff_read" ON public.hospital_signup_requests
  FOR SELECT TO authenticated
  USING (public.auth_is_platform_user());

-- Index for fast pending queries
CREATE INDEX IF NOT EXISTS idx_signup_requests_status
  ON public.hospital_signup_requests (status, created_at DESC);

-- Prevent duplicate slug submissions in pending state
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_requests_pending_slug
  ON public.hospital_signup_requests (slug)
  WHERE status = 'pending';
