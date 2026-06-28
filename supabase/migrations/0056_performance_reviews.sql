-- Quarterly performance / appraisal reviews (tenant-scoped)

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES public.staff_profiles (id) ON DELETE CASCADE,
  staff_name      TEXT NOT NULL,
  department      TEXT NOT NULL,
  reviewer_id     UUID NOT NULL REFERENCES public.staff_profiles (id) ON DELETE CASCADE,
  reviewer_name   TEXT NOT NULL,
  period          TEXT NOT NULL,
  period_label    TEXT NOT NULL,
  kpi_scores      JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_rating  NUMERIC(3, 1),
  strengths       TEXT NOT NULL DEFAULT '',
  improvements    TEXT NOT NULL DEFAULT '',
  comments        TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'acknowledged')
  ),
  submitted_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT performance_reviews_unique_period UNIQUE (hospital_id, staff_id, period)
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_hospital
  ON public.performance_reviews (hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_department
  ON public.performance_reviews (hospital_id, department, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_staff
  ON public.performance_reviews (hospital_id, staff_id, created_at DESC);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS performance_reviews_tenant_select ON public.performance_reviews;
CREATE POLICY performance_reviews_tenant_select
  ON public.performance_reviews
  FOR SELECT
  TO authenticated
  USING (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS performance_reviews_tenant_insert ON public.performance_reviews;
CREATE POLICY performance_reviews_tenant_insert
  ON public.performance_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS performance_reviews_tenant_update ON public.performance_reviews;
CREATE POLICY performance_reviews_tenant_update
  ON public.performance_reviews
  FOR UPDATE
  TO authenticated
  USING (hospital_id = public.auth_hospital_id())
  WITH CHECK (hospital_id = public.auth_hospital_id());

COMMENT ON TABLE public.performance_reviews IS
  'Quarterly staff performance reviews. Created by HOD/HR, acknowledged by staff.';
