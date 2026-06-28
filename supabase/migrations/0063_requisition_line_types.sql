-- Catalog vs non-catalog requisition lines

ALTER TABLE public.store_requisition_lines
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'catalog'
    CHECK (line_type IN ('catalog', 'non_catalog')),
  ADD COLUMN IF NOT EXISTS justification TEXT,
  ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (line_status IN ('pending', 'issued', 'procurement'));

UPDATE public.store_requisition_lines
SET line_type = 'non_catalog'
WHERE item_id IS NULL AND store_inventory_id IS NULL;

UPDATE public.store_requisition_lines
SET line_status = 'issued'
WHERE qty_issued >= qty_requested AND qty_requested > 0;

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
  v_done_lines INT := 0;
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

    IF v_line.line_type = 'non_catalog'
       AND v_line.item_id IS NULL
       AND v_line.store_inventory_id IS NULL THEN
      RAISE EXCEPTION 'Line % is non-catalog and not linked to a store item yet', v_line.item_name;
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
        item_id = coalesce(item_id, v_item_id),
        store_inventory_id = coalesce(store_inventory_id, v_item_id),
        line_status = CASE
          WHEN qty_issued + v_qty >= qty_requested THEN 'issued'
          ELSE line_status
        END
    WHERE id = v_line_id;
  END LOOP;

  SELECT count(*)::int,
         count(*) FILTER (
           WHERE line_status = 'procurement'
             OR qty_issued >= qty_requested
         )::int
  INTO v_total_lines, v_done_lines
  FROM public.store_requisition_lines
  WHERE hospital_id = p_hospital_id AND requisition_id = p_requisition_id;

  UPDATE public.store_requisitions
  SET status = CASE
        WHEN v_done_lines >= v_total_lines AND v_total_lines > 0 THEN 'fulfilled'
        WHEN EXISTS (
          SELECT 1 FROM public.store_requisition_lines
          WHERE hospital_id = p_hospital_id AND requisition_id = p_requisition_id
            AND (qty_issued > 0 OR line_status IN ('issued', 'procurement'))
        ) THEN 'partially_issued'
        ELSE status
      END,
      fulfilled_at = CASE
        WHEN v_done_lines >= v_total_lines AND v_total_lines > 0 THEN now()
        ELSE fulfilled_at
      END,
      updated_at = now()
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id
  RETURNING * INTO v_req;

  UPDATE public.stock_requests
  SET status = public.store_map_req_to_legacy(v_req.status)
  WHERE hospital_id = p_hospital_id AND id = p_requisition_id;

  RETURN jsonb_build_object(
    'requisitionId', p_requisition_id,
    'status', v_req.status
  );
END;
$$;
