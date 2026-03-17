-- Units: sub-divisions within departments (e.g. Nursing → ICU, Ward A)
-- Staff can be assigned to a unit within their department

CREATE TABLE public.units (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  department  department_key NOT NULL,
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department, name)
);

CREATE INDEX idx_units_department ON public.units(department);

-- Staff unit assignments (current + historical)
CREATE TABLE public.staff_unit_assignments (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id    uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date   date,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_staff_unit_assignments_staff  ON public.staff_unit_assignments(staff_id);
CREATE INDEX idx_staff_unit_assignments_unit   ON public.staff_unit_assignments(unit_id);
CREATE INDEX idx_staff_unit_assignments_active ON public.staff_unit_assignments(staff_id) WHERE end_date IS NULL;

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_unit_assignments ENABLE ROW LEVEL SECURITY;

-- Broad read for authenticated staff; writes controlled in app
CREATE POLICY "units_select"                ON public.units FOR SELECT USING (true);
CREATE POLICY "staff_unit_assignments_all"  ON public.staff_unit_assignments FOR ALL USING (true) WITH CHECK (true);

-- ── Seed units ────────────────────────────────────────────────────────────────

INSERT INTO public.units (department, name, description) VALUES
  -- Nursing units
  ('nurses', 'ICU',          'Intensive Care Unit'),
  ('nurses', 'Ward A',       'General inpatient ward — female'),
  ('nurses', 'Ward B',       'General inpatient ward — male'),
  ('nurses', 'Emergency',    'Emergency and acute care'),
  ('nurses', 'Outpatient',   'Outpatient triage and treatment'),
  -- Doctors units
  ('doctors', 'Outpatient',  'General outpatient consultations'),
  ('doctors', 'Ward Round',  'Inpatient ward rounds'),
  ('doctors', 'Theatre',     'Surgical and procedural theatre'),
  -- Lab units
  ('lab', 'Haematology',     'Blood and haematology tests'),
  ('lab', 'Microbiology',    'Microbiology and culture'),
  ('lab', 'Biochemistry',    'Clinical chemistry and biochemistry'),
  -- Pharmacy
  ('pharmacy', 'Dispensary',       'Main dispensing counter'),
  ('pharmacy', 'Compounding',      'Compounding and preparation');
