-- Hospital IT helpdesk tickets (tenant-scoped)

CREATE TABLE IF NOT EXISTS public.it_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  ticket_ref       TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'Other' CHECK (
    category IN ('Network', 'Access', 'Software', 'Hardware', 'Email', 'System', 'Other')
  ),
  department       TEXT NOT NULL,
  priority         TEXT NOT NULL DEFAULT 'Medium' CHECK (
    priority IN ('Low', 'Medium', 'High', 'Critical', 'Normal', 'Urgent')
  ),
  status           TEXT NOT NULL DEFAULT 'Open' CHECK (
    status IN ('Open', 'In Progress', 'Resolved', 'Closed')
  ),
  assigned_to_id   UUID REFERENCES public.staff_profiles (id) ON DELETE SET NULL,
  assigned_to_name TEXT NOT NULL DEFAULT 'Unassigned',
  opened_by_id     UUID REFERENCES public.staff_profiles (id) ON DELETE SET NULL,
  opened_by_name   TEXT NOT NULL,
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT it_tickets_ref_unique UNIQUE (hospital_id, ticket_ref)
);

CREATE INDEX IF NOT EXISTS idx_it_tickets_hospital
  ON public.it_tickets (hospital_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_it_tickets_status
  ON public.it_tickets (hospital_id, status, priority);

ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS it_tickets_tenant_select ON public.it_tickets;
CREATE POLICY it_tickets_tenant_select
  ON public.it_tickets
  FOR SELECT
  TO authenticated
  USING (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS it_tickets_tenant_insert ON public.it_tickets;
CREATE POLICY it_tickets_tenant_insert
  ON public.it_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = public.auth_hospital_id());

DROP POLICY IF EXISTS it_tickets_tenant_update ON public.it_tickets;
CREATE POLICY it_tickets_tenant_update
  ON public.it_tickets
  FOR UPDATE
  TO authenticated
  USING (hospital_id = public.auth_hospital_id())
  WITH CHECK (hospital_id = public.auth_hospital_id());

COMMENT ON TABLE public.it_tickets IS
  'Hospital-internal IT helpdesk tickets. Tenant-scoped. Platform SaaS issues use platform support separately.';
