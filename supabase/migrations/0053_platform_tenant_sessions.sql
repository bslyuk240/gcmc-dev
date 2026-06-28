-- Platform admin acting context when entering a hospital portal (RLS + auth helpers)

CREATE TABLE IF NOT EXISTS public.platform_tenant_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  portal_type TEXT NOT NULL CHECK (portal_type IN ('management', 'staff')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_tenant_sessions_hospital
  ON public.platform_tenant_sessions (hospital_id);

ALTER TABLE public.platform_tenant_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.platform_tenant_sessions IS
  'When set, platform operators act within a tenant for RLS (auth_hospital_id) and portal access.';

CREATE OR REPLACE FUNCTION public.auth_hospital_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pts.hospital_id FROM public.platform_tenant_sessions pts WHERE pts.user_id = auth.uid()),
    (SELECT sp.hospital_id FROM public.staff_profiles sp WHERE sp.id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.auth_department()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pts.department FROM public.platform_tenant_sessions pts WHERE pts.user_id = auth.uid()),
    (
      SELECT sp.department::text
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.hospital_id = public.auth_hospital_id()
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pts.role FROM public.platform_tenant_sessions pts WHERE pts.user_id = auth.uid()),
    (
      SELECT sp.role::text
      FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
        AND sp.hospital_id = public.auth_hospital_id()
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role::text = public.auth_role()
      AND (rp.permission = perm OR rp.permission = '*:*:*')
  )
$$;
