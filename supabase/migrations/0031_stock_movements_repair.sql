-- Repair migration for environments where stock_movements was not created yet.

create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  inventory_id uuid not null references public.pharmacy_inventory(id) on delete restrict,
  movement_type stock_movement_type not null,
  quantity int not null,
  reference_id uuid,
  source_destination text,
  ref_no text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_stock_movements_inventory on public.stock_movements(inventory_id);
create index if not exists idx_stock_movements_created on public.stock_movements(created_at desc);

alter table if exists public.stock_movements enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and policyname = 'stock_movements_all'
  ) then
    execute $policy$
      create policy "stock_movements_all"
        on public.stock_movements
        for all
        using (true)
        with check (true)
    $policy$;
  end if;
end
$$;
