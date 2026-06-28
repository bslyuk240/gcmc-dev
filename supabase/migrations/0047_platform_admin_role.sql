-- Phase 5b: Platform admin as staff_profiles.role (Skola-style unified auth)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_key') THEN
    ALTER TYPE public.role_key ADD VALUE IF NOT EXISTS 'platform_admin';
  END IF;
END $$;

ALTER TABLE public.staff_profiles
  ALTER COLUMN hospital_id DROP NOT NULL;

ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_platform_admin_hospital_check;

ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_platform_admin_hospital_check
  CHECK (
    (role = 'platform_admin' AND hospital_id IS NULL)
    OR (role <> 'platform_admin' AND hospital_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.auth_is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE id = auth.uid()
      AND role = 'platform_admin'
      AND COALESCE(is_active, true) = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE id = auth.uid()
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
  v_role TEXT;
  v_department public.department_key;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'front_desk_staff');

  IF v_role = 'platform_admin' THEN
    v_hospital_id := NULL;
  ELSE
    v_hospital_id := COALESCE(
      (NEW.raw_user_meta_data->>'hospital_id')::UUID,
      'c0ffee00-0001-4000-8000-000000000001'::UUID
    );
  END IF;

  v_department := COALESCE(
    (NEW.raw_user_meta_data->>'department')::public.department_key,
    'admin'::public.department_key
  );

  INSERT INTO public.staff_profiles (id, full_name, email, department, role, hospital_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    v_department,
    v_role,
    v_hospital_id
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, staff_profiles.full_name),
    role = COALESCE(EXCLUDED.role, staff_profiles.role),
    hospital_id = CASE
      WHEN EXCLUDED.role = 'platform_admin' THEN NULL
      ELSE COALESCE(staff_profiles.hospital_id, EXCLUDED.hospital_id)
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

INSERT INTO public.staff_profiles (
  id, full_name, email, department, role, hospital_id, is_active, must_change_password
)
SELECT
  pa.id,
  pa.full_name,
  pa.email,
  'admin'::public.department_key,
  'platform_admin',
  NULL,
  pa.is_active,
  false
FROM public.platform_admins pa
ON CONFLICT (id) DO UPDATE SET
  role = 'platform_admin',
  hospital_id = NULL,
  is_active = EXCLUDED.is_active,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();

DROP POLICY IF EXISTS platform_admin_profile_select ON public.staff_profiles;
CREATE POLICY platform_admin_profile_select
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND role = 'platform_admin');

DROP POLICY IF EXISTS platform_admin_profile_update ON public.staff_profiles;
CREATE POLICY platform_admin_profile_update
  ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND role = 'platform_admin')
  WITH CHECK (id = auth.uid() AND role = 'platform_admin');
