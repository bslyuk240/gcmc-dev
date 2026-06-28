-- Phase 6: Paystack subscription billing (replaces manual invoicing for tenant checkout)

-- Allow Paystack as a payment method on platform invoices
ALTER TABLE public.platform_invoices
  DROP CONSTRAINT IF EXISTS platform_invoices_payment_method_check;

ALTER TABLE public.platform_invoices
  ADD CONSTRAINT platform_invoices_payment_method_check CHECK (
    payment_method IS NULL
    OR payment_method IN ('bank_transfer', 'cash', 'cheque', 'other', 'paystack')
  );

-- Pending / completed Paystack checkout sessions (amount set server-side only)
CREATE TABLE IF NOT EXISTS public.subscription_checkouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('starter', 'standard', 'enterprise')),
  billing_cycle       TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_kobo         BIGINT NOT NULL CHECK (amount_kobo > 0),
  paystack_reference  TEXT NOT NULL UNIQUE,
  invoice_id          UUID REFERENCES public.platform_invoices (id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  initiated_by        UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscription_checkouts_hospital
  ON public.subscription_checkouts (hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_checkouts_status
  ON public.subscription_checkouts (status)
  WHERE status = 'pending';

ALTER TABLE public.subscription_checkouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_checkouts_platform ON public.subscription_checkouts;
CREATE POLICY subscription_checkouts_platform
  ON public.subscription_checkouts
  FOR ALL
  TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

-- Idempotent Paystack webhook processing
CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key    TEXT NOT NULL UNIQUE,
  event_type   TEXT NOT NULL,
  reference    TEXT NOT NULL,
  payload      JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paystack_webhook_reference
  ON public.paystack_webhook_events (reference);

ALTER TABLE public.paystack_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS paystack_webhook_platform ON public.paystack_webhook_events;
CREATE POLICY paystack_webhook_platform
  ON public.paystack_webhook_events
  FOR ALL
  TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

COMMENT ON TABLE public.subscription_checkouts IS
  'Paystack checkout sessions for tenant subscription purchases. Amounts are server-side only.';

COMMENT ON TABLE public.paystack_webhook_events IS
  'Processed Paystack webhook events for idempotent subscription fulfillment.';
