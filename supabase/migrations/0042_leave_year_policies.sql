-- Annual leave policy per year

create table if not exists public.leave_year_policies (
  year integer primary key,
  annual_days numeric not null default 21,
  carry_forward_days numeric not null default 0,
  notes text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_year_policies_annual_days_nonnegative check (annual_days >= 0),
  constraint leave_year_policies_carry_forward_nonnegative check (carry_forward_days >= 0)
);

create index if not exists idx_leave_year_policies_year on public.leave_year_policies (year desc);

alter table if exists public.leave_year_policies enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leave_year_policies'
      and policyname = 'leave_year_policies_select'
  ) then
    execute $policy$
      create policy "leave_year_policies_select"
        on public.leave_year_policies
        for select
        using (true)
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leave_year_policies'
      and policyname = 'leave_year_policies_write'
  ) then
    execute $policy$
      create policy "leave_year_policies_write"
        on public.leave_year_policies
        for all
        using (
          exists (
            select 1
            from public.staff_profiles sp
            where sp.id = auth.uid()
              and sp.role in ('admin', 'hr_manager', 'hr_staff')
          )
        )
        with check (
          exists (
            select 1
            from public.staff_profiles sp
            where sp.id = auth.uid()
              and sp.role in ('admin', 'hr_manager', 'hr_staff')
          )
        )
    $policy$;
  end if;
end
$$;
