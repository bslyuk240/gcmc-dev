-- Auto-apply HMO pricing on charge mirror + pre-authorization workflow

ALTER TABLE public.hmo_pre_authorizations
  ADD COLUMN IF NOT EXISTS patient_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS patient_ref TEXT,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_hmo_preauth_patient
  ON public.hmo_pre_authorizations (hospital_id, patient_ref, service_category, status);

-- Categories that require NHIS pre-authorization before HMO pricing / admission
CREATE OR REPLACE FUNCTION public.nhis_preauth_required(p_category TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_category, '')) IN ('admission', 'procedure');
$$;

CREATE OR REPLACE FUNCTION public.nhis_has_approved_preauth(
  p_hospital_id UUID,
  p_patient_ref TEXT,
  p_category TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_reg UUID;
BEGIN
  IF NOT public.nhis_preauth_required(p_category) THEN
    RETURN true;
  END IF;

  v_reg := public.nhis_patient_reg_uuid(p_hospital_id, p_patient_ref);

  RETURN EXISTS (
    SELECT 1
    FROM public.hmo_pre_authorizations pa
    WHERE pa.hospital_id = p_hospital_id
      AND pa.status = 'approved'
      AND pa.service_category = lower(p_category)
      AND (pa.valid_until IS NULL OR pa.valid_until >= current_date)
      AND (
        pa.patient_ref = p_patient_ref
        OR (v_reg IS NOT NULL AND pa.patient_id = v_reg)
      )
  );
END;
$$;

-- Silent auto-apply (no error when patient is not HMO)
CREATE OR REPLACE FUNCTION public.nhis_try_auto_apply_hmo_tariff(
  p_hospital_id UUID,
  p_charge_line_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.nhis_apply_hmo_tariff(p_hospital_id, p_charge_line_id);
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
END;
$$;

-- Enforce pre-auth on categories that require it
CREATE OR REPLACE FUNCTION public.nhis_apply_hmo_tariff(
  p_hospital_id UUID,
  p_charge_line_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line RECORD;
  v_reg UUID;
  v_enr RECORD;
  v_tariff RECORD;
  v_gross NUMERIC;
  v_copay NUMERIC;
  v_hmo NUMERIC;
  v_cat TEXT;
BEGIN
  SELECT * INTO v_line
  FROM public.billing_charge_lines
  WHERE hospital_id = p_hospital_id AND id = p_charge_line_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Charge line not found';
  END IF;

  IF v_line.hmo_claim_id IS NOT NULL THEN
    RAISE EXCEPTION 'Charge is already on claim %', v_line.hmo_claim_id;
  END IF;

  v_reg := public.nhis_patient_reg_uuid(p_hospital_id, v_line.patient_id);
  IF v_reg IS NULL THEN
    RAISE EXCEPTION 'Patient registration not found for %', v_line.patient_id;
  END IF;

  v_cat := public.nhis_map_dept_category(v_line.department, v_line.category);

  IF public.nhis_preauth_required(v_cat)
     AND NOT public.nhis_has_approved_preauth(p_hospital_id, v_line.patient_id, v_cat) THEN
    RAISE EXCEPTION 'HMO pre-authorization required for % services', v_cat;
  END IF;

  SELECT e.*, s.id AS scheme_uuid
  INTO v_enr
  FROM public.patient_hmo_enrollments e
  JOIN public.hmo_schemes s ON s.id = e.scheme_id
  WHERE e.hospital_id = p_hospital_id
    AND e.patient_id = v_reg
    AND e.is_active = true
    AND e.verification_status = 'verified'
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No verified HMO enrollment for patient';
  END IF;

  v_gross := coalesce(v_line.total_amount, 0);

  SELECT * INTO v_tariff
  FROM public.hmo_tariffs t
  WHERE t.hospital_id = p_hospital_id
    AND t.scheme_id = v_enr.scheme_id
    AND t.service_category = v_cat
    AND t.is_active = true
  ORDER BY
    CASE WHEN lower(t.service_name) = lower(v_line.description) THEN 0 ELSE 1 END,
    t.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_gross := v_tariff.hmo_price;
    IF v_tariff.copay_type = 'fixed' THEN
      v_copay := least(v_tariff.copay_value, v_gross);
    ELSE
      v_copay := round(v_gross * v_tariff.copay_value / 100.0, 2);
    END IF;
  ELSE
    IF v_enr.copay_percentage IS NOT NULL THEN
      v_copay := round(v_gross * v_enr.copay_percentage / 100.0, 2);
    ELSE
      v_copay := round(v_gross * 0.10, 2);
    END IF;
  END IF;

  v_hmo := greatest(v_gross - v_copay, 0);

  UPDATE public.billing_charge_lines
  SET is_hmo = true,
      hmo_scheme_id = v_enr.scheme_id,
      total_amount = v_gross,
      unit_amount = v_gross,
      copay_amount = v_copay,
      hmo_amount = v_hmo,
      updated_at = now()
  WHERE id = p_charge_line_id;

  RETURN jsonb_build_object(
    'chargeLineId', p_charge_line_id,
    'schemeId', v_enr.scheme_id,
    'totalAmount', v_gross,
    'copayAmount', v_copay,
    'hmoAmount', v_hmo
  );
END;
$$;

-- Mirror trigger: auto-apply HMO after charge lands in ledger
CREATE OR REPLACE FUNCTION public.billing_mirror_charge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital UUID;
  v_dept TEXT;
  v_cat TEXT;
  v_desc TEXT;
  v_amount NUMERIC;
  v_status TEXT;
  v_billable TIMESTAMPTZ;
  v_paid NUMERIC;
  v_is_hmo BOOLEAN := false;
  v_copay NUMERIC;
  v_hmo_amt NUMERIC;
  v_claim UUID;
  v_visit_id TEXT := NULL;
  v_charge_id UUID;
BEGIN
  v_hospital := NEW.hospital_id;
  IF v_hospital IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'front_desk_charges' THEN
    v_dept := 'frontdesk';
    v_cat := coalesce(NEW.charge_type, 'Other');
    v_desc := coalesce(NEW.description, NEW.charge_type, 'Front desk charge');
    v_amount := coalesce(NEW.amount, 0);
    v_status := billing_map_legacy_status(NEW.status::text);
    v_billable := coalesce(NEW.created_at, now());
    IF to_jsonb(NEW) ? 'visit_id' THEN
      v_visit_id := NEW.visit_id::text;
    END IF;
  ELSIF TG_TABLE_NAME = 'consultation_fees' THEN
    v_dept := 'doctors';
    v_cat := coalesce(NEW.consultation_type, 'General');
    v_desc := coalesce(NEW.doctor_name, 'Doctor') || ' — ' || coalesce(NEW.consultation_type, 'consultation');
    v_amount := coalesce(NEW.fee, 0);
    v_status := billing_map_legacy_status(NEW.status::text);
    v_billable := coalesce(NEW.consulted_at, now());
    v_is_hmo := coalesce(NEW.is_hmo_patient, false);
    v_copay := NEW.hmo_copay_amount;
    v_hmo_amt := NEW.hmo_covered_amount;
    v_claim := NEW.hmo_claim_id;
  ELSIF TG_TABLE_NAME = 'lab_charges' THEN
    v_dept := 'lab';
    v_cat := 'lab_test';
    v_desc := coalesce(NEW.test_name, 'Lab test');
    v_amount := coalesce(NEW.amount, 0);
    v_status := billing_map_legacy_status(NEW.status::text);
    v_billable := coalesce(NEW.completed_at, now());
    v_is_hmo := coalesce(NEW.is_hmo_patient, false);
    v_copay := NEW.hmo_copay_amount;
    v_hmo_amt := NEW.hmo_covered_amount;
    v_claim := NEW.hmo_claim_id;
  ELSIF TG_TABLE_NAME = 'nursing_charges' THEN
    v_dept := 'nurses';
    v_cat := coalesce(NEW.procedure_type, 'procedure');
    v_desc := coalesce(NEW.description, NEW.procedure_type, 'Nursing charge');
    v_amount := coalesce(NEW.amount, 0);
    v_status := billing_map_legacy_status(NEW.status::text);
    v_billable := coalesce(NEW.performed_at, now());
    v_is_hmo := coalesce(NEW.is_hmo_patient, false);
    v_copay := NEW.hmo_copay_amount;
    v_hmo_amt := NEW.hmo_covered_amount;
    v_claim := NEW.hmo_claim_id;
  ELSIF TG_TABLE_NAME = 'pharmacy_bills' THEN
    v_dept := 'pharmacy';
    v_cat := coalesce(NEW.source, 'prescription');
    v_desc := coalesce(NEW.drugs::text, 'Pharmacy bill');
    v_amount := coalesce(NEW.total_cost, 0);
    v_status := billing_map_legacy_status(NEW.bill_status::text);
    v_billable := coalesce(NEW.dispensed_at, now());
    v_is_hmo := coalesce(NEW.is_hmo_patient, false);
    v_copay := NEW.hmo_copay_amount;
    v_hmo_amt := NEW.hmo_covered_amount;
    v_claim := NEW.hmo_claim_id;
  ELSE
    RETURN NEW;
  END IF;

  v_paid := CASE
    WHEN v_status = 'paid' THEN v_amount
    ELSE 0
  END;

  INSERT INTO public.billing_charge_lines (
    hospital_id, patient_id, patient_name, visit_id,
    source_table, source_id, department, category, description,
    quantity, unit_amount, total_amount, amount_paid, status,
    is_hmo, copay_amount, hmo_amount, hmo_claim_id, billable_at, updated_at
  ) VALUES (
    v_hospital,
    coalesce(NEW.patient_id::text, ''),
    coalesce(NEW.patient_name, 'Unknown'),
    v_visit_id,
    TG_TABLE_NAME,
    NEW.id::text,
    v_dept,
    v_cat,
    v_desc,
    1,
    v_amount,
    v_amount,
    v_paid,
    v_status,
    v_is_hmo,
    v_copay,
    v_hmo_amt,
    v_claim,
    v_billable,
    now()
  )
  ON CONFLICT (hospital_id, source_table, source_id) DO UPDATE SET
    patient_name = EXCLUDED.patient_name,
    total_amount = EXCLUDED.total_amount,
    unit_amount = EXCLUDED.unit_amount,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    amount_paid = EXCLUDED.amount_paid,
    is_hmo = EXCLUDED.is_hmo,
    copay_amount = EXCLUDED.copay_amount,
    hmo_amount = EXCLUDED.hmo_amount,
    hmo_claim_id = EXCLUDED.hmo_claim_id,
    billable_at = EXCLUDED.billable_at,
    updated_at = now();

  SELECT id INTO v_charge_id
  FROM public.billing_charge_lines
  WHERE hospital_id = v_hospital
    AND source_table = TG_TABLE_NAME
    AND source_id = NEW.id::text;

  IF v_charge_id IS NOT NULL AND v_status IN ('open', 'partial') AND NOT v_is_hmo THEN
    PERFORM public.nhis_try_auto_apply_hmo_tariff(v_hospital, v_charge_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Pre-auth review RPC
CREATE OR REPLACE FUNCTION public.nhis_review_preauth(
  p_hospital_id UUID,
  p_preauth_id UUID,
  p_action TEXT,
  p_reviewer_id UUID,
  p_reviewer_name TEXT,
  p_auth_code TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_status TEXT;
BEGIN
  SELECT * INTO v_row
  FROM public.hmo_pre_authorizations
  WHERE hospital_id = p_hospital_id AND id = p_preauth_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pre-authorization not found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Pre-authorization is not pending';
  END IF;

  v_status := CASE lower(p_action)
    WHEN 'approve' THEN 'approved'
    WHEN 'deny' THEN 'denied'
    ELSE NULL
  END;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Invalid action %', p_action;
  END IF;

  IF v_status = 'approved' AND coalesce(btrim(p_auth_code), '') = '' THEN
    RAISE EXCEPTION 'Authorization code is required for approval';
  END IF;

  UPDATE public.hmo_pre_authorizations
  SET status = v_status,
      auth_code = CASE WHEN v_status = 'approved' THEN p_auth_code ELSE auth_code END,
      valid_until = CASE WHEN v_status = 'approved' THEN coalesce(p_valid_until, current_date + 30) ELSE valid_until END,
      reviewed_by_name = p_reviewer_name,
      notes = coalesce(nullif(p_notes, ''), notes),
      updated_at = now()
  WHERE id = p_preauth_id;

  RETURN jsonb_build_object('preauthId', p_preauth_id, 'status', v_status);
END;
$$;

-- Block inpatient stay without admission pre-auth for HMO patients
CREATE OR REPLACE FUNCTION public.nhis_assert_admission_preauth(
  p_hospital_id UUID,
  p_patient_ref TEXT
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_reg UUID;
  v_has_hmo BOOLEAN := false;
BEGIN
  v_reg := public.nhis_patient_reg_uuid(p_hospital_id, p_patient_ref);
  IF v_reg IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.patient_hmo_enrollments e
    WHERE e.hospital_id = p_hospital_id
      AND e.patient_id = v_reg
      AND e.is_active = true
      AND e.verification_status = 'verified'
  ) INTO v_has_hmo;

  IF NOT v_has_hmo THEN
    RETURN;
  END IF;

  IF NOT public.nhis_has_approved_preauth(p_hospital_id, p_patient_ref, 'admission') THEN
    RAISE EXCEPTION 'HMO admission requires approved NHIS pre-authorization';
  END IF;
END;
$$;
