-- Staff document files (private bucket; signed URLs via service role)

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('staff-documents', 'staff-documents', false)
    on conflict (id) do update
      set name = excluded.name,
          public = false;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and not exists (
       select 1
       from pg_policies
       where schemaname = 'storage'
         and tablename = 'objects'
         and policyname = 'staff_documents_hr_upload'
     ) then
    execute '
      create policy staff_documents_hr_upload
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = ''staff-documents''
        and public.auth_role() in (''admin'', ''hr_manager'', ''hr_staff'')
      )
    ';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and not exists (
       select 1
       from pg_policies
       where schemaname = 'storage'
         and tablename = 'objects'
         and policyname = 'staff_documents_hr_read'
     ) then
    execute '
      create policy staff_documents_hr_read
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = ''staff-documents''
        and public.auth_role() in (''admin'', ''hr_manager'', ''hr_staff'')
      )
    ';
  end if;
end $$;
