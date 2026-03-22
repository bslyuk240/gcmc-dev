-- Staff attendance records

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
end
$$;

create table if not exists public.staff_attendance_records (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid not null references auth.users(id) on delete cascade,
  staff_name text not null,
  department text not null,
  role text not null,
  attendance_date date not null,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  hours numeric not null default 0,
  status text not null default 'Present' check (status in ('Present', 'Late', 'Half-day', 'Absent', 'Leave', 'Holiday')),
  unit text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, attendance_date)
);

create index if not exists idx_staff_attendance_staff on public.staff_attendance_records (staff_id, attendance_date desc);
create index if not exists idx_staff_attendance_department on public.staff_attendance_records (department, attendance_date desc);
create index if not exists idx_staff_attendance_date on public.staff_attendance_records (attendance_date desc, status);

alter table if exists public.staff_attendance_records enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_records'
      and policyname = 'staff_attendance_select'
  ) then
    execute $policy$
      create policy "staff_attendance_select"
        on public.staff_attendance_records
        for select
        using (
          staff_id = auth.uid()
          or exists (
            select 1
            from public.staff_profiles sp
            where sp.id = auth.uid()
              and (
                sp.role in ('admin', 'hr_manager', 'hr_staff')
                or (sp.role = 'hod' and sp.department::text = staff_attendance_records.department)
              )
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_records'
      and policyname = 'staff_attendance_insert'
  ) then
    execute $policy$
      create policy "staff_attendance_insert"
        on public.staff_attendance_records
        for insert
        with check (
          staff_id = auth.uid()
          and exists (
            select 1
            from public.staff_profiles sp
            where sp.id = auth.uid()
              and sp.department::text = staff_attendance_records.department
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_attendance_records'
      and policyname = 'staff_attendance_update'
  ) then
    execute $policy$
      create policy "staff_attendance_update"
        on public.staff_attendance_records
        for update
        using (
          staff_id = auth.uid()
          or exists (
            select 1
            from public.staff_profiles sp
            where sp.id = auth.uid()
              and (
                sp.role in ('admin', 'hr_manager', 'hr_staff')
                or (sp.role = 'hod' and sp.department::text = staff_attendance_records.department)
              )
          )
        )
        with check (
          staff_id = auth.uid()
          or exists (
            select 1
            from public.staff_profiles sp
            where sp.id = auth.uid()
              and (
                sp.role in ('admin', 'hr_manager', 'hr_staff')
                or (sp.role = 'hod' and sp.department::text = staff_attendance_records.department)
              )
          )
        )
    $policy$;
  end if;
end
$$;
