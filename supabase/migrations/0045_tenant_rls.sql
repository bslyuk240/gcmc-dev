-- Phase 3: Tenant-scoped RLS — hospital_id = auth_hospital_id() on all tenant data

-- ─── Tenant-aware auth helpers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auth_hospital_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.staff_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.auth_department()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department::text
  FROM public.staff_profiles
  WHERE id = auth.uid()
    AND hospital_id = auth_hospital_id()
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.staff_profiles
  WHERE id = auth.uid()
    AND hospital_id = auth_hospital_id()
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.staff_profiles sp ON sp.role = rp.role
    WHERE sp.id = auth.uid()
      AND sp.hospital_id = auth_hospital_id()
      AND (rp.permission = perm OR rp.permission = '*:*:*')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_same_tenant(row_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_hospital_id IS NOT NULL
    AND auth_hospital_id() IS NOT NULL
    AND row_hospital_id = auth_hospital_id()
$$;

-- ─── Force hospital_id from auth on client writes (prevents mass-assignment) ─

CREATE OR REPLACE FUNCTION public.enforce_tenant_hospital_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth_hospital_id() IS NOT NULL THEN
    NEW.hospital_id := auth_hospital_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Policy helpers ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._tenant_drop_policies(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._tenant_apply_basic_rls(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = 'hospital_id'
  ) THEN
    RETURN;
  END IF;

  PERFORM public._tenant_drop_policies(p_table);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);

  EXECUTE format(
    'CREATE POLICY tenant_select ON public.%I FOR SELECT TO authenticated USING (hospital_id = auth_hospital_id())',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (hospital_id = auth_hospital_id())',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (hospital_id = auth_hospital_id()) WITH CHECK (hospital_id = auth_hospital_id())',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (hospital_id = auth_hospital_id())',
    p_table
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._tenant_apply_enforce_trigger(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = 'hospital_id'
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('DROP TRIGGER IF EXISTS enforce_tenant_hospital_id ON public.%I', p_table);
  EXECUTE format(
    'CREATE TRIGGER enforce_tenant_hospital_id BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_hospital_id()',
    p_table
  );
END;
$$;

-- ─── Apply enforce triggers to all tenant tables ─────────────────────────────

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'staff_profiles', 'patients', 'visits', 'appointments', 'consultations', 'vitals',
    'medications', 'prescriptions', 'prescription_lines', 'pharmacy_inventory',
    'stock_movements', 'invoices', 'payments', 'tickets', 'audit_log', 'units',
    'staff_unit_assignments', 'rota_assignments', 'department_heads', 'chat_threads',
    'chat_messages', 'nc_units', 'hmo_schemes', 'hmo_tariffs', 'patient_hmo_enrollments',
    'hmo_claims', 'generated_payslips', 'staff_attendance_records', 'leave_year_policies',
    'rota_swap_requests', 'patient_registrations', 'doctor_profiles', 'admission_orders',
    'prescribed_drugs', 'nurse_med_requests', 'pharmacy_restock_requests', 'pharmacy_bills',
    'pharmacy_drug_items', 'lab_tests', 'test_catalog', 'ward_patients', 'nursing_procedures',
    'nurse_sample_requests', 'icu_vitals', 'front_desk_charges', 'consultation_fees',
    'supplier_payments', 'payroll_batches', 'kiosk_sales', 'lab_charges', 'nursing_charges',
    'handover_notes', 'patient_observations', 'mar_entries', 'leave_requests',
    'performance_reviews', 'admin_approvals', 'dept_alerts', 'it_tickets', 'store_items',
    'store_pos', 'store_suppliers', 'stock_requests', 'notifications', 'staff_shifts',
    'it_system_status', 'shift_presets', 'billing_presets', 'store_inventory'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    PERFORM public._tenant_apply_enforce_trigger(t);
  END LOOP;
END;
$$;

-- ─── staff_profiles (tenant + department scope) ──────────────────────────────

SELECT public._tenant_drop_policies('staff_profiles');
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_staff_select
  ON public.staff_profiles FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      id = auth.uid()
      OR auth_role() IN ('admin', 'hr_manager', 'hr_staff')
      OR department::text = auth_department()
    )
  );

CREATE POLICY tenant_staff_update_own
  ON public.staff_profiles FOR UPDATE TO authenticated
  USING (hospital_id = auth_hospital_id() AND id = auth.uid())
  WITH CHECK (hospital_id = auth_hospital_id() AND id = auth.uid());

-- ─── consultations (basic tenant RLS if live schema differs from migrations) ─

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'consultations' AND column_name = 'doctor_id'
  ) THEN
    PERFORM public._tenant_drop_policies('consultations');
    ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
    EXECUTE $policy$
      CREATE POLICY tenant_consultations_select ON public.consultations FOR SELECT TO authenticated
      USING (hospital_id = auth_hospital_id() AND (doctor_id = auth.uid() OR auth_department() IN ('nurses', 'admin') OR auth_role() = 'admin'))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY tenant_consultations_insert ON public.consultations FOR INSERT TO authenticated
      WITH CHECK (hospital_id = auth_hospital_id() AND has_permission('consultations:create'))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY tenant_consultations_update ON public.consultations FOR UPDATE TO authenticated
      USING (hospital_id = auth_hospital_id() AND (doctor_id = auth.uid() OR auth_role() = 'admin'))
      WITH CHECK (hospital_id = auth_hospital_id())
    $policy$;
  ELSE
    PERFORM public._tenant_apply_basic_rls('consultations');
  END IF;
END;
$$;

-- ─── prescriptions ───────────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('prescriptions');
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_prescriptions_select
  ON public.prescriptions FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      auth_department() IN ('doctors', 'pharmacy', 'nurses', 'admin')
      OR auth_role() = 'admin'
    )
  );

CREATE POLICY tenant_prescriptions_insert
  ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (hospital_id = auth_hospital_id() AND has_permission('prescriptions:create'));

CREATE POLICY tenant_prescriptions_update
  ON public.prescriptions FOR UPDATE TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (has_permission('pharmacy:prescriptions:dispense') OR auth_role() = 'admin')
  )
  WITH CHECK (hospital_id = auth_hospital_id());

-- ─── prescription_lines (via prescription tenant) ────────────────────────────

SELECT public._tenant_drop_policies('prescription_lines');
ALTER TABLE public.prescription_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_prescription_lines_all
  ON public.prescription_lines FOR ALL TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id
        AND p.hospital_id = auth_hospital_id()
    )
  )
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id
        AND p.hospital_id = auth_hospital_id()
    )
  );

-- ─── pharmacy_inventory ──────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('pharmacy_inventory');
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_pharmacy_inventory_select
  ON public.pharmacy_inventory FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (has_permission('pharmacy:inventory:read') OR auth_role() = 'admin')
  );

CREATE POLICY tenant_pharmacy_inventory_insert
  ON public.pharmacy_inventory FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND (has_permission('pharmacy:inventory:update') OR auth_role() = 'admin')
  );

CREATE POLICY tenant_pharmacy_inventory_update
  ON public.pharmacy_inventory FOR UPDATE TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (has_permission('pharmacy:inventory:update') OR auth_role() = 'admin')
  )
  WITH CHECK (hospital_id = auth_hospital_id());

-- ─── invoices ────────────────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('invoices');
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_invoices_select
  ON public.invoices FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      has_permission('accounts:invoices:read')
      OR auth_role() = 'admin'
      OR created_by = auth.uid()
    )
  );

CREATE POLICY tenant_invoices_insert
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (hospital_id = auth_hospital_id() AND has_permission('accounts:invoices:create'));

CREATE POLICY tenant_invoices_update
  ON public.invoices FOR UPDATE TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (has_permission('accounts:invoices:update') OR auth_role() = 'admin')
  )
  WITH CHECK (hospital_id = auth_hospital_id());

-- ─── audit_log ───────────────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('audit_log');
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_audit_log_select
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND auth_role() IN ('admin', 'hr_manager')
  );

CREATE POLICY tenant_audit_log_insert
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (hospital_id = auth_hospital_id());

-- ─── chat ────────────────────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('chat_threads');
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_chat_threads_select
  ON public.chat_threads FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      requester_id = auth.uid()
      OR (channel_type = 'staff_hr' AND auth_role() IN ('admin', 'hr_manager', 'hr_staff'))
      OR (channel_type = 'department_it' AND auth_role() IN ('admin', 'it_staff'))
    )
  );

CREATE POLICY tenant_chat_threads_insert
  ON public.chat_threads FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND requester_id = auth.uid()
    AND requester_department::text = auth_department()
  );

CREATE POLICY tenant_chat_threads_update
  ON public.chat_threads FOR UPDATE TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      requester_id = auth.uid()
      OR (channel_type = 'staff_hr' AND auth_role() IN ('admin', 'hr_manager', 'hr_staff'))
      OR (channel_type = 'department_it' AND auth_role() IN ('admin', 'it_staff'))
    )
  )
  WITH CHECK (hospital_id = auth_hospital_id());

SELECT public._tenant_drop_policies('chat_messages');
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_chat_messages_select
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.chat_threads thread
      WHERE thread.id = thread_id
        AND thread.hospital_id = auth_hospital_id()
        AND (
          thread.requester_id = auth.uid()
          OR (thread.channel_type = 'staff_hr' AND auth_role() IN ('admin', 'hr_manager', 'hr_staff'))
          OR (thread.channel_type = 'department_it' AND auth_role() IN ('admin', 'it_staff'))
        )
    )
  );

CREATE POLICY tenant_chat_messages_insert
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_threads thread
      WHERE thread.id = thread_id AND thread.hospital_id = auth_hospital_id()
    )
  );

-- ─── rota ────────────────────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('rota_assignments');
ALTER TABLE public.rota_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_rota_select
  ON public.rota_assignments FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      auth.uid() = staff_id
      OR EXISTS (
        SELECT 1 FROM public.staff_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.hospital_id = auth_hospital_id()
          AND (
            sp.role IN ('admin', 'hod', 'hr_manager')
            OR sp.department::text = rota_assignments.department::text
          )
      )
    )
  );

CREATE POLICY tenant_rota_insert
  ON public.rota_assignments FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.hospital_id = auth_hospital_id()
        AND sp.role IN ('admin', 'hod', 'hr_manager')
    )
  );

CREATE POLICY tenant_rota_update
  ON public.rota_assignments FOR UPDATE TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.hospital_id = auth_hospital_id()
        AND sp.role IN ('admin', 'hod', 'hr_manager')
    )
  )
  WITH CHECK (hospital_id = auth_hospital_id());

SELECT public._tenant_drop_policies('rota_swap_requests');
ALTER TABLE public.rota_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_rota_swap_select
  ON public.rota_swap_requests FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      staff_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.hospital_id = auth_hospital_id()
          AND (
            sp.role IN ('admin', 'hr_manager', 'hr_staff')
            OR (sp.role = 'hod' AND sp.department::text = rota_swap_requests.department::text)
          )
      )
    )
  );

CREATE POLICY tenant_rota_swap_insert
  ON public.rota_swap_requests FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND staff_id = auth.uid()
  );

CREATE POLICY tenant_rota_swap_update
  ON public.rota_swap_requests FOR UPDATE TO authenticated
  USING (hospital_id = auth_hospital_id())
  WITH CHECK (hospital_id = auth_hospital_id());

-- ─── staff attendance ────────────────────────────────────────────────────────

SELECT public._tenant_drop_policies('staff_attendance_records');
ALTER TABLE public.staff_attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_attendance_select
  ON public.staff_attendance_records FOR SELECT TO authenticated
  USING (
    hospital_id = auth_hospital_id()
    AND (
      staff_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.staff_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.hospital_id = auth_hospital_id()
          AND (
            sp.role IN ('admin', 'hr_manager', 'hr_staff')
            OR (sp.role = 'hod' AND sp.department::text = staff_attendance_records.department)
          )
      )
    )
  );

CREATE POLICY tenant_attendance_insert
  ON public.staff_attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = auth_hospital_id()
    AND staff_id = auth.uid()
  );

CREATE POLICY tenant_attendance_update
  ON public.staff_attendance_records FOR UPDATE TO authenticated
  USING (hospital_id = auth_hospital_id())
  WITH CHECK (hospital_id = auth_hospital_id());

-- ─── HMO (replace using(true)) ───────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hmo_schemes') THEN
    PERFORM public._tenant_apply_basic_rls('hmo_schemes');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hmo_tariffs') THEN
    PERFORM public._tenant_apply_basic_rls('hmo_tariffs');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_hmo_enrollments') THEN
    PERFORM public._tenant_apply_basic_rls('patient_hmo_enrollments');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hmo_claims') THEN
    PERFORM public._tenant_apply_basic_rls('hmo_claims');
  END IF;
END;
$$;

-- ─── Basic tenant RLS on remaining tables ──────────────────────────────────

DO $$
DECLARE
  t TEXT;
  basic_tables TEXT[] := ARRAY[
    'patients', 'visits', 'appointments', 'vitals', 'medications',
    'stock_movements', 'payments', 'tickets', 'units', 'staff_unit_assignments',
    'department_heads', 'nc_units', 'generated_payslips', 'leave_year_policies',
    'patient_registrations', 'doctor_profiles', 'admission_orders', 'prescribed_drugs',
    'nurse_med_requests', 'pharmacy_restock_requests', 'pharmacy_bills', 'pharmacy_drug_items',
    'lab_tests', 'test_catalog', 'ward_patients', 'nursing_procedures', 'nurse_sample_requests',
    'icu_vitals', 'front_desk_charges', 'consultation_fees', 'supplier_payments',
    'payroll_batches', 'kiosk_sales', 'lab_charges', 'nursing_charges', 'handover_notes',
    'patient_observations', 'mar_entries', 'leave_requests', 'performance_reviews',
    'admin_approvals', 'dept_alerts', 'it_tickets', 'store_items', 'store_pos',
    'store_suppliers', 'stock_requests', 'notifications', 'staff_shifts',
    'it_system_status', 'shift_presets', 'billing_presets', 'store_inventory'
  ];
BEGIN
  FOREACH t IN ARRAY basic_tables LOOP
    PERFORM public._tenant_apply_basic_rls(t);
  END LOOP;
END;
$$;

-- role_permissions: global template — authenticated read only
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
SELECT public._tenant_drop_policies('role_permissions');
CREATE POLICY role_permissions_select
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

-- Drop internal helpers (keep auth + enforce functions)
DROP FUNCTION IF EXISTS public._tenant_drop_policies(TEXT);
DROP FUNCTION IF EXISTS public._tenant_apply_basic_rls(TEXT);
DROP FUNCTION IF EXISTS public._tenant_apply_enforce_trigger(TEXT);
