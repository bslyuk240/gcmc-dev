-- Phase 5: Platform admin session invalidation on suspend

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.hospitals.sessions_revoked_at IS
  'When set, HMS sessions issued at or before this time are rejected at the edge.';

-- Platform admins may create hospitals (defense in depth; app also uses service role)
DROP POLICY IF EXISTS hospitals_insert_platform ON public.hospitals;
CREATE POLICY hospitals_insert_platform
  ON public.hospitals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_is_platform_admin());
