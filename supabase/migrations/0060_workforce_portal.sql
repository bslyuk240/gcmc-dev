-- Workforce portal: unified rota unit_name + tasks table

ALTER TYPE public.department_key ADD VALUE IF NOT EXISTS 'non_clinical';

ALTER TABLE public.rota_assignments
  ADD COLUMN IF NOT EXISTS unit_name TEXT;

CREATE INDEX IF NOT EXISTS idx_rota_unit_name
  ON public.rota_assignments (department, unit_name, shift_date);

CREATE TABLE IF NOT EXISTS public.workforce_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  department      TEXT NOT NULL DEFAULT 'non_clinical',
  unit_name       TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  assignee_id     UUID REFERENCES public.staff_profiles (id) ON DELETE SET NULL,
  assignee_name   TEXT,
  assigned_by     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  priority        TEXT NOT NULL DEFAULT 'routine'
    CHECK (priority IN ('routine', 'urgent', 'stat')),
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workforce_tasks_hospital_unit
  ON public.workforce_tasks (hospital_id, unit_name, status);

CREATE INDEX IF NOT EXISTS idx_workforce_tasks_assignee
  ON public.workforce_tasks (hospital_id, assignee_id, status);

ALTER TABLE public.workforce_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workforce_tasks_tenant_select ON public.workforce_tasks;
CREATE POLICY workforce_tasks_tenant_select
  ON public.workforce_tasks FOR SELECT TO authenticated
  USING (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS workforce_tasks_tenant_write ON public.workforce_tasks;
CREATE POLICY workforce_tasks_tenant_write
  ON public.workforce_tasks FOR ALL TO authenticated
  USING (hospital_id = public.auth_hospital_id())
  WITH CHECK (hospital_id = public.auth_hospital_id());

-- Best-effort migration from legacy staff_shifts when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_shifts'
  ) THEN
    INSERT INTO public.rota_assignments (
      staff_id,
      department,
      unit_name,
      shift_date,
      shift_type,
      shift_start,
      shift_end,
      status,
      hospital_id
    )
    SELECT
      ss.staff_id,
      'non_clinical'::public.department_key,
      ss.unit,
      ss.shift_date::date,
      COALESCE(ss.shift_type::public.shift_type, 'morning'::public.shift_type),
      ss.shift_start::time,
      ss.shift_end::time,
      COALESCE(ss.status::public.rota_status, 'scheduled'::public.rota_status),
      COALESCE(
        ss.hospital_id,
        'c0ffee00-0001-4000-8000-000000000001'::uuid
      )
    FROM public.staff_shifts ss
    WHERE ss.department = 'non_clinical'
      AND ss.unit IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.rota_assignments ra
        WHERE ra.staff_id = ss.staff_id
          AND ra.department = 'non_clinical'
          AND ra.unit_name = ss.unit
          AND ra.shift_date = ss.shift_date::date
      );
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'staff_shifts migration skipped: %', SQLERRM;
END
$$;
