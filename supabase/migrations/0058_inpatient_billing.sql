-- Inpatient stays and charge lines (bed days + consumables).
-- Nursing, lab, pharmacy, and consultation charges are aggregated at read time by patient + stay window.

CREATE TABLE IF NOT EXISTS public.inpatient_stays (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id        UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  patient_id         TEXT NOT NULL,
  patient_name       TEXT NOT NULL,
  unit               TEXT NOT NULL,
  bed                TEXT,
  admission_order_id TEXT,
  ward_patient_id    TEXT,
  doctor_in_charge   TEXT,
  admitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharged_at      TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discharged')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inpatient_stays_hospital
  ON public.inpatient_stays (hospital_id, admitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_inpatient_stays_patient
  ON public.inpatient_stays (hospital_id, patient_id, status);

CREATE TABLE IF NOT EXISTS public.inpatient_charges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  stay_id       UUID NOT NULL REFERENCES public.inpatient_stays (id) ON DELETE CASCADE,
  charge_type   TEXT NOT NULL CHECK (charge_type IN ('bed_day', 'consumable')),
  description   TEXT NOT NULL,
  quantity      NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount   NUMERIC NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
  total_amount  NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'Billed', 'Paid', 'Waived')
  ),
  charge_date   DATE,
  recorded_by   TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inpatient_charges_stay
  ON public.inpatient_charges (stay_id, recorded_at DESC);

ALTER TABLE public.inpatient_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inpatient_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inpatient_stays_tenant_select ON public.inpatient_stays;
CREATE POLICY inpatient_stays_tenant_select
  ON public.inpatient_stays FOR SELECT TO authenticated
  USING (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS inpatient_stays_tenant_insert ON public.inpatient_stays;
CREATE POLICY inpatient_stays_tenant_insert
  ON public.inpatient_stays FOR INSERT TO authenticated
  WITH CHECK (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS inpatient_stays_tenant_update ON public.inpatient_stays;
CREATE POLICY inpatient_stays_tenant_update
  ON public.inpatient_stays FOR UPDATE TO authenticated
  USING (hospital_id = public.auth_hospital_id())
  WITH CHECK (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS inpatient_charges_tenant_select ON public.inpatient_charges;
CREATE POLICY inpatient_charges_tenant_select
  ON public.inpatient_charges FOR SELECT TO authenticated
  USING (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS inpatient_charges_tenant_insert ON public.inpatient_charges;
CREATE POLICY inpatient_charges_tenant_insert
  ON public.inpatient_charges FOR INSERT TO authenticated
  WITH CHECK (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS inpatient_charges_tenant_update ON public.inpatient_charges;
CREATE POLICY inpatient_charges_tenant_update
  ON public.inpatient_charges FOR UPDATE TO authenticated
  USING (hospital_id = public.auth_hospital_id())
  WITH CHECK (hospital_id = public.auth_hospital_id());

COMMENT ON TABLE public.inpatient_stays IS
  'One row per inpatient admission episode. Used to roll up bed, consumable, and linked departmental charges.';

COMMENT ON TABLE public.inpatient_charges IS
  'Direct inpatient charge lines: daily bed rate and consumables recorded by nursing staff.';
