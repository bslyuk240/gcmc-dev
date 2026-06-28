-- Staff self-service: tighten RLS + staff documents

-- ─── Leave: staff see own; HR/HOD/admin see hospital ─────────────────────────

DROP POLICY IF EXISTS leave_requests_tenant_select ON public.leave_requests;

CREATE POLICY leave_requests_scoped_select
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = public.auth_hospital_id()
    AND (
      staff_id = auth.uid()::text
      OR public.auth_role() IN ('admin', 'hr_manager', 'hr_staff', 'hod')
    )
  );

-- ─── Payslips: tenant + self or HR ───────────────────────────────────────────

ALTER TABLE public.generated_payslips
  ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals (id) ON DELETE CASCADE;

UPDATE public.generated_payslips gp
SET hospital_id = sp.hospital_id
FROM public.staff_profiles sp
WHERE gp.hospital_id IS NULL
  AND sp.id::text = gp.staff_id;

UPDATE public.generated_payslips
SET hospital_id = 'c0ffee00-0001-4000-8000-000000000001'::uuid
WHERE hospital_id IS NULL;

DROP POLICY IF EXISTS generated_payslips_all ON public.generated_payslips;
DROP POLICY IF EXISTS tenant_select ON public.generated_payslips;

CREATE POLICY generated_payslips_self_select
  ON public.generated_payslips
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = public.auth_hospital_id()
    AND (
      staff_id = auth.uid()::text
      OR public.auth_role() IN ('admin', 'hr_manager', 'hr_staff', 'accountant')
    )
  );

CREATE POLICY generated_payslips_hr_write
  ON public.generated_payslips
  FOR ALL
  TO authenticated
  USING (
    hospital_id = public.auth_hospital_id()
    AND public.auth_role() IN ('admin', 'hr_manager', 'hr_staff', 'accountant')
  )
  WITH CHECK (
    hospital_id = public.auth_hospital_id()
    AND public.auth_role() IN ('admin', 'hr_manager', 'hr_staff', 'accountant')
  );

CREATE INDEX IF NOT EXISTS idx_generated_payslips_hospital_staff
  ON public.generated_payslips (hospital_id, staff_id, month_key DESC);

-- ─── Staff documents ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES public.staff_profiles (id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Contract', 'Certificate', 'Letter', 'Policy', 'Training', 'Other')),
  storage_path    TEXT,
  file_name       TEXT,
  issued_on       DATE,
  expiry_date     DATE,
  visible_to_staff BOOLEAN NOT NULL DEFAULT true,
  uploaded_by     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_documents_staff
  ON public.staff_documents (hospital_id, staff_id, created_at DESC);

ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_documents_self_select ON public.staff_documents;
CREATE POLICY staff_documents_self_select
  ON public.staff_documents
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = public.auth_hospital_id()
    AND visible_to_staff = true
    AND (
      staff_id = auth.uid()
      OR public.auth_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

DROP POLICY IF EXISTS staff_documents_hr_write ON public.staff_documents;
CREATE POLICY staff_documents_hr_write
  ON public.staff_documents
  FOR ALL
  TO authenticated
  USING (
    hospital_id = public.auth_hospital_id()
    AND public.auth_role() IN ('admin', 'hr_manager', 'hr_staff')
  )
  WITH CHECK (
    hospital_id = public.auth_hospital_id()
    AND public.auth_role() IN ('admin', 'hr_manager', 'hr_staff')
  );
