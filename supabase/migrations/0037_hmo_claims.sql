-- ─── HMO Claims ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hmo_claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number   TEXT UNIQUE NOT NULL
                   DEFAULT 'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)),
  scheme_id      UUID NOT NULL REFERENCES public.hmo_schemes(id),
  patient_id     UUID NOT NULL REFERENCES public.patients(id),
  enrollment_id  UUID REFERENCES public.patient_hmo_enrollments(id),

  -- Services bundled into this claim
  services       JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{ type: "consultation", chargeId: "...", description: "...", amount: 5000, hmoAmount: 4500, copay: 500 }]

  -- Source charge IDs for traceability
  source_charges JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{ type: "consultation_fees" | "lab_charges" | "pharmacy_bills" | "nursing_charges", id: "..." }]

  -- Financials
  total_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  copay_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,   -- patient already pays/paid this
  hmo_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- what HMO owes hospital

  -- Claim lifecycle
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','submitted','approved','rejected','paid','partial')),
  submitted_at   TIMESTAMPTZ,
  submitted_by   UUID REFERENCES auth.users(id),
  approved_at    TIMESTAMPTZ,
  rejected_at    TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at        TIMESTAMPTZ,
  amount_paid    NUMERIC(12,2),                      -- may differ from hmo_amount (partial)

  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES auth.users(id)
);

ALTER TABLE public.hmo_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_hmo_claims"
  ON public.hmo_claims FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_manage_hmo_claims"
  ON public.hmo_claims FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Add HMO columns to existing billing tables ─────────────────────────────
ALTER TABLE public.consultation_fees
  ADD COLUMN IF NOT EXISTS is_hmo_patient      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hmo_copay_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_covered_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_claim_id        UUID REFERENCES public.hmo_claims(id);

ALTER TABLE public.pharmacy_bills
  ADD COLUMN IF NOT EXISTS is_hmo_patient      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hmo_copay_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_covered_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_claim_id        UUID REFERENCES public.hmo_claims(id);

ALTER TABLE public.lab_charges
  ADD COLUMN IF NOT EXISTS is_hmo_patient      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hmo_copay_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_covered_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_claim_id        UUID REFERENCES public.hmo_claims(id);

ALTER TABLE public.nursing_charges
  ADD COLUMN IF NOT EXISTS is_hmo_patient      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hmo_copay_amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_covered_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hmo_claim_id        UUID REFERENCES public.hmo_claims(id);

-- ─── Role permissions for NHIS ──────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('nhis_manager', 'hmo_schemes:manage'),
  ('nhis_manager', 'hmo_tariffs:manage'),
  ('nhis_manager', 'hmo_enrollments:manage'),
  ('nhis_manager', 'hmo_claims:manage'),
  ('nhis_manager', 'hmo_claims:submit'),
  ('nhis_manager', 'hmo_claims:approve'),
  ('nhis_officer', 'hmo_schemes:read'),
  ('nhis_officer', 'hmo_tariffs:read'),
  ('nhis_officer', 'hmo_enrollments:manage'),
  ('nhis_officer', 'hmo_claims:manage'),
  ('nhis_officer', 'hmo_claims:submit'),
  ('admin',        'hmo_schemes:manage'),
  ('admin',        'hmo_tariffs:manage'),
  ('admin',        'hmo_enrollments:manage'),
  ('admin',        'hmo_claims:manage')
ON CONFLICT (role, permission) DO NOTHING;
