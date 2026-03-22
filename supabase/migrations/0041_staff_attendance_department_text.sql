-- Normalize staff attendance department storage to plain text so the table
-- accepts every department key already used by the app, including NHIS.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff_attendance_records'
      and column_name = 'department'
      and udt_name <> 'text'
  ) then
    alter table public.staff_attendance_records
      alter column department type text
      using department::text;
  end if;
end
$$;
