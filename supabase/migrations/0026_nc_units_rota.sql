-- Non-clinical units table (Driver Unit, House Keepers, Security + dynamic)
CREATE TABLE IF NOT EXISTS public.nc_units (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default units
INSERT INTO public.nc_units (name) VALUES
  ('Driver Unit'),
  ('House Keepers'),
  ('Security')
ON CONFLICT DO NOTHING;

-- Extend department_heads for per-unit HOD tracking
-- unit_name = NULL  → clinical department HOD (one per dept)
-- unit_name = name  → non-clinical unit HOD (one per unit)
ALTER TABLE public.department_heads
  ADD COLUMN IF NOT EXISTS unit_name text;

-- RLS
ALTER TABLE public.nc_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can read nc_units"
  ON public.nc_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated users can insert nc_units"
  ON public.nc_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated users can delete nc_units"
  ON public.nc_units FOR DELETE TO authenticated USING (true);

-- Allow HODs to write shift rotas via staff_shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_shifts'
      AND policyname = 'authenticated can manage staff_shifts'
  ) THEN
    ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
    EXECUTE $policy$
      CREATE POLICY "authenticated can manage staff_shifts"
        ON public.staff_shifts FOR ALL
        TO authenticated USING (true) WITH CHECK (true)
    $policy$;
  END IF;
END
$$;
