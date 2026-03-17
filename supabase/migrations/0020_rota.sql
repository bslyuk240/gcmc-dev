-- Rota / shift scheduling

CREATE TYPE shift_type   AS ENUM ('morning', 'afternoon', 'evening', 'night', 'on_call');
CREATE TYPE rota_status  AS ENUM ('scheduled', 'confirmed', 'swapped', 'cancelled', 'completed');

CREATE TABLE public.rota_assignments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department  department_key NOT NULL,
  unit_id     uuid REFERENCES public.units(id) ON DELETE SET NULL,
  shift_date  date NOT NULL,
  shift_type  shift_type NOT NULL DEFAULT 'morning',
  shift_start time,
  shift_end   time,
  status      rota_status NOT NULL DEFAULT 'scheduled',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_rota_staff      ON public.rota_assignments(staff_id);
CREATE INDEX idx_rota_department ON public.rota_assignments(department, shift_date);
CREATE INDEX idx_rota_date       ON public.rota_assignments(shift_date);
CREATE INDEX idx_rota_unit       ON public.rota_assignments(unit_id);

ALTER TABLE public.rota_assignments ENABLE ROW LEVEL SECURITY;

-- Staff can read own rota; HOD/admin can read department rota
CREATE POLICY "rota_select_own"
  ON public.rota_assignments FOR SELECT
  USING (
    auth.uid() = staff_id
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND (sp.role IN ('admin', 'hod', 'hr_manager') OR sp.department = rota_assignments.department)
    )
  );

CREATE POLICY "rota_insert"
  ON public.rota_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('admin', 'hod', 'hr_manager')
    )
  );

CREATE POLICY "rota_update"
  ON public.rota_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.role IN ('admin', 'hod', 'hr_manager')
    )
  );
