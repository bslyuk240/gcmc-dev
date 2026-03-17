-- Department heads (HOD) — tracks who leads each department and their tenure

CREATE TABLE public.department_heads (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  department department_key NOT NULL,
  staff_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date   date,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Only one active HOD per department at a time
CREATE UNIQUE INDEX idx_dept_heads_active
  ON public.department_heads(department)
  WHERE end_date IS NULL;

CREATE INDEX idx_dept_heads_staff ON public.department_heads(staff_id);

ALTER TABLE public.department_heads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dept_heads_select" ON public.department_heads FOR SELECT USING (true);
CREATE POLICY "dept_heads_write"
  ON public.department_heads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role IN ('admin', 'hr_manager')
    )
  );
