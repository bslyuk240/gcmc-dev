-- Phase 1: Multi-tenant foundation
-- GCMC = tenant #1 (seed). Adds hospitals, platform_admins, hospital_id on tenant tables.

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hospital_status') THEN
    CREATE TYPE public.hospital_status AS ENUM ('active', 'suspended', 'provisioning');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hospital_plan') THEN
    CREATE TYPE public.hospital_plan AS ENUM ('starter', 'standard', 'enterprise');
  END IF;
END
$$;

-- ─── GCMC seed ID (tenant #1) — stable across environments ─────────────────

-- c0ffee00-0001-4000-8000-000000000001

-- ─── Hospitals (tenant root) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hospitals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  short_name   TEXT,
  status       public.hospital_status NOT NULL DEFAULT 'provisioning',
  plan         public.hospital_plan NOT NULL DEFAULT 'standard',
  settings     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hospitals_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  CONSTRAINT hospitals_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_hospitals_status ON public.hospitals (status);

COMMENT ON COLUMN public.hospitals.settings IS
  'Tenant branding: logo_url, address, phone, email, receipt_tagline, receipt_footer';

-- ─── Platform operators (separate from hospital staff) ───────────────────────

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id         UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_admins_email ON public.platform_admins (email);

-- ─── Platform-level audit (hospital audit_log stays tenant-scoped) ─────────────

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  payload     JSONB,
  actor_id    UUID REFERENCES public.platform_admins (id) ON DELETE SET NULL,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_actor ON public.platform_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created ON public.platform_audit_log (created_at DESC);

-- ─── Seed GCMC ───────────────────────────────────────────────────────────────

INSERT INTO public.hospitals (id, slug, name, short_name, status, plan, settings)
VALUES (
  'c0ffee00-0001-4000-8000-000000000001',
  'gcmc',
  'Group Christian Medical Centre',
  'GCMC',
  'active',
  'standard',
  jsonb_build_object(
    'address', '12 Hospital Avenue, Lagos, Nigeria',
    'phone', '+234 801 234 5678',
    'email', 'info@gcmc.ng',
    'receipt_tagline', 'Quality Healthcare You Can Trust'
  )
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  status = EXCLUDED.status,
  settings = EXCLUDED.settings,
  updated_at = now();

-- ─── Tenant helper: add hospital_id to a table if it exists ──────────────────

CREATE OR REPLACE FUNCTION public._tenant_add_hospital_id(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_gcmc CONSTANT UUID := 'c0ffee00-0001-4000-8000-000000000001';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = p_table
  ) THEN
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals (id) ON DELETE RESTRICT',
    p_table
  );

  EXECUTE format(
    'UPDATE public.%I SET hospital_id = %L WHERE hospital_id IS NULL',
    p_table,
    v_gcmc
  );

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = 'hospital_id'
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN hospital_id SET NOT NULL',
      p_table
    );
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_hospital_id ON public.%I (hospital_id)',
    p_table,
    p_table
  );

  -- Temporary default until Phase 2 resolves tenant per request (never trust client-sent hospital_id)
  EXECUTE format(
    'ALTER TABLE public.%I ALTER COLUMN hospital_id SET DEFAULT %L',
    p_table,
    v_gcmc
  );
END;
$$;

-- ─── Apply hospital_id to all tenant-owned tables ────────────────────────────
-- role_permissions excluded: global permission template (Phase 3 may scope per hospital)

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    -- core (migrations)
    'staff_profiles',
    'patients',
    'visits',
    'appointments',
    'consultations',
    'vitals',
    'medications',
    'prescriptions',
    'prescription_lines',
    'pharmacy_inventory',
    'stock_movements',
    'invoices',
    'payments',
    'tickets',
    'audit_log',
    'units',
    'staff_unit_assignments',
    'rota_assignments',
    'department_heads',
    'chat_threads',
    'chat_messages',
    'nc_units',
    'hmo_schemes',
    'hmo_tariffs',
    'patient_hmo_enrollments',
    'hmo_claims',
    'generated_payslips',
    'staff_attendance_records',
    'leave_year_policies',
    'rota_swap_requests',
    -- app-layer tables (may exist outside migrations)
    'patient_registrations',
    'doctor_profiles',
    'admission_orders',
    'prescribed_drugs',
    'nurse_med_requests',
    'pharmacy_restock_requests',
    'pharmacy_bills',
    'pharmacy_drug_items',
    'lab_tests',
    'test_catalog',
    'ward_patients',
    'nursing_procedures',
    'nurse_sample_requests',
    'icu_vitals',
    'front_desk_charges',
    'consultation_fees',
    'supplier_payments',
    'payroll_batches',
    'kiosk_sales',
    'lab_charges',
    'nursing_charges',
    'handover_notes',
    'patient_observations',
    'mar_entries',
    'leave_requests',
    'performance_reviews',
    'admin_approvals',
    'dept_alerts',
    'it_tickets',
    'store_items',
    'store_pos',
    'store_suppliers',
    'stock_requests',
    'notifications',
    'staff_shifts',
    'it_system_status',
    'shift_presets',
    'billing_presets',
    'store_inventory'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    PERFORM public._tenant_add_hospital_id(t);
  END LOOP;
END;
$$;

-- Drop helper (not needed at runtime)
DROP FUNCTION IF EXISTS public._tenant_add_hospital_id(TEXT);

-- ─── Tenant-scoped unique constraints ───────────────────────────────────────

-- patients.hospital_number (migration table; may differ on live DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patients'
      AND column_name = 'hospital_number'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patients'
      AND column_name = 'hospital_id'
  ) THEN
    ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_hospital_number_key;
    DROP INDEX IF EXISTS public.patients_hospital_number_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_hospital_number_scoped
      ON public.patients (hospital_id, hospital_number)
      WHERE hospital_number IS NOT NULL;
  END IF;
END;
$$;

-- patient_registrations (app primary patient table — uses patient_id as MRN)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patient_registrations'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.patient_registrations_patient_id_key';
    EXECUTE 'ALTER TABLE public.patient_registrations DROP CONSTRAINT IF EXISTS patient_registrations_patient_id_key';
    EXECUTE '
      CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_registrations_patient_id_scoped
        ON public.patient_registrations (hospital_id, patient_id)
        WHERE patient_id IS NOT NULL
    ';
  END IF;
END;
$$;

-- invoices.invoice_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'invoice_number'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'hospital_id'
  ) THEN
    ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
    DROP INDEX IF EXISTS public.invoices_invoice_number_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number_scoped
      ON public.invoices (hospital_id, invoice_number)
      WHERE invoice_number IS NOT NULL;
  END IF;
END;
$$;

-- hmo_schemes.code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hmo_schemes'
  ) THEN
    ALTER TABLE public.hmo_schemes DROP CONSTRAINT IF EXISTS hmo_schemes_code_key;
    DROP INDEX IF EXISTS public.hmo_schemes_code_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_hmo_schemes_code_scoped
      ON public.hmo_schemes (hospital_id, code);
  END IF;
END;
$$;

-- staff email unique per hospital
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff_profiles'
      AND column_name = 'hospital_id'
  ) THEN
    DROP INDEX IF EXISTS public.idx_staff_profiles_email_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_profiles_hospital_email
      ON public.staff_profiles (hospital_id, email);
  END IF;
END;
$$;

-- staff attendance: scope unique constraint when column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff_attendance_records'
      AND column_name = 'hospital_id'
  ) THEN
    ALTER TABLE public.staff_attendance_records
      DROP CONSTRAINT IF EXISTS staff_attendance_records_staff_id_attendance_date_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_hospital_staff_date
      ON public.staff_attendance_records (hospital_id, staff_id, attendance_date);
  END IF;
END;
$$;

-- ─── Auth helpers (used by RLS in Phase 3) ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.auth_hospital_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.staff_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE id = auth.uid()
      AND is_active = true
  )
$$;

-- ─── Signup trigger: assign hospital from metadata ───────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
BEGIN
  v_hospital_id := COALESCE(
    (NEW.raw_user_meta_data->>'hospital_id')::UUID,
    'c0ffee00-0001-4000-8000-000000000001'::UUID
  );

  INSERT INTO public.staff_profiles (id, full_name, email, department, role, hospital_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'department')::department_key, 'frontdesk'),
    COALESCE((NEW.raw_user_meta_data->>'role')::role_key, 'front_desk_staff'),
    v_hospital_id
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, staff_profiles.full_name),
    hospital_id = COALESCE(staff_profiles.hospital_id, EXCLUDED.hospital_id),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ─── RLS: new tables (default deny except explicit policies) ─────────────────

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hospitals_select_scoped ON public.hospitals;
CREATE POLICY hospitals_select_scoped
  ON public.hospitals
  FOR SELECT
  TO authenticated
  USING (
    id = public.auth_hospital_id()
    OR public.auth_is_platform_admin()
  );

DROP POLICY IF EXISTS hospitals_update_platform ON public.hospitals;
CREATE POLICY hospitals_update_platform
  ON public.hospitals
  FOR UPDATE
  TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

-- platform_admins + platform_audit_log: no authenticated policies (service role only)

-- ─── Updated_at trigger for hospitals ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hospitals_updated_at ON public.hospitals;
CREATE TRIGGER hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
