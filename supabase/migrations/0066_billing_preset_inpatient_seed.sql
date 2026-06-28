-- Inpatient bed-day rates in billing_presets + seed procedure/inpatient defaults per hospital

CREATE TABLE IF NOT EXISTS public.billing_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  name        TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_presets_hospital_category_name
  ON public.billing_presets (hospital_id, category, name);

ALTER TABLE public.billing_presets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_presets' AND policyname = 'tenant_isolation_billing_presets'
  ) THEN
    CREATE POLICY tenant_isolation_billing_presets ON public.billing_presets
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
END;
$$;

INSERT INTO public.billing_presets (hospital_id, category, name, amount, description, is_active)
SELECT h.id, v.category, v.name, v.amount, v.description, true
FROM public.hospitals h
CROSS JOIN (
  VALUES
    ('procedure', 'Injection',    25,    'Nursing procedure'),
    ('procedure', 'Dressing',     20,    'Nursing procedure'),
    ('procedure', 'IV Access',    30,    'Nursing procedure'),
    ('procedure', 'Catheter',     60,    'Nursing procedure'),
    ('procedure', 'Observation',  15,    'Nursing procedure'),
    ('procedure', 'Wound Care',   40,    'Nursing procedure'),
    ('procedure', 'Blood Draw',   15,    'Nursing procedure'),
    ('procedure', 'Procedure',    50,    'Nursing procedure'),
    ('procedure', 'Other',        20,    'Nursing procedure'),
    ('inpatient', 'Ward',         25000, 'Daily inpatient bed rate'),
    ('inpatient', 'ICU',          75000, 'Daily inpatient bed rate'),
    ('inpatient', 'Emergency',    35000, 'Daily inpatient bed rate')
) AS v(category, name, amount, description)
ON CONFLICT (hospital_id, category, name) DO NOTHING;
