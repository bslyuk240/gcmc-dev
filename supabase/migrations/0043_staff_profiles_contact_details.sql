b-- Add staff profile contact and banking details

alter table if exists public.staff_profiles
  add column if not exists phone text,
  add column if not exists home_address text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists tax_id text,
  add column if not exists pension_number text,
  add column if not exists nhf_number text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_address text;
