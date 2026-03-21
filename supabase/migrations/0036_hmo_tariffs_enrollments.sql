-- ─── HMO Tariffs ───────────────────────────────────────────────────────────
-- Pricing schedule per service category per HMO scheme
CREATE TABLE IF NOT EXISTS public.hmo_tariffs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id        UUID NOT NULL REFERENCES public.hmo_schemes(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL
                     CHECK (service_category IN ('consultation','lab','pharmacy','nursing','procedure','admission','other')),
  service_name     TEXT NOT NULL,
  hmo_price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  copay_type       TEXT NOT NULL DEFAULT 'percentage'
                     CHECK (copay_type IN ('percentage', 'fixed')),
  copay_value      NUMERIC(10,2) NOT NULL DEFAULT 10, -- % or fixed NGN
  is_active        BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheme_id, service_category, service_name)
);

ALTER TABLE public.hmo_tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_hmo_tariffs"
  ON public.hmo_tariffs FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_manage_hmo_tariffs"
  ON public.hmo_tariffs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Patient HMO Enrollments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_hmo_enrollments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheme_id         UUID NOT NULL REFERENCES public.hmo_schemes(id),
  member_id         TEXT NOT NULL,          -- HMO membership number on card
  plan_name         TEXT,                   -- e.g. 'Standard', 'Executive'
  copay_percentage  NUMERIC(5,2) NOT NULL DEFAULT 10,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  valid_from        DATE,
  valid_until       DATE,
  authorized_by     TEXT,                   -- name of NHIS staff who enrolled
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id),
  UNIQUE (patient_id, scheme_id)            -- one enrollment per scheme per patient
);

ALTER TABLE public.patient_hmo_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_hmo_enrollments"
  ON public.patient_hmo_enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_manage_hmo_enrollments"
  ON public.patient_hmo_enrollments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Patch patients table ───────────────────────────────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS has_hmo               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_hmo_scheme_id UUID REFERENCES public.hmo_schemes(id);
