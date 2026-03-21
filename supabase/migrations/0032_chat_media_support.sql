-- Allow chat messages to carry image attachments and store them in a public bucket.

alter table public.chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text;

alter table public.chat_messages
  alter column body set default '';

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%char_length(btrim(body)) > 0%'
  loop
    execute format(
      'alter table public.chat_messages drop constraint if exists %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.chat_messages
  add constraint chat_messages_body_or_attachment_check
  check (
    char_length(btrim(body)) > 0
    or attachment_url is not null
    or attachment_path is not null
  );

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('chat-media', 'chat-media', true)
    on conflict (id) do update
      set name = excluded.name,
          public = true;
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
         and policyname = 'chat_media_upload'
     ) then
    execute '
      create policy chat_media_upload
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = ''chat-media''
      )
    ';
  end if;
end $$;
