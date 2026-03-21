alter table if exists public.payroll_batches
  add column if not exists entries jsonb not null default '[]'::jsonb,
  add column if not exists payslip_ids text[] not null default '{}'::text[];
