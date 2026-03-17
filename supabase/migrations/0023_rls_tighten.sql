-- Tighten RLS policies — replace broad using(true) with department-scoped checks.
-- Run this last (after app is wired to Supabase) to avoid blocking development.

-- Helper: get the calling user's department from their staff profile
CREATE OR REPLACE FUNCTION public.auth_department()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department::text FROM public.staff_profiles WHERE id = auth.uid();
$$;

-- Helper: get the calling user's role
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.staff_profiles WHERE id = auth.uid();
$$;

-- Helper: check if calling user has a given permission
CREATE OR REPLACE FUNCTION public.has_permission(perm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.staff_profiles sp ON sp.role = rp.role
    WHERE sp.id = auth.uid()
      AND (rp.permission = perm OR rp.permission = '*:*:*')
  );
$$;

-- ── staff_profiles ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "staff_read_profiles" ON public.staff_profiles;

-- Admins and HR can see all profiles; others see only own department + own profile
CREATE POLICY "staff_read_profiles_scoped"
  ON public.staff_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR auth_role() IN ('admin', 'hr_manager', 'hr_staff')
    OR department::text = auth_department()
  );

-- ── consultations ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "consultations_all" ON public.consultations;

CREATE POLICY "consultations_read"
  ON public.consultations FOR SELECT
  USING (
    doctor_id = auth.uid()
    OR auth_department() IN ('nurses', 'admin')
    OR auth_role() = 'admin'
  );

CREATE POLICY "consultations_write"
  ON public.consultations FOR INSERT
  WITH CHECK (has_permission('consultations:create'));

CREATE POLICY "consultations_update"
  ON public.consultations FOR UPDATE
  USING (
    doctor_id = auth.uid() OR auth_role() = 'admin'
  );

-- ── prescriptions ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "prescriptions_all" ON public.prescriptions;

CREATE POLICY "prescriptions_read"
  ON public.prescriptions FOR SELECT
  USING (
    auth_department() IN ('doctors', 'pharmacy', 'nurses', 'admin')
    OR auth_role() = 'admin'
  );

CREATE POLICY "prescriptions_create"
  ON public.prescriptions FOR INSERT
  WITH CHECK (has_permission('prescriptions:create'));

CREATE POLICY "prescriptions_update"
  ON public.prescriptions FOR UPDATE
  USING (has_permission('pharmacy:prescriptions:dispense') OR auth_role() = 'admin');

-- ── pharmacy_inventory ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pharmacy_inventory_all" ON public.pharmacy_inventory;

CREATE POLICY "pharmacy_inventory_read"
  ON public.pharmacy_inventory FOR SELECT
  USING (
    has_permission('pharmacy:inventory:read')
    OR auth_role() = 'admin'
  );

CREATE POLICY "pharmacy_inventory_write"
  ON public.pharmacy_inventory FOR INSERT
  WITH CHECK (has_permission('pharmacy:inventory:update') OR auth_role() = 'admin');

CREATE POLICY "pharmacy_inventory_update"
  ON public.pharmacy_inventory FOR UPDATE
  USING (has_permission('pharmacy:inventory:update') OR auth_role() = 'admin');

-- ── invoices ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;

CREATE POLICY "invoices_read"
  ON public.invoices FOR SELECT
  USING (
    has_permission('accounts:invoices:read')
    OR auth_role() = 'admin'
    OR created_by = auth.uid()
  );

CREATE POLICY "invoices_create"
  ON public.invoices FOR INSERT
  WITH CHECK (has_permission('accounts:invoices:create'));

CREATE POLICY "invoices_update"
  ON public.invoices FOR UPDATE
  USING (has_permission('accounts:invoices:update') OR auth_role() = 'admin');

-- ── audit_log ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;

CREATE POLICY "audit_log_select_admin"
  ON public.audit_log FOR SELECT
  USING (
    auth_role() IN ('admin', 'hr_manager')
  );
