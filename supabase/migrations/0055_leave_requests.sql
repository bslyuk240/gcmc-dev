-- Leave requests for staff (tenant-scoped)

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES public.staff_profiles (id) ON DELETE CASCADE,
  staff_name    TEXT NOT NULL,
  department    TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT '',
  leave_type    TEXT NOT NULL CHECK (
    leave_type IN ('Annual', 'Sick', 'Maternity', 'Paternity', 'Personal', 'Emergency', 'Study')
  ),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          INTEGER NOT NULL CHECK (days > 0),
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')
  ),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by   TEXT,
  reviewed_at   TIMESTAMPTZ,
  hr_notes      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_period_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_hospital
  ON public.leave_requests (hospital_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_department
  ON public.leave_requests (hospital_id, department, status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_staff
  ON public.leave_requests (hospital_id, staff_id, submitted_at DESC);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_requests_tenant_select ON public.leave_requests;
CREATE POLICY leave_requests_tenant_select
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS leave_requests_tenant_insert ON public.leave_requests;
CREATE POLICY leave_requests_tenant_insert
  ON public.leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS leave_requests_tenant_update ON public.leave_requests;
CREATE POLICY leave_requests_tenant_update
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (hospital_id = public.auth_hospital_id())
  WITH CHECK (hospital_id = public.auth_hospital_id());

COMMENT ON TABLE public.leave_requests IS
  'Staff leave requests. Reviewed by HOD or HR. Tenant-scoped via hospital_id.';
