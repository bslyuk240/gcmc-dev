-- Link pharmacy inventory rows back to the canonical store inventory row.
-- This keeps restock fulfillment aligned across departments even if each table
-- has its own primary key.

alter table if exists public.pharmacy_inventory
  add column if not exists store_inventory_id uuid;

create index if not exists idx_pharmacy_inventory_store_inventory_id
  on public.pharmacy_inventory(store_inventory_id);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'store_inventory'
  ) then
    begin
      alter table public.pharmacy_inventory
        add constraint pharmacy_inventory_store_inventory_fk
        foreign key (store_inventory_id)
        references public.store_inventory(id)
        on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;
