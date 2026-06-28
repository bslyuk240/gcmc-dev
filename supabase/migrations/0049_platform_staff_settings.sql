-- 0049: platform_staff role + platform_settings + hospital_subscriptions

-- ─── 1. Add platform_staff to role_key enum ─────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_key') THEN
    ALTER TYPE public.role_key ADD VALUE IF NOT EXISTS 'platform_staff';
  END IF;
END $$;

-- ─── 2. Widen the hospital_id constraint to cover both platform roles ─────────
ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_platform_admin_hospital_check;

ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_platform_role_hospital_check
  CHECK (
    (role IN ('platform_admin', 'platform_staff') AND hospital_id IS NULL)
    OR (role NOT IN ('platform_admin', 'platform_staff') AND hospital_id IS NOT NULL)
  );

-- ─── 3. Update auth helpers to include platform_staff ────────────────────────
-- auth_is_platform_admin stays strict (admin only), used for privileged RLS
-- auth_is_platform_user covers both roles, for read-level RLS
CREATE OR REPLACE FUNCTION public.auth_is_platform_user()
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
      AND role IN ('platform_admin', 'platform_staff')
      AND COALESCE(is_active, true) = true
  );
$$;

-- ─── 4. Update handle_new_user trigger to handle platform_staff ───────────────
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

  IF v_role IN ('platform_admin', 'platform_staff') THEN
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
      WHEN EXCLUDED.role IN ('platform_admin', 'platform_staff') THEN NULL
      ELSE COALESCE(staff_profiles.hospital_id, EXCLUDED.hospital_id)
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ─── 5. RLS policies for platform_staff to read own profile ─────────────────
DROP POLICY IF EXISTS platform_staff_profile_select ON public.staff_profiles;
CREATE POLICY platform_staff_profile_select
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND role IN ('platform_admin', 'platform_staff'));

-- ─── 6. platform_settings table (single-row config) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pricing in kobo (NGN × 100)
  pricing_starter_monthly_kobo   BIGINT NOT NULL DEFAULT 5000000,   -- ₦50,000
  pricing_standard_monthly_kobo  BIGINT NOT NULL DEFAULT 15000000,  -- ₦150,000
  pricing_enterprise_monthly_kobo BIGINT NOT NULL DEFAULT 50000000, -- ₦500,000
  -- Lifecycle
  trial_days          INTEGER NOT NULL DEFAULT 14,
  grace_period_days   INTEGER NOT NULL DEFAULT 7,
  -- Metadata
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_all_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

-- Platform staff can read settings
CREATE POLICY "platform_staff_read_settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.auth_is_platform_user());

-- Seed default row
INSERT INTO public.platform_settings DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- ─── 7. hospital_subscriptions table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hospital_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id           UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  plan                  TEXT NOT NULL DEFAULT 'standard'
                          CHECK (plan IN ('starter', 'standard', 'enterprise')),
  status                TEXT NOT NULL DEFAULT 'trial'
                          CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly'
                          CHECK (billing_cycle IN ('monthly', 'yearly')),
  trial_ends_at         TIMESTAMPTZ,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  grace_period_end      TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_subscriptions ENABLE ROW LEVEL SECURITY;

-- Platform admins manage all
CREATE POLICY "platform_admin_all_subs" ON public.hospital_subscriptions
  FOR ALL TO authenticated
  USING (public.auth_is_platform_admin())
  WITH CHECK (public.auth_is_platform_admin());

-- Platform staff can read
CREATE POLICY "platform_staff_read_subs" ON public.hospital_subscriptions
  FOR SELECT TO authenticated
  USING (public.auth_is_platform_user());

-- ─── 8. Extend PlatformAuditAction enum values (add staff actions) ────────────
-- audit_log actions are stored as TEXT so no enum change needed.
-- New action strings: hospital.onboard_approve, platform.staff_created
