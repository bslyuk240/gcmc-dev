-- Unified audit: all hospital portal activity visible in platform_audit_log

ALTER TABLE public.platform_audit_log
  ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal TEXT NOT NULL DEFAULT 'platform'
    CHECK (portal IN ('platform', 'management', 'staff', 'hospital')),
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS actor_name TEXT;

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_hospital
  ON public.platform_audit_log (hospital_id);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_portal
  ON public.platform_audit_log (portal);

-- Allow any authenticated user as actor (not only platform_admins)
ALTER TABLE public.platform_audit_log
  DROP CONSTRAINT IF EXISTS platform_audit_log_actor_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_audit_log_actor_id_auth_fkey'
  ) THEN
    ALTER TABLE public.platform_audit_log
      ADD CONSTRAINT platform_audit_log_actor_id_auth_fkey
      FOREIGN KEY (actor_id) REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.audit_tenant_row_to_platform_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_hospital_id UUID;
  v_department TEXT;
  v_actor_name TEXT;
  v_entity_id UUID;
  v_row JSONB;
  v_op TEXT;
BEGIN
  v_actor_id := auth.uid();
  v_op := lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  IF v_row ? 'id' AND v_row->>'id' IS NOT NULL THEN
    v_entity_id := (v_row->>'id')::UUID;
  END IF;

  IF TG_TABLE_NAME = 'hospitals' AND v_row ? 'id' THEN
    v_hospital_id := (v_row->>'id')::UUID;
  ELSIF v_row ? 'hospital_id' AND v_row->>'hospital_id' IS NOT NULL THEN
    v_hospital_id := (v_row->>'hospital_id')::UUID;
  END IF;

  IF v_actor_id IS NOT NULL THEN
    SELECT sp.department::TEXT, sp.full_name
    INTO v_department, v_actor_name
    FROM public.staff_profiles sp
    WHERE sp.id = v_actor_id;
  END IF;

  INSERT INTO public.platform_audit_log (
    action,
    entity_type,
    entity_id,
    hospital_id,
    portal,
    department,
    actor_id,
    actor_name,
    payload
  ) VALUES (
    v_op || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    v_entity_id,
    v_hospital_id,
    'hospital',
    v_department,
    v_actor_id,
    v_actor_name,
    jsonb_build_object(
      'operation', v_op,
      'table', TG_TABLE_NAME
    )
  );

  -- Mirror to tenant audit_log when the table is tenant-scoped
  IF v_hospital_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_log'
      AND column_name = 'hospital_id'
  ) THEN
    INSERT INTO public.audit_log (
      action,
      entity_type,
      entity_id,
      hospital_id,
      actor_id,
      payload
    ) VALUES (
      v_op || '.' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      v_entity_id,
      v_hospital_id,
      v_actor_id,
      jsonb_build_object(
        'operation', v_op,
        'table', TG_TABLE_NAME,
        'portal', 'hospital'
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
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
    'rota_swap_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_platform_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER audit_platform_%I
           AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.audit_tenant_row_to_platform_log()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
