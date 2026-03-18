-- Realtime internal chat between staff<->HR and department portals<->IT.

create table public.chat_threads (
  id uuid primary key default uuid_generate_v4(),
  channel_type text not null
    check (channel_type in ('staff_hr', 'department_it')),
  requester_id uuid not null references public.staff_profiles(id) on delete cascade,
  requester_name text not null,
  requester_email text,
  requester_role text not null,
  requester_avatar_url text,
  requester_department department_key not null,
  target_department department_key not null
    check (target_department in ('hr', 'it')),
  last_message_preview text not null default '',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_target_matches_channel check (
    (channel_type = 'staff_hr' and target_department = 'hr')
    or
    (channel_type = 'department_it' and target_department = 'it')
  ),
  unique (channel_type, requester_id, target_department)
);

create index idx_chat_threads_target_last
  on public.chat_threads(target_department, last_message_at desc nulls last);
create index idx_chat_threads_requester
  on public.chat_threads(requester_id, channel_type);

create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.staff_profiles(id) on delete cascade,
  sender_name text not null,
  sender_role text not null,
  sender_portal text not null
    check (sender_portal in ('staff', 'management')),
  body text not null
    check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index idx_chat_messages_thread_created
  on public.chat_messages(thread_id, created_at);
create index idx_chat_messages_sender
  on public.chat_messages(sender_id, created_at desc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create policy "chat_threads_select"
  on public.chat_threads for select
  using (
    requester_id = auth.uid()
    or (channel_type = 'staff_hr' and auth_role() in ('admin', 'hr_manager', 'hr_staff'))
    or (channel_type = 'department_it' and auth_role() in ('admin', 'it_staff'))
  );

create policy "chat_threads_insert"
  on public.chat_threads for insert
  with check (
    requester_id = auth.uid()
    and requester_department::text = auth_department()
    and (
      (channel_type = 'staff_hr' and target_department = 'hr')
      or
      (channel_type = 'department_it' and target_department = 'it')
    )
  );

create policy "chat_threads_update"
  on public.chat_threads for update
  using (
    requester_id = auth.uid()
    or (channel_type = 'staff_hr' and auth_role() in ('admin', 'hr_manager', 'hr_staff'))
    or (channel_type = 'department_it' and auth_role() in ('admin', 'it_staff'))
  )
  with check (
    requester_id = auth.uid()
    or (channel_type = 'staff_hr' and auth_role() in ('admin', 'hr_manager', 'hr_staff'))
    or (channel_type = 'department_it' and auth_role() in ('admin', 'it_staff'))
  );

create policy "chat_messages_select"
  on public.chat_messages for select
  using (
    exists (
      select 1
      from public.chat_threads thread
      where thread.id = thread_id
        and (
          thread.requester_id = auth.uid()
          or (thread.channel_type = 'staff_hr' and auth_role() in ('admin', 'hr_manager', 'hr_staff'))
          or (thread.channel_type = 'department_it' and auth_role() in ('admin', 'it_staff'))
        )
    )
  );

create policy "chat_messages_insert"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_threads thread
      where thread.id = thread_id
        and (
          thread.requester_id = auth.uid()
          or (thread.channel_type = 'staff_hr' and auth_role() in ('admin', 'hr_manager', 'hr_staff'))
          or (thread.channel_type = 'department_it' and auth_role() in ('admin', 'it_staff'))
        )
    )
  );
