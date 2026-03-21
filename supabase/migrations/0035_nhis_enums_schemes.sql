-- ─── HMO Schemes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hmo_schemes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,         -- e.g. 'NHIS', 'HYGEIA', 'RELIANCE'
  type         TEXT NOT NULL DEFAULT 'fee_for_service'
                 CHECK (type IN ('capitation', 'fee_for_service')),
  contact_person  TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  address         TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES auth.users(id)
);

ALTER TABLE public.hmo_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_hmo_schemes"
  ON public.hmo_schemes FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_manage_hmo_schemes"
  ON public.hmo_schemes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Seed common Nigerian HMOs ─────────────────────────────────────────────
INSERT INTO public.hmo_schemes (name, code, type) VALUES
  ('National Health Insurance Scheme',       'NHIS',      'capitation'),
  ('Hygeia HMO',                             'HYGEIA',    'fee_for_service'),
  ('Reliance HMO',                           'RELIANCE',  'fee_for_service'),
  ('AXA Mansard Health',                     'AXAMANSARD','fee_for_service'),
  ('Total Health Trust',                     'THT',       'fee_for_service'),
  ('Clearline International',                'CLEARLINE', 'fee_for_service'),
  ('Integrated Healthcare',                  'IHC',       'fee_for_service'),
  ('Avon HMO',                               'AVON',      'fee_for_service'),
  ('Bastion Health',                         'BASTION',   'fee_for_service'),
  ('Liberty Assured',                        'LIBERTY',   'fee_for_service')
ON CONFLICT (code) DO NOTHING;
