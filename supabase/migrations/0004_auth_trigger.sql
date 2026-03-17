-- Create staff_profile on first sign up (optional; or do via app)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.staff_profiles (id, full_name, email, department, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'department')::department_key, 'frontdesk'),
    coalesce((new.raw_user_meta_data->>'role')::role_key, 'front_desk_staff')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, staff_profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
