alter table if exists public.staff_profiles
  add column if not exists specialty text;
