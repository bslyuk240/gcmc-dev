-- Preserve Store snapshot payloads on pharmacy restock requests and allow Store to choose the fulfilled quantity.

alter table if exists public.pharmacy_restock_requests
  add column if not exists store_snapshot jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pharmacy_restock_requests'
      and column_name = 'qty_requested'
  ) then
    execute 'alter table public.pharmacy_restock_requests alter column qty_requested drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pharmacy_restock_requests'
      and column_name = 'inventory_item_id'
  ) then
    execute 'alter table public.pharmacy_restock_requests alter column inventory_item_id drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pharmacy_restock_requests'
      and column_name = 'approved_qty'
  ) then
    execute 'alter table public.pharmacy_restock_requests alter column approved_qty drop not null';
  end if;
end
$$;
