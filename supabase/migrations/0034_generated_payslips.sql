create table if not exists public.generated_payslips (
  id text primary key,
  period text not null,
  month_key text not null,
  department text not null,
  staff_id text not null,
  staff_name text not null,
  role text not null,
  unit text,
  bank_name text,
  bank_account text,
  tax_id text,
  base_salary numeric not null default 0,
  earnings jsonb not null default '[]'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  gross_pay numeric not null default 0,
  total_deductions numeric not null default 0,
  net_pay numeric not null default 0,
  payment_status text not null default 'Processing',
  workflow_status text not null default 'Generated',
  created_at timestamptz not null default now(),
  created_by text not null default 'HR Manager',
  batch_id text,
  paid_at timestamptz
);

create index if not exists idx_generated_payslips_staff on public.generated_payslips (staff_id, month_key desc);
create index if not exists idx_generated_payslips_department on public.generated_payslips (department, month_key desc);
create index if not exists idx_generated_payslips_batch on public.generated_payslips (batch_id);
create index if not exists idx_generated_payslips_created on public.generated_payslips (created_at desc);

alter table if exists public.generated_payslips enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'generated_payslips'
      and policyname = 'generated_payslips_all'
  ) then
    execute $policy$
      create policy "generated_payslips_all"
        on public.generated_payslips
        for all
        using (true)
        with check (true)
    $policy$;
  end if;
end
$$;
