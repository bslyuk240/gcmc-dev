-- Phase 6: Platform SaaS billing — manual invoicing v1

CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number     TEXT NOT NULL UNIQUE
                       DEFAULT 'HMS-INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)),
  hospital_id        UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE RESTRICT,
  plan               TEXT NOT NULL CHECK (plan IN ('starter', 'standard', 'enterprise')),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  amount_kobo        BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency           TEXT NOT NULL DEFAULT 'NGN',
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'sent', 'paid', 'void', 'overdue')),
  due_date           DATE NOT NULL,
  paid_at            TIMESTAMPTZ,
  payment_reference  TEXT,
  payment_method     TEXT CHECK (
    payment_method IS NULL
    OR payment_method IN ('bank_transfer', 'cash', 'cheque', 'other')
  ),
  notes              TEXT,
  created_by         UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_invoices_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_hospital
  ON public.platform_invoices (hospital_id);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_status
  ON public.platform_invoices (status);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_due_date
  ON public.platform_invoices (due_date);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_created
  ON public.platform_invoices (created_at DESC);

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_invoices_platform_admin ON public.platform_invoices;
CREATE POLICY platform_invoices_platform_admin
  ON public.platform_invoices
  FOR ALL
  TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

COMMENT ON TABLE public.platform_invoices IS
  'SaaS subscription invoices for tenant hospitals. Amounts are set server-side only.';

COMMENT ON COLUMN public.platform_invoices.amount_kobo IS
  'Invoice total in kobo (NGN × 100). Never accept from client.';
