alter table if exists public.ward_patients
  add column if not exists doctor_specialty text;

alter table if exists public.visits
  add column if not exists doctor_specialty text;
