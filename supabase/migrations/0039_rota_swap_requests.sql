-- Rota swap requests

do $$
begin
  if not exists (select 1 from pg_type where typname = 'department_key') then
    create type department_key as enum (
      'frontdesk',
      'doctors',
      'nurses',
      'pharmacy',
      'accounts',
      'store',
      'admin',
      'hr',
      'it',
      'lab',
      'nhis'
    );
  else
    alter type department_key add value if not exists 'lab';
    alter type department_key add value if not exists 'nhis';
  end if;

  if not exists (select 1 from pg_type where typname = 'shift_type') then
    create type shift_type as enum ('morning', 'afternoon', 'evening', 'night', 'on_call');
  end if;

  if not exists (select 1 from pg_type where typname = 'rota_status') then
    create type rota_status as enum ('scheduled', 'confirmed', 'swapped', 'cancelled', 'completed');
  end if;
end
$$;

create table if not exists public.units (
  id uuid primary key default uuid_generate_v4(),
  department department_key not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (department, name)
);

create index if not exists idx_units_department on public.units (department);

alter table if exists public.units enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'units'
      and policyname = 'units_select'
  ) then
    execute $policy$
      create policy "units_select"
        on public.units
        for select
        using (true)
    $policy$;
  end if;
end
$$;

create table if not exists public.rota_assignments (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid not null references auth.users(id) on delete cascade,
  department department_key not null,
  unit_id uuid references public.units(id) on delete set null,
  shift_date date not null,
  shift_type shift_type not null default 'morning',
  shift_start time,
  shift_end time,
  status rota_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists idx_rota_staff on public.rota_assignments (staff_id);
create index if not exists idx_rota_department on public.rota_assignments (department, shift_date);
create index if not exists idx_rota_date on public.rota_assignments (shift_date);
create index if not exists idx_rota_unit on public.rota_assignments (unit_id);

alter table if exists public.rota_assignments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rota_assignments'
      and policyname = 'rota_select_own'
  ) then
    execute $policy$
      create policy "rota_select_own"
        on public.rota_assignments
        for select
        using (
          auth.uid() = staff_id
          or exists (
            select 1 from public.staff_profiles sp
            where sp.id = auth.uid()
              and (
                sp.role in ('admin', 'hod', 'hr_manager')
                or sp.department::text = rota_assignments.department::text
              )
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rota_assignments'
      and policyname = 'rota_insert'
  ) then
    execute $policy$
      create policy "rota_insert"
        on public.rota_assignments
        for insert
        with check (
          exists (
            select 1 from public.staff_profiles sp
            where sp.id = auth.uid()
              and sp.role in ('admin', 'hod', 'hr_manager')
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rota_assignments'
      and policyname = 'rota_update'
  ) then
    execute $policy$
      create policy "rota_update"
        on public.rota_assignments
        for update
        using (
          exists (
            select 1 from public.staff_profiles sp
            where sp.id = auth.uid()
              and sp.role in ('admin', 'hod', 'hr_manager')
          )
        )
    $policy$;
  end if;
end
$$;

create table if not exists public.rota_swap_requests (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.rota_assignments(id) on delete cascade,
  staff_id uuid not null references auth.users(id) on delete cascade,
  staff_name text not null,
  department department_key not null,
  shift_date date not null,
  shift_type shift_type not null,
  shift_start time,
  shift_end time,
  unit_id uuid references public.units(id) on delete set null,
  unit_name text,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_rota_swap_requests_assignment on public.rota_swap_requests (assignment_id);
create index if not exists idx_rota_swap_requests_staff on public.rota_swap_requests (staff_id, created_at desc);
create index if not exists idx_rota_swap_requests_department on public.rota_swap_requests (department, status, created_at desc);
create index if not exists idx_rota_swap_requests_date on public.rota_swap_requests (shift_date, status);

alter table if exists public.rota_swap_requests enable row level security;

create policy "rota_swap_requests_select"
  on public.rota_swap_requests for select
  using (
    staff_id = auth.uid()
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and (
          sp.role in ('admin', 'hr_manager', 'hr_staff')
          or (sp.role = 'hod' and sp.department::text = rota_swap_requests.department::text)
        )
    )
  );

create policy "rota_swap_requests_insert"
  on public.rota_swap_requests for insert
  with check (
    staff_id = auth.uid()
    and exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.department::text = rota_swap_requests.department::text
    )
  );

create policy "rota_swap_requests_update"
  on public.rota_swap_requests for update
  using (
    exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and (
          sp.role in ('admin', 'hr_manager', 'hr_staff')
          or (sp.role = 'hod' and sp.department::text = rota_swap_requests.department::text)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.staff_profiles sp
      where sp.id = auth.uid()
        and (
          sp.role in ('admin', 'hr_manager', 'hr_staff')
          or (sp.role = 'hod' and sp.department::text = rota_swap_requests.department::text)
        )
    )
  );
