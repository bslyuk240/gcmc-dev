-- Unified hospital store supply chain (inventory ledger, requisitions, GRN)

-- ─── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.store_compute_status(p_qty NUMERIC, p_reorder NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN coalesce(p_qty, 0) <= 0 THEN 'Out of Stock'
    WHEN coalesce(p_qty, 0) <= coalesce(p_reorder, 0) * 0.3 THEN 'Critical'
    WHEN coalesce(p_qty, 0) <= coalesce(p_reorder, 0) THEN 'Low Stock'
    ELSE 'OK'
  END;
$$;

CREATE OR REPLACE FUNCTION public.store_map_legacy_req_status(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_status, ''))
    WHEN 'pending' THEN 'submitted'
    WHEN 'approved' THEN 'approved'
    WHEN 'fulfilled' THEN 'fulfilled'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'partially_issued' THEN 'partially_issued'
    ELSE coalesce(p_status, 'submitted')
  END;
$$;

CREATE OR REPLACE FUNCTION public.store_map_req_to_legacy(p_status TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_status, ''))
    WHEN 'submitted' THEN 'Pending'
    WHEN 'approved' THEN 'Approved'
    WHEN 'partially_issued' THEN 'Approved'
    WHEN 'fulfilled' THEN 'Fulfilled'
    WHEN 'rejected' THEN 'Rejected'
    ELSE 'Pending'
  END;
$$;

-- ─── Unify item master ───────────────────────────────────────────────────────

ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS form TEXT,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS legacy_inventory_id TEXT;

-- Merge store_inventory rows into store_items (same id when possible)
INSERT INTO public.store_items (
  id, hospital_id, name, category, form, unit, current_stock, reorder_level,
  unit_cost, supplier, status, legacy_inventory_id, created_at, updated_at
)
SELECT
  si.id,
  si.hospital_id,
  si.name,
  coalesce(si.category, 'General'),
  si.form,
  coalesce(si.unit, 'Units'),
  coalesce(si.qty, 0),
  coalesce(si.reorder, 10),
  coalesce(si.unit_cost, 0),
  si.supplier,
  public.store_compute_status(si.qty, si.reorder),
  si.id,
  coalesce(si.created_at, now()),
  coalesce(si.updated_at, now())
FROM public.store_inventory si
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  form = coalesce(EXCLUDED.form, store_items.form),
  unit = EXCLUDED.unit,
  current_stock = GREATEST(store_items.current_stock, EXCLUDED.current_stock),
  reorder_level = EXCLUDED.reorder_level,
  unit_cost = CASE WHEN EXCLUDED.unit_cost > 0 THEN EXCLUDED.unit_cost ELSE store_items.unit_cost END,
  supplier = coalesce(EXCLUDED.supplier, store_items.supplier),
  status = public.store_compute_status(
    GREATEST(store_items.current_stock, EXCLUDED.current_stock),
    EXCLUDED.reorder_level
  ),
  legacy_inventory_id = EXCLUDED.legacy_inventory_id,
  updated_at = now();

-- ─── Stock movement ledger ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  item_id         TEXT NOT NULL,
  movement_type   TEXT NOT NULL
                    CHECK (movement_type IN ('receipt', 'issue', 'adjustment', 'transfer', 'return')),
  qty_delta       NUMERIC(12, 2) NOT NULL,
  qty_after       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reference_type  TEXT,
  reference_id    TEXT,
  department      TEXT,
  notes           TEXT,
  actor_id        UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_name      TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_movements_hospital_item
  ON public.store_stock_movements (hospital_id, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_movements_reference
  ON public.store_stock_movements (hospital_id, reference_type, reference_id);

-- ─── Requisitions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_requisitions (
  id                TEXT NOT NULL,
  hospital_id       UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  requisition_type  TEXT NOT NULL DEFAULT 'general'
                      CHECK (requisition_type IN ('general', 'pharmacy_restock')),
  department        TEXT NOT NULL DEFAULT '',
  requested_by      TEXT NOT NULL DEFAULT '',
  urgency           TEXT NOT NULL DEFAULT 'Routine',
  status            TEXT NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted', 'approved', 'partially_issued', 'fulfilled', 'rejected')),
  notes             TEXT,
  pharmacy_restock_id TEXT,
  fulfilled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, id)
);

CREATE TABLE IF NOT EXISTS public.store_requisition_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  requisition_id  TEXT NOT NULL,
  item_id         TEXT,
  item_name       TEXT NOT NULL,
  qty_requested   NUMERIC(12, 2) NOT NULL DEFAULT 1,
  qty_issued      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'Units',
  store_inventory_id TEXT,
  pharmacy_inventory_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, requisition_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_store_req_lines_req
  ON public.store_requisition_lines (hospital_id, requisition_id);

-- Backfill from legacy stock_requests
INSERT INTO public.store_requisitions (
  id, hospital_id, requisition_type, department, requested_by, urgency, status, notes, created_at, updated_at
)
SELECT
  sr.id,
  sr.hospital_id,
  'general',
  coalesce(sr.dept, ''),
  coalesce(sr.requested_by, ''),
  coalesce(sr.urgency, 'Routine'),
  public.store_map_legacy_req_status(sr.status),
  sr.notes,
  coalesce(sr.created_at, now()),
  coalesce(sr.created_at, now())
FROM public.stock_requests sr
ON CONFLICT (hospital_id, id) DO NOTHING;

INSERT INTO public.store_requisition_lines (
  hospital_id, requisition_id, item_name, qty_requested, qty_issued, unit
)
SELECT
  sr.hospital_id,
  sr.id,
  sr.item,
  coalesce(sr.qty, 1),
  CASE WHEN lower(sr.status) = 'fulfilled' THEN coalesce(sr.qty, 1) ELSE 0 END,
  coalesce(sr.unit, 'Units')
FROM public.stock_requests sr
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_requisition_lines l
  WHERE l.hospital_id = sr.hospital_id AND l.requisition_id = sr.id
);

-- ─── Procurement lines & GRN ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_po_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  po_id           TEXT NOT NULL,
  item_id         TEXT,
  item_name       TEXT NOT NULL,
  qty_ordered     NUMERIC(12, 2) NOT NULL DEFAULT 1,
  qty_received    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'Units',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_po_lines_po
  ON public.store_po_lines (hospital_id, po_id);

CREATE TABLE IF NOT EXISTS public.store_goods_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  grn_number      TEXT NOT NULL,
  po_id           TEXT NOT NULL,
  received_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  received_by_name TEXT NOT NULL DEFAULT '',
  notes           TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, grn_number)
);

CREATE TABLE IF NOT EXISTS public.store_grn_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  grn_id          UUID NOT NULL REFERENCES public.store_goods_receipts (id) ON DELETE CASCADE,
  po_line_id      UUID REFERENCES public.store_po_lines (id) ON DELETE SET NULL,
  item_id         TEXT,
  item_name       TEXT NOT NULL,
  qty_received    NUMERIC(12, 2) NOT NULL,
  unit_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill PO lines from legacy header-only POs
INSERT INTO public.store_po_lines (hospital_id, po_id, item_name, qty_ordered, unit_cost, unit)
SELECT
  po.hospital_id,
  po.id,
  coalesce(po.description, 'Procurement items'),
  CASE
    WHEN jsonb_typeof(po.items) = 'number' THEN (po.items #>> '{}')::numeric
    WHEN jsonb_typeof(po.items) = 'array' THEN GREATEST(jsonb_array_length(po.items), 1)
    ELSE 1
  END,
  coalesce(po.value, 0),
  'Units'
FROM public.store_pos po
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_po_lines pl
  WHERE pl.hospital_id = po.hospital_id AND pl.po_id = po.id
);

-- ─── Core RPC: post movement ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.store_post_movement(
  p_hospital_id UUID,
  p_item_id TEXT,
  p_qty_delta NUMERIC,
  p_movement_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.store_items%ROWTYPE;
  v_new_qty NUMERIC;
  v_movement_id UUID := gen_random_uuid();
BEGIN
  IF p_qty_delta = 0 THEN
    RAISE EXCEPTION 'Quantity delta cannot be zero';
  END IF;

  SELECT * INTO v_item
  FROM public.store_items
  WHERE hospital_id = p_hospital_id AND id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store item % not found', p_item_id;
  END IF;

  v_new_qty := greatest(coalesce(v_item.current_stock, 0) + p_qty_delta, 0);

  IF p_qty_delta < 0 AND (coalesce(v_item.current_stock, 0) + p_qty_delta) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for item % (on hand %, requested %)',
      p_item_id, v_item.current_stock, abs(p_qty_delta);
  END IF;

  UPDATE public.store_items
  SET current_stock = v_new_qty,
      status = public.store_compute_status(v_new_qty, v_item.reorder_level),
      updated_at = now()
  WHERE hospital_id = p_hospital_id AND id = p_item_id;

  INSERT INTO public.store_stock_movements (
    id, hospital_id, item_id, movement_type, qty_delta, qty_after,
    reference_type, reference_id, department, notes, actor_id, actor_name
  ) VALUES (
    v_movement_id, p_hospital_id, p_item_id, p_movement_type, p_qty_delta, v_new_qty,
    p_reference_type, p_reference_id, p_department, p_notes, p_actor_id, coalesce(p_actor_name, '')
  );

  -- Mirror legacy store_inventory when linked
  UPDATE public.store_inventory
  SET qty = v_new_qty::integer,
      status = CASE public.store_compute_status(v_new_qty, v_item.reorder_level)
        WHEN 'OK' THEN 'In Stock'
        WHEN 'Low Stock' THEN 'Low Stock'
        WHEN 'Critical' THEN 'Critical'
        ELSE 'Out of Stock'
      END,
      updated_at = now()
  WHERE hospital_id = p_hospital_id AND id = coalesce(v_item.legacy_inventory_id, p_item_id);

  RETURN jsonb_build_object(
    'movementId', v_movement_id,
    'itemId', p_item_id,
    'qtyAfter', v_new_qty
  );
END;
$$;

-- ─── RPC: issue requisition ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.store_issue_requisition(
  p_hospital_id UUID,
  p_requisition_id TEXT,
  p_issues JSONB,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.store_requisitions%ROWTYPE;
  v_issue JSONB;
  v_line_id UUID;
  v_item_id TEXT;
  v_qty NUMERIC;
  v_line public.store_requisition_lines%ROWTYPE;
  v_total_lines INT := 0;
  v_fulfilled_lines INT := 0;
BEGIN
  SELECT * INTO v_req
  FROM public.store_requisitions
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requisition % not found', p_requisition_id;
  END IF;

  IF v_req.status IN ('rejected', 'fulfilled') THEN
    RAISE EXCEPTION 'Requisition % cannot be issued (status=%)', p_requisition_id, v_req.status;
  END IF;

  FOR v_issue IN SELECT * FROM jsonb_array_elements(coalesce(p_issues, '[]'::jsonb))
  LOOP
    v_line_id := (v_issue->>'lineId')::uuid;
    v_qty := coalesce((v_issue->>'qty')::numeric, 0);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_line
    FROM public.store_requisition_lines
    WHERE id = v_line_id AND hospital_id = p_hospital_id AND requisition_id = p_requisition_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Requisition line % not found', v_line_id;
    END IF;

    v_item_id := coalesce(v_line.item_id, v_line.store_inventory_id);
    IF v_item_id IS NULL THEN
      SELECT si.id INTO v_item_id
      FROM public.store_items si
      WHERE si.hospital_id = p_hospital_id
        AND lower(si.name) = lower(v_line.item_name)
      LIMIT 1;
    END IF;

    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'No store item matched for line %', v_line.item_name;
    END IF;

    PERFORM public.store_post_movement(
      p_hospital_id, v_item_id, -v_qty, 'issue',
      'requisition', p_requisition_id, v_req.department,
      format('Issue for requisition %s', p_requisition_id),
      p_actor_id, p_actor_name
    );

    UPDATE public.store_requisition_lines
    SET qty_issued = qty_issued + v_qty,
        item_id = coalesce(item_id, v_item_id)
    WHERE id = v_line_id;
  END LOOP;

  SELECT count(*)::int, count(*) FILTER (WHERE qty_issued >= qty_requested)::int
  INTO v_total_lines, v_fulfilled_lines
  FROM public.store_requisition_lines
  WHERE hospital_id = p_hospital_id AND requisition_id = p_requisition_id;

  UPDATE public.store_requisitions
  SET status = CASE
        WHEN v_fulfilled_lines >= v_total_lines AND v_total_lines > 0 THEN 'fulfilled'
        WHEN v_fulfilled_lines > 0 THEN 'partially_issued'
        ELSE status
      END,
      fulfilled_at = CASE
        WHEN v_fulfilled_lines >= v_total_lines AND v_total_lines > 0 THEN now()
        ELSE fulfilled_at
      END,
      updated_at = now()
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id
  RETURNING * INTO v_req;

  -- Sync legacy stock_requests
  UPDATE public.stock_requests
  SET status = public.store_map_req_to_legacy(v_req.status)
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id;

  RETURN jsonb_build_object(
    'requisitionId', p_requisition_id,
    'status', v_req.status
  );
END;
$$;

-- ─── RPC: update requisition status ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.store_update_requisition_status(
  p_hospital_id UUID,
  p_requisition_id TEXT,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.store_requisitions%ROWTYPE;
BEGIN
  UPDATE public.store_requisitions
  SET status = p_status,
      notes = coalesce(p_notes, notes),
      updated_at = now()
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id
  RETURNING * INTO v_req;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requisition % not found', p_requisition_id;
  END IF;

  UPDATE public.stock_requests
  SET status = public.store_map_req_to_legacy(v_req.status),
      notes = coalesce(p_notes, notes)
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id;

  IF v_req.requisition_type = 'pharmacy_restock' AND v_req.pharmacy_restock_id IS NOT NULL THEN
    UPDATE public.pharmacy_restock_requests
    SET status = public.store_map_req_to_legacy(v_req.status),
        notes = coalesce(p_notes, notes)
    WHERE hospital_id = p_hospital_id AND id = v_req.pharmacy_restock_id;
  END IF;

  RETURN jsonb_build_object('requisitionId', p_requisition_id, 'status', v_req.status);
END;
$$;

-- ─── RPC: receive GRN ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.store_receive_grn(
  p_hospital_id UUID,
  p_po_id TEXT,
  p_lines JSONB,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po public.store_pos%ROWTYPE;
  v_grn_id UUID := gen_random_uuid();
  v_grn_number TEXT;
  v_line JSONB;
  v_po_line public.store_po_lines%ROWTYPE;
  v_item_id TEXT;
  v_qty NUMERIC;
  v_total_ordered NUMERIC := 0;
  v_total_received NUMERIC := 0;
BEGIN
  SELECT * INTO v_po
  FROM public.store_pos
  WHERE hospital_id = p_hospital_id AND id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO % not found', p_po_id;
  END IF;

  IF lower(v_po.status) IN ('cancelled', 'rejected', 'draft') THEN
    RAISE EXCEPTION 'PO % cannot receive goods (status=%)', p_po_id, v_po.status;
  END IF;

  v_grn_number := 'GRN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.store_goods_receipts (
    id, hospital_id, grn_number, po_id, received_by, received_by_name, notes
  ) VALUES (
    v_grn_id, p_hospital_id, v_grn_number, p_po_id, p_actor_id, coalesce(p_actor_name, ''), p_notes
  );

  FOR v_line IN SELECT * FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  LOOP
    v_qty := coalesce((v_line->>'qtyReceived')::numeric, 0);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    IF (v_line ? 'poLineId') THEN
      SELECT * INTO v_po_line
      FROM public.store_po_lines
      WHERE id = (v_line->>'poLineId')::uuid AND hospital_id = p_hospital_id
      FOR UPDATE;
    END IF;

    v_item_id := coalesce(v_line->>'itemId', v_po_line.item_id);
    IF v_item_id IS NULL AND v_po_line.id IS NOT NULL THEN
      SELECT si.id INTO v_item_id
      FROM public.store_items si
      WHERE si.hospital_id = p_hospital_id AND lower(si.name) = lower(v_po_line.item_name)
      LIMIT 1;
    END IF;

    IF v_item_id IS NULL AND (v_line ? 'itemName') THEN
      v_item_id := 'STR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      INSERT INTO public.store_items (
        id, hospital_id, name, category, unit, current_stock, reorder_level, status
      ) VALUES (
        v_item_id, p_hospital_id, v_line->>'itemName', 'General', 'Units', 0, 10, 'Out of Stock'
      );
    END IF;

    PERFORM public.store_post_movement(
      p_hospital_id, v_item_id, v_qty, 'receipt',
      'grn', v_grn_id::text, NULL,
      format('GRN %s for PO %s', v_grn_number, p_po_id),
      p_actor_id, p_actor_name
    );

    INSERT INTO public.store_grn_lines (
      hospital_id, grn_id, po_line_id, item_id, item_name, qty_received, unit_cost
    ) VALUES (
      p_hospital_id, v_grn_id, v_po_line.id,
      v_item_id,
      coalesce(v_line->>'itemName', v_po_line.item_name, 'Item'),
      v_qty,
      coalesce((v_line->>'unitCost')::numeric, v_po_line.unit_cost, 0)
    );

    IF v_po_line.id IS NOT NULL THEN
      UPDATE public.store_po_lines
      SET qty_received = qty_received + v_qty,
          item_id = coalesce(item_id, v_item_id)
      WHERE id = v_po_line.id;
    END IF;
  END LOOP;

  SELECT coalesce(sum(qty_ordered), 0), coalesce(sum(qty_received), 0)
  INTO v_total_ordered, v_total_received
  FROM public.store_po_lines
  WHERE hospital_id = p_hospital_id AND po_id = p_po_id;

  UPDATE public.store_pos
  SET status = CASE
        WHEN v_total_received <= 0 THEN status
        WHEN v_total_received >= v_total_ordered AND v_total_ordered > 0 THEN 'Received'
        ELSE 'partially_received'
      END,
      updated_at = now()
  WHERE hospital_id = p_hospital_id AND id = p_po_id;

  RETURN jsonb_build_object(
    'grnId', v_grn_id,
    'grnNumber', v_grn_number,
    'poId', p_po_id,
    'poStatus', (SELECT status FROM public.store_pos WHERE hospital_id = p_hospital_id AND id = p_po_id)
  );
END;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.store_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisition_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_grn_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_stock_movements' AND policyname = 'store_movements_tenant') THEN
    CREATE POLICY store_movements_tenant ON public.store_stock_movements
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_requisitions' AND policyname = 'store_req_tenant') THEN
    CREATE POLICY store_req_tenant ON public.store_requisitions
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_requisition_lines' AND policyname = 'store_req_lines_tenant') THEN
    CREATE POLICY store_req_lines_tenant ON public.store_requisition_lines
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_po_lines' AND policyname = 'store_po_lines_tenant') THEN
    CREATE POLICY store_po_lines_tenant ON public.store_po_lines
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_goods_receipts' AND policyname = 'store_grn_tenant') THEN
    CREATE POLICY store_grn_tenant ON public.store_goods_receipts
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_grn_lines' AND policyname = 'store_grn_lines_tenant') THEN
    CREATE POLICY store_grn_lines_tenant ON public.store_grn_lines
      FOR ALL TO authenticated
      USING (hospital_id = public.auth_hospital_id())
      WITH CHECK (hospital_id = public.auth_hospital_id());
  END IF;
END;
$$;

INSERT INTO public.role_permissions (role, permission) VALUES
  ('store_keeper', 'store:procurement:approve'),
  ('hod', 'store:procurement:approve'),
  ('admin', 'store:inventory:read'),
  ('admin', 'store:inventory:update'),
  ('admin', 'store:requests:read'),
  ('admin', 'store:requests:fulfill'),
  ('admin', 'store:procurement:create'),
  ('admin', 'store:procurement:approve')
ON CONFLICT (role, permission) DO NOTHING;
