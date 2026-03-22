do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('staff-avatars', 'staff-avatars', true)
    on conflict (id) do update
      set name = excluded.name,
          public = true;
  end if;
end $$;
