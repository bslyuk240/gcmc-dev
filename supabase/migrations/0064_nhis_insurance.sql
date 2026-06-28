-- NHIS / HMO insurance module: claim lines, verification, remittances, RPCs

-- ─── Enrollment verification ─────────────────────────────────────────────────

ALTER TABLE public.patient_hmo_enrollments
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by_name TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE public.patient_hmo_enrollments
SET verification_status = 'verified',
    verified_at = coalesce(verified_at, created_at)
WHERE is_active = true AND verification_status = 'pending';

-- ─── Normalized claim lines ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hmo_claim_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  claim_id        UUID NOT NULL REFERENCES public.hmo_claims (id) ON DELETE CASCADE,
  charge_line_id  UUID NOT NULL REFERENCES public.billing_charge_lines (id) ON DELETE RESTRICT,
  service_type    TEXT NOT NULL DEFAULT 'other',
  description     TEXT NOT NULL DEFAULT '',
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  hmo_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  copay_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (claim_id, charge_line_id)
);

CREATE INDEX IF NOT EXISTS idx_hmo_claim_lines_claim
  ON public.hmo_claim_lines (hospital_id, claim_id);
CREATE INDEX IF NOT EXISTS idx_hmo_claim_lines_charge
  ON public.hmo_claim_lines (hospital_id, charge_line_id);

-- ─── Claim audit events ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hmo_claim_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  claim_id        UUID NOT NULL REFERENCES public.hmo_claims (id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  actor_id        UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_name      TEXT NOT NULL DEFAULT '',
  notes           TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hmo_claim_events_claim
  ON public.hmo_claim_events (hospital_id, claim_id, created_at DESC);

-- ─── Pre-authorizations ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hmo_pre_authorizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL,
  enrollment_id   UUID REFERENCES public.patient_hmo_enrollments (id) ON DELETE SET NULL,
  scheme_id       UUID NOT NULL REFERENCES public.hmo_schemes (id) ON DELETE RESTRICT,
  service_category TEXT NOT NULL DEFAULT 'other',
  service_name    TEXT NOT NULL DEFAULT '',
  amount_cap      NUMERIC(12, 2),
  auth_code       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'used')),
  requested_by    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  requested_by_name TEXT NOT NULL DEFAULT '',
  reviewed_by_name TEXT,
  valid_until     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hmo_preauth_hospital_status
  ON public.hmo_pre_authorizations (hospital_id, status);

-- ─── Remittances ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hmo_remittances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  scheme_id       UUID NOT NULL REFERENCES public.hmo_schemes (id) ON DELETE RESTRICT,
  remittance_ref  TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  bank_reference  TEXT,
  notes           TEXT,
  recorded_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  recorded_by_name TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hmo_remittance_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  remittance_id   UUID NOT NULL REFERENCES public.hmo_remittances (id) ON DELETE CASCADE,
  claim_id        UUID NOT NULL REFERENCES public.hmo_claims (id) ON DELETE RESTRICT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (remittance_id, claim_id)
);

-- ─── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nhis_patient_reg_uuid(
  p_hospital_id UUID,
  p_patient_ref TEXT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_patient_ref IS NULL OR btrim(p_patient_ref) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_id := p_patient_ref::uuid;
    IF EXISTS (
      SELECT 1 FROM public.patient_registrations pr
      WHERE pr.hospital_id = p_hospital_id AND pr.id = v_id
    ) THEN
      RETURN v_id;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_id := NULL;
  END;

  SELECT pr.id INTO v_id
  FROM public.patient_registrations pr
  WHERE pr.hospital_id = p_hospital_id
    AND pr.patient_id = p_patient_ref
  LIMIT 1;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.nhis_map_dept_category(p_department TEXT, p_category TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_department, ''))
    WHEN 'doctors' THEN 'consultation'
    WHEN 'lab' THEN 'lab'
    WHEN 'pharmacy' THEN 'pharmacy'
    WHEN 'nurses' THEN 'nursing'
    WHEN 'frontdesk' THEN 'consultation'
    ELSE CASE lower(coalesce(p_category, ''))
      WHEN 'lab_test' THEN 'lab'
      WHEN 'procedure' THEN 'procedure'
      WHEN 'admission' THEN 'admission'
      ELSE 'other'
    END
  END;
$$;

-- ─── Apply HMO tariff to charge line ─────────────────────────────────────────

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

  v_cat := public.nhis_map_dept_category(v_line.department, v_line.category);
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

-- ─── Build claim from charge lines ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nhis_build_claim(
  p_hospital_id UUID,
  p_patient_ref TEXT,
  p_charge_line_ids UUID[],
  p_enrollment_id UUID,
  p_created_by UUID,
  p_created_by_name TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg UUID;
  v_enr RECORD;
  v_claim_id UUID;
  v_claim_number TEXT;
  v_line RECORD;
  v_total NUMERIC := 0;
  v_copay NUMERIC := 0;
  v_hmo NUMERIC := 0;
  v_services JSONB := '[]'::jsonb;
  v_sources JSONB := '[]'::jsonb;
BEGIN
  IF coalesce(array_length(p_charge_line_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one charge line';
  END IF;

  v_reg := public.nhis_patient_reg_uuid(p_hospital_id, p_patient_ref);
  IF v_reg IS NULL THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  SELECT e.*, s.name AS scheme_name
  INTO v_enr
  FROM public.patient_hmo_enrollments e
  JOIN public.hmo_schemes s ON s.id = e.scheme_id
  WHERE e.hospital_id = p_hospital_id
    AND e.id = p_enrollment_id
    AND e.patient_id = v_reg
    AND e.verification_status = 'verified'
    AND e.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified enrollment not found';
  END IF;

  v_claim_id := gen_random_uuid();
  v_claim_number := 'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

  FOR v_line IN
    SELECT *
    FROM public.billing_charge_lines
    WHERE hospital_id = p_hospital_id
      AND id = ANY (p_charge_line_ids)
    FOR UPDATE
  LOOP
    IF NOT v_line.is_hmo THEN
      RAISE EXCEPTION 'Charge % is not marked HMO', v_line.id;
    END IF;
    IF v_line.hmo_claim_id IS NOT NULL THEN
      RAISE EXCEPTION 'Charge % already on a claim', v_line.id;
    END IF;
    IF coalesce(v_line.hmo_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Charge % has no HMO amount', v_line.id;
    END IF;
    IF coalesce(v_line.amount_paid, 0) < coalesce(v_line.copay_amount, v_line.total_amount) THEN
      RAISE EXCEPTION 'Copay not collected for charge %', v_line.id;
    END IF;

    v_total := v_total + coalesce(v_line.total_amount, 0);
    v_copay := v_copay + coalesce(v_line.copay_amount, 0);
    v_hmo := v_hmo + coalesce(v_line.hmo_amount, 0);

    INSERT INTO public.hmo_claim_lines (
      hospital_id, claim_id, charge_line_id, service_type, description,
      amount, hmo_amount, copay_amount
    ) VALUES (
      p_hospital_id, v_claim_id, v_line.id,
      public.nhis_map_dept_category(v_line.department, v_line.category),
      v_line.description,
      v_line.total_amount, v_line.hmo_amount, coalesce(v_line.copay_amount, 0)
    );

    UPDATE public.billing_charge_lines
    SET hmo_claim_id = v_claim_id, updated_at = now()
    WHERE id = v_line.id;

    v_services := v_services || jsonb_build_array(jsonb_build_object(
      'type', public.nhis_map_dept_category(v_line.department, v_line.category),
      'chargeId', v_line.id::text,
      'description', v_line.description,
      'amount', v_line.total_amount,
      'hmoAmount', v_line.hmo_amount,
      'copay', coalesce(v_line.copay_amount, 0)
    ));

    v_sources := v_sources || jsonb_build_array(jsonb_build_object(
      'type', v_line.source_table,
      'id', v_line.source_id
    ));
  END LOOP;

  INSERT INTO public.hmo_claims (
    id, hospital_id, claim_number, scheme_id, patient_id, enrollment_id,
    services, source_charges, total_cost, copay_amount, hmo_amount,
    status, notes, created_by
  ) VALUES (
    v_claim_id, p_hospital_id, v_claim_number, v_enr.scheme_id, v_reg, v_enr.id,
    v_services, v_sources, v_total, v_copay, v_hmo,
    'draft', nullif(p_notes, ''), p_created_by
  );

  INSERT INTO public.hmo_claim_events (
    hospital_id, claim_id, action, from_status, to_status,
    actor_id, actor_name, notes
  ) VALUES (
    p_hospital_id, v_claim_id, 'create', NULL, 'draft',
    p_created_by, coalesce(p_created_by_name, ''), 'Claim built from charge lines'
  );

  RETURN jsonb_build_object(
    'claimId', v_claim_id,
    'claimNumber', v_claim_number,
    'totalCost', v_total,
    'copayAmount', v_copay,
    'hmoAmount', v_hmo
  );
END;
$$;

-- ─── Claim lifecycle transitions ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nhis_transition_claim(
  p_hospital_id UUID,
  p_claim_id UUID,
  p_action TEXT,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_amount_paid NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim RECORD;
  v_from TEXT;
  v_to TEXT;
BEGIN
  SELECT * INTO v_claim
  FROM public.hmo_claims
  WHERE hospital_id = p_hospital_id AND id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  v_from := v_claim.status;

  v_to := CASE lower(p_action)
    WHEN 'submit' THEN
      CASE v_from WHEN 'draft' THEN 'submitted' ELSE NULL END
    WHEN 'approve' THEN
      CASE v_from WHEN 'submitted' THEN 'approved' ELSE NULL END
    WHEN 'reject' THEN
      CASE v_from WHEN 'submitted' THEN 'rejected' ELSE NULL END
    WHEN 'mark_paid' THEN
      CASE v_from WHEN 'approved' THEN 'paid'
                  WHEN 'partial' THEN 'paid'
                  WHEN 'submitted' THEN 'paid'
                  ELSE NULL END
    WHEN 'mark_partial' THEN
      CASE v_from WHEN 'approved' THEN 'partial'
                  WHEN 'submitted' THEN 'partial'
                  ELSE NULL END
    ELSE NULL
  END;

  IF v_to IS NULL THEN
    RAISE EXCEPTION 'Invalid transition % from %', p_action, v_from;
  END IF;

  IF p_action = 'reject' AND coalesce(btrim(p_rejection_reason), '') = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  UPDATE public.hmo_claims
  SET status = v_to,
      submitted_at = CASE WHEN v_to = 'submitted' THEN coalesce(submitted_at, now()) ELSE submitted_at END,
      submitted_by = CASE WHEN v_to = 'submitted' THEN coalesce(submitted_by, p_actor_id) ELSE submitted_by END,
      approved_at = CASE WHEN v_to = 'approved' THEN now() ELSE approved_at END,
      rejected_at = CASE WHEN v_to = 'rejected' THEN now() ELSE rejected_at END,
      rejection_reason = CASE WHEN v_to = 'rejected' THEN p_rejection_reason ELSE rejection_reason END,
      paid_at = CASE WHEN v_to IN ('paid', 'partial') THEN now() ELSE paid_at END,
      amount_paid = CASE
        WHEN v_to = 'paid' THEN coalesce(p_amount_paid, hmo_amount)
        WHEN v_to = 'partial' THEN coalesce(p_amount_paid, amount_paid)
        ELSE amount_paid
      END,
      updated_at = now()
  WHERE id = p_claim_id;

  INSERT INTO public.hmo_claim_events (
    hospital_id, claim_id, action, from_status, to_status,
    actor_id, actor_name, notes, payload
  ) VALUES (
    p_hospital_id, p_claim_id, p_action, v_from, v_to,
    p_actor_id, coalesce(p_actor_name, ''),
    p_rejection_reason,
    jsonb_build_object('amountPaid', p_amount_paid)
  );

  RETURN jsonb_build_object('claimId', p_claim_id, 'status', v_to);
END;
$$;

-- ─── Post HMO remittance ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nhis_post_remittance(
  p_hospital_id UUID,
  p_scheme_id UUID,
  p_remittance_ref TEXT,
  p_amount NUMERIC,
  p_received_at TIMESTAMPTZ,
  p_bank_reference TEXT,
  p_notes TEXT,
  p_recorded_by UUID,
  p_recorded_by_name TEXT,
  p_allocations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remittance_id UUID := gen_random_uuid();
  v_alloc JSONB;
  v_claim_id UUID;
  v_alloc_amt NUMERIC;
  v_total_alloc NUMERIC := 0;
  v_claim RECORD;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Remittance amount must be positive';
  END IF;

  IF jsonb_array_length(coalesce(p_allocations, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one claim allocation is required';
  END IF;

  INSERT INTO public.hmo_remittances (
    id, hospital_id, scheme_id, remittance_ref, amount,
    received_at, bank_reference, notes, recorded_by, recorded_by_name
  ) VALUES (
    v_remittance_id, p_hospital_id, p_scheme_id, p_remittance_ref, p_amount,
    coalesce(p_received_at, now()), nullif(p_bank_reference, ''), nullif(p_notes, ''),
    p_recorded_by, coalesce(p_recorded_by_name, '')
  );

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_claim_id := (v_alloc->>'claimId')::uuid;
    v_alloc_amt := (v_alloc->>'amount')::numeric;
    IF v_alloc_amt <= 0 THEN
      RAISE EXCEPTION 'Allocation amount must be positive';
    END IF;

    SELECT * INTO v_claim
    FROM public.hmo_claims
    WHERE hospital_id = p_hospital_id AND id = v_claim_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Claim % not found', v_claim_id;
    END IF;

    INSERT INTO public.hmo_remittance_allocations (
      hospital_id, remittance_id, claim_id, amount
    ) VALUES (
      p_hospital_id, v_remittance_id, v_claim_id, v_alloc_amt
    );

    v_total_alloc := v_total_alloc + v_alloc_amt;

    UPDATE public.hmo_claims
    SET amount_paid = coalesce(amount_paid, 0) + v_alloc_amt,
        status = CASE
          WHEN coalesce(amount_paid, 0) + v_alloc_amt >= hmo_amount THEN 'paid'
          ELSE 'partial'
        END,
        paid_at = now(),
        updated_at = now()
    WHERE id = v_claim_id;

    INSERT INTO public.hmo_claim_events (
      hospital_id, claim_id, action, from_status, to_status,
      actor_id, actor_name, notes, payload
    ) VALUES (
      p_hospital_id, v_claim_id, 'remittance', v_claim.status,
      CASE WHEN coalesce(v_claim.amount_paid, 0) + v_alloc_amt >= v_claim.hmo_amount THEN 'paid' ELSE 'partial' END,
      p_recorded_by, coalesce(p_recorded_by_name, ''),
      'Remittance ' || p_remittance_ref,
      jsonb_build_object('remittanceId', v_remittance_id, 'amount', v_alloc_amt)
    );
  END LOOP;

  IF abs(v_total_alloc - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'Allocations (%) must equal remittance amount (%)', v_total_alloc, p_amount;
  END IF;

  RETURN jsonb_build_object('remittanceId', v_remittance_id, 'totalAllocated', v_total_alloc);
END;
$$;

-- ─── HMO copay-only collection ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.billing_receive_payment(
  p_hospital_id UUID,
  p_charge_line_ids UUID[],
  p_payment_method TEXT,
  p_reference TEXT,
  p_notes TEXT,
  p_received_by UUID,
  p_received_by_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID := gen_random_uuid();
  v_payment_number TEXT;
  v_total NUMERIC := 0;
  v_line RECORD;
  v_balance NUMERIC;
  v_due NUMERIC;
  v_alloc NUMERIC;
  v_legacy_status TEXT := 'Paid';
  v_legacy_method TEXT;
  v_new_status TEXT;
BEGIN
  IF coalesce(array_length(p_charge_line_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No charge lines selected';
  END IF;

  v_payment_number := 'RCPT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

  v_legacy_method := CASE p_payment_method
    WHEN 'cash' THEN 'Cash'
    WHEN 'card' THEN 'POS / Card'
    WHEN 'mobile' THEN 'Mobile Money'
    WHEN 'insurance_copay' THEN 'Insurance'
    WHEN 'insurance_reimbursement' THEN 'Insurance'
    ELSE 'Cash'
  END;

  FOR v_line IN
    SELECT * FROM public.billing_charge_lines
    WHERE hospital_id = p_hospital_id AND id = ANY (p_charge_line_ids)
    FOR UPDATE
  LOOP
    IF v_line.status NOT IN ('open', 'partial') THEN
      RAISE EXCEPTION 'Charge % is not collectible (status=%)', v_line.id, v_line.status;
    END IF;

    IF v_line.is_hmo AND coalesce(v_line.copay_amount, 0) > 0 THEN
      v_due := coalesce(v_line.copay_amount, 0);
    ELSE
      v_due := coalesce(v_line.total_amount, 0);
    END IF;

    v_balance := greatest(v_due - v_line.amount_paid - v_line.amount_waived, 0);
    IF v_balance <= 0 THEN
      RAISE EXCEPTION 'Charge % has no balance due', v_line.id;
    END IF;
    v_total := v_total + v_balance;
  END LOOP;

  INSERT INTO public.billing_payments (
    id, hospital_id, payment_number, payment_method, total_amount,
    received_by, received_by_name, reference, notes
  ) VALUES (
    v_payment_id, p_hospital_id, v_payment_number, p_payment_method, v_total,
    p_received_by, coalesce(p_received_by_name, ''), nullif(p_reference, ''), nullif(p_notes, '')
  );

  FOR v_line IN
    SELECT * FROM public.billing_charge_lines
    WHERE hospital_id = p_hospital_id AND id = ANY (p_charge_line_ids)
    FOR UPDATE
  LOOP
    IF v_line.is_hmo AND coalesce(v_line.copay_amount, 0) > 0 THEN
      v_due := coalesce(v_line.copay_amount, 0);
    ELSE
      v_due := coalesce(v_line.total_amount, 0);
    END IF;

    v_balance := greatest(v_due - v_line.amount_paid - v_line.amount_waived, 0);
    v_alloc := v_balance;

    INSERT INTO public.billing_payment_allocations (hospital_id, payment_id, charge_line_id, amount)
    VALUES (p_hospital_id, v_payment_id, v_line.id, v_alloc);

    v_new_status := CASE
      WHEN v_line.is_hmo THEN 'paid'
      WHEN v_line.amount_paid + v_alloc >= v_line.total_amount - v_line.amount_waived THEN 'paid'
      ELSE 'partial'
    END;

    UPDATE public.billing_charge_lines
    SET amount_paid = amount_paid + v_alloc,
        status = v_new_status,
        updated_at = now()
    WHERE id = v_line.id;

    IF v_line.source_table = 'front_desk_charges' THEN
      UPDATE public.front_desk_charges SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id::text = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'consultation_fees' THEN
      UPDATE public.consultation_fees SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id::text = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'lab_charges' THEN
      UPDATE public.lab_charges SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id::text = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'nursing_charges' THEN
      UPDATE public.nursing_charges SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id::text = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'pharmacy_bills' THEN
      UPDATE public.pharmacy_bills SET bill_status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id::text = v_line.source_id AND hospital_id = p_hospital_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'paymentId', v_payment_id,
    'paymentNumber', v_payment_number,
    'totalAmount', v_total
  );
END;
$$;

-- ─── Tenant RLS on new tables ────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_tenant_apply_basic_rls') THEN
    PERFORM public._tenant_apply_basic_rls('hmo_claim_lines');
    PERFORM public._tenant_apply_basic_rls('hmo_claim_events');
    PERFORM public._tenant_apply_basic_rls('hmo_pre_authorizations');
    PERFORM public._tenant_apply_basic_rls('hmo_remittances');
    PERFORM public._tenant_apply_basic_rls('hmo_remittance_allocations');
  END IF;
END;
$$;
