-- Unified hospital billing ledger (charge lines, payments, allocations)

-- ─── Status helper ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.billing_map_legacy_status(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_status, ''))
    WHEN 'paid' THEN 'paid'
    WHEN 'waived' THEN 'waived'
    WHEN 'partial' THEN 'partial'
    WHEN 'void' THEN 'void'
    WHEN 'cancelled' THEN 'void'
    ELSE 'open'
  END;
$$;

-- ─── Core tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.billing_charge_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  patient_id      TEXT NOT NULL,
  patient_name    TEXT NOT NULL,
  visit_id        TEXT,
  stay_id         UUID REFERENCES public.inpatient_stays (id) ON DELETE SET NULL,
  source_table    TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  department      TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  description     TEXT NOT NULL DEFAULT '',
  quantity        NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_waived   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'partial', 'paid', 'waived', 'void')),
  priority        TEXT NOT NULL DEFAULT 'routine',
  is_hmo          BOOLEAN NOT NULL DEFAULT false,
  hmo_scheme_id   UUID REFERENCES public.hmo_schemes (id) ON DELETE SET NULL,
  copay_amount    NUMERIC(12, 2),
  hmo_amount      NUMERIC(12, 2),
  hmo_claim_id    UUID REFERENCES public.hmo_claims (id) ON DELETE SET NULL,
  billable_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_charge_lines_hospital_status
  ON public.billing_charge_lines (hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_charge_lines_patient
  ON public.billing_charge_lines (hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_charge_lines_billable
  ON public.billing_charge_lines (hospital_id, billable_at DESC);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  patient_id      TEXT,
  payment_number  TEXT NOT NULL,
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN ('cash', 'card', 'transfer', 'mobile', 'insurance_copay', 'insurance_reimbursement', 'other')),
  total_amount    NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  received_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  received_by_name TEXT NOT NULL DEFAULT '',
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference       TEXT,
  notes           TEXT,
  day_closure_id  UUID,
  status          TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_payments_number
  ON public.billing_payments (hospital_id, payment_number);

CREATE TABLE IF NOT EXISTS public.billing_payment_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  payment_id      UUID NOT NULL REFERENCES public.billing_payments (id) ON DELETE CASCADE,
  charge_line_id  UUID NOT NULL REFERENCES public.billing_charge_lines (id) ON DELETE RESTRICT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payment_id, charge_line_id)
);

CREATE TABLE IF NOT EXISTS public.billing_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  charge_line_id  UUID NOT NULL REFERENCES public.billing_charge_lines (id) ON DELETE CASCADE,
  payment_id      UUID REFERENCES public.billing_payments (id) ON DELETE SET NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waive', 'discount', 'refund', 'void')),
  amount          NUMERIC(12, 2) NOT NULL,
  reason          TEXT NOT NULL,
  approved_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_by_name TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_day_closures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  business_date   DATE NOT NULL,
  opened_by       UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  closed_by       UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  closed_by_name  TEXT,
  closed_at       TIMESTAMPTZ,
  expected_cash   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  counted_cash    NUMERIC(12, 2),
  variance        NUMERIC(12, 2),
  summary_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, business_date)
);

ALTER TABLE public.billing_payments
  ADD COLUMN IF NOT EXISTS day_closure_id UUID REFERENCES public.billing_day_closures (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  actor_id        UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_name      TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Mirror trigger ──────────────────────────────────────────────────────────

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

  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['front_desk_charges', 'consultation_fees', 'lab_charges', 'nursing_charges', 'pharmacy_bills']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS billing_mirror_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER billing_mirror_%I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.billing_mirror_charge()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

-- ─── Backfill existing rows ──────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'front_desk_charges') THEN
    UPDATE public.front_desk_charges SET description = description WHERE hospital_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultation_fees') THEN
    UPDATE public.consultation_fees SET doctor_name = doctor_name WHERE hospital_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_charges') THEN
    UPDATE public.lab_charges SET test_name = test_name WHERE hospital_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nursing_charges') THEN
    UPDATE public.nursing_charges SET description = description WHERE hospital_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacy_bills') THEN
    UPDATE public.pharmacy_bills SET source = source WHERE hospital_id IS NOT NULL;
  END IF;
END;
$$;

-- ─── Receive payment (atomic) ────────────────────────────────────────────────

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
  v_alloc NUMERIC;
  v_legacy_status TEXT := 'Paid';
  v_legacy_method TEXT;
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
    WHERE hospital_id = p_hospital_id
      AND id = ANY (p_charge_line_ids)
    FOR UPDATE
  LOOP
    IF v_line.status NOT IN ('open', 'partial') THEN
      RAISE EXCEPTION 'Charge % is not collectible (status=%)', v_line.id, v_line.status;
    END IF;
    v_balance := greatest(v_line.total_amount - v_line.amount_paid - v_line.amount_waived, 0);
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
    v_balance := greatest(v_line.total_amount - v_line.amount_paid - v_line.amount_waived, 0);
    v_alloc := v_balance;

    INSERT INTO public.billing_payment_allocations (hospital_id, payment_id, charge_line_id, amount)
    VALUES (p_hospital_id, v_payment_id, v_line.id, v_alloc);

    UPDATE public.billing_charge_lines
    SET amount_paid = amount_paid + v_alloc,
        status = 'paid',
        updated_at = now()
    WHERE id = v_line.id;

    IF v_line.source_table = 'front_desk_charges' THEN
      UPDATE public.front_desk_charges SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'consultation_fees' THEN
      UPDATE public.consultation_fees SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'lab_charges' THEN
      UPDATE public.lab_charges SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'nursing_charges' THEN
      UPDATE public.nursing_charges SET status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
    ELSIF v_line.source_table = 'pharmacy_bills' THEN
      UPDATE public.pharmacy_bills SET bill_status = v_legacy_status, payment_method = v_legacy_method, paid_at = now()
      WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
    END IF;
  END LOOP;

  INSERT INTO public.billing_audit_log (hospital_id, action, entity_type, entity_id, actor_id, actor_name, payload)
  VALUES (
    p_hospital_id, 'payment.received', 'billing_payment', v_payment_id::text,
    p_received_by, p_received_by_name,
    jsonb_build_object('payment_number', v_payment_number, 'total', v_total, 'charge_line_ids', p_charge_line_ids)
  );

  RETURN jsonb_build_object(
    'paymentId', v_payment_id,
    'paymentNumber', v_payment_number,
    'totalAmount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_waive_charge(
  p_hospital_id UUID,
  p_charge_line_id UUID,
  p_reason TEXT,
  p_approved_by UUID,
  p_approved_by_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line public.billing_charge_lines%ROWTYPE;
BEGIN
  SELECT * INTO v_line FROM public.billing_charge_lines
  WHERE id = p_charge_line_id AND hospital_id = p_hospital_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Charge line not found';
  END IF;
  IF v_line.status NOT IN ('open', 'partial') THEN
    RAISE EXCEPTION 'Charge cannot be waived (status=%)', v_line.status;
  END IF;

  UPDATE public.billing_charge_lines
  SET status = 'waived',
      amount_waived = total_amount - amount_paid,
      updated_at = now()
  WHERE id = v_line.id;

  INSERT INTO public.billing_adjustments (
    hospital_id, charge_line_id, adjustment_type, amount, reason, approved_by, approved_by_name
  ) VALUES (
    p_hospital_id, v_line.id, 'waive', v_line.total_amount - v_line.amount_paid,
    p_reason, p_approved_by, coalesce(p_approved_by_name, '')
  );

  IF v_line.source_table = 'front_desk_charges' THEN
    UPDATE public.front_desk_charges SET status = 'Waived' WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
  ELSIF v_line.source_table = 'consultation_fees' THEN
    UPDATE public.consultation_fees SET status = 'Waived' WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
  ELSIF v_line.source_table = 'lab_charges' THEN
    UPDATE public.lab_charges SET status = 'Waived' WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
  ELSIF v_line.source_table = 'nursing_charges' THEN
    UPDATE public.nursing_charges SET status = 'Waived' WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
  ELSIF v_line.source_table = 'pharmacy_bills' THEN
    UPDATE public.pharmacy_bills SET bill_status = 'Waived' WHERE id = v_line.source_id AND hospital_id = p_hospital_id;
  END IF;

  INSERT INTO public.billing_audit_log (hospital_id, action, entity_type, entity_id, actor_id, actor_name, payload)
  VALUES (p_hospital_id, 'charge.waived', 'billing_charge_line', v_line.id::text, p_approved_by, p_approved_by_name,
    jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('chargeLineId', v_line.id, 'status', 'waived');
END;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.billing_charge_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_day_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_charge_lines' AND policyname = 'billing_charge_lines_tenant') THEN
    CREATE POLICY billing_charge_lines_tenant ON public.billing_charge_lines
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_payments' AND policyname = 'billing_payments_tenant') THEN
    CREATE POLICY billing_payments_tenant ON public.billing_payments
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_payment_allocations' AND policyname = 'billing_alloc_tenant') THEN
    CREATE POLICY billing_alloc_tenant ON public.billing_payment_allocations
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_adjustments' AND policyname = 'billing_adj_tenant') THEN
    CREATE POLICY billing_adj_tenant ON public.billing_adjustments
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_day_closures' AND policyname = 'billing_day_tenant') THEN
    CREATE POLICY billing_day_tenant ON public.billing_day_closures
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_audit_log' AND policyname = 'billing_audit_tenant') THEN
    CREATE POLICY billing_audit_tenant ON public.billing_audit_log
      FOR SELECT TO authenticated
      USING (hospital_id = public.auth_hospital_id());
  END IF;
END;
$$;

INSERT INTO public.role_permissions (role, permission) VALUES
  ('cashier', 'payment.receive'),
  ('accountant', 'payment.receive'),
  ('accountant', 'invoice.create'),
  ('hod', 'payment.receive'),
  ('hod', 'invoice.create'),
  ('hod', 'refund.approve'),
  ('admin', 'payment.receive'),
  ('admin', 'invoice.create'),
  ('admin', 'refund.approve')
ON CONFLICT (role, permission) DO NOTHING;
