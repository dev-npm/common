CREATE OR REPLACE FUNCTION sync_customers_from_batch(
  p_batch_id       TEXT,
  p_process_texts  TEXT    -- e.g. '''P1'',''P2''' or '''P1'''
)
RETURNS JSONB AS $$
DECLARE
  v_texts       TEXT[];
  v_process_ids INT[];
  ins_names     TEXT[];
  upd_names     TEXT[];
  del_names     TEXT[];
  del_count     INT;
  up_count      INT;
BEGIN
  ----------------------------------------------------------------------
  -- 0) Parse the incoming quoted list into TEXT[] of process names
  --    Strip all single quotes, then split on commas.
  v_texts := string_to_array(
               replace(p_process_texts, '''', ''),
               ','
             );
  IF v_texts IS NULL OR array_length(v_texts,1) = 0 THEN
    RAISE EXCEPTION 'No process texts provided: %', p_process_texts;
  END IF;

  ----------------------------------------------------------------------
  -- 0b) Resolve those process names into process IDs
  SELECT array_agg(id)
    INTO v_process_ids
  FROM process
  WHERE name = ANY(v_texts);

  IF v_process_ids IS NULL OR array_length(v_process_ids,1) = 0 THEN
    RAISE EXCEPTION 'No matching processes for texts: %', p_process_texts;
  END IF;

  ----------------------------------------------------------------------
  -- 1) Upsert only staging rows for these processes; capture inserts vs updates
  WITH staging AS (
    SELECT
      r.customer_name,
      r.normalized_name,
      (SELECT id FROM supplier WHERE name = r.supplier_text) AS sup_id,
      (SELECT id FROM process  WHERE name = r.process_text)  AS proc_id
    FROM customer_raw_upload r
    WHERE r.upload_batch_id = p_batch_id
      AND r.process_text     = ANY(v_texts)
  ),
  upserted AS (
    INSERT INTO customer (
      customer_name,
      normalized_name,
      batch_id,
      customer_type_id,
      supplier_id,
      process_id,
      is_from_api,
      is_deleted,
      updated_at
    )
    SELECT
      s.customer_name,
      s.normalized_name,
      p_batch_id,
      2,          -- Planning
      s.sup_id,
      s.proc_id,
      TRUE,
      FALSE,
      NOW()
    FROM staging s
    ON CONFLICT (normalized_name, supplier_id, process_id)
    DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      batch_id      = EXCLUDED.batch_id,
      is_from_api   = TRUE,
      is_deleted    = FALSE,
      updated_at    = NOW()
    RETURNING customer_name, xmax
  )
  SELECT
    ARRAY_AGG(customer_name) FILTER (WHERE xmax = 0),
    ARRAY_AGG(customer_name) FILTER (WHERE xmax <> 0)
    INTO ins_names, upd_names
  FROM upserted;

  GET DIAGNOSTICS up_count = ROW_COUNT;

  ----------------------------------------------------------------------
  -- 2) Reactivate project mappings for upserted customers
  UPDATE customer_project_map m
  SET active = TRUE
  FROM customer c
  WHERE m.customer_id = c.customer_id
    AND c.batch_id    = p_batch_id
    AND c.process_id  = ANY(v_process_ids);

  ----------------------------------------------------------------------
  -- 3) Identify which (name,process) pairs are now missing → to delete
  SELECT ARRAY_AGG(c.customer_name)
    INTO del_names
  FROM customer c
  WHERE c.customer_type_id = 2
    AND c.is_from_api      = TRUE
    AND c.process_id       = ANY(v_process_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM customer_raw_upload r
      WHERE r.upload_batch_id = p_batch_id
        AND r.process_text    = ANY(v_texts)
        AND r.normalized_name = c.normalized_name
    );

  ----------------------------------------------------------------------
  -- 4) Soft-delete those missing API customers
  UPDATE customer c
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE c.customer_type_id = 2
    AND c.is_from_api      = TRUE
    AND c.process_id       = ANY(v_process_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM customer_raw_upload r
      WHERE r.upload_batch_id = p_batch_id
        AND r.process_text    = ANY(v_texts)
        AND r.normalized_name = c.normalized_name
    );

  GET DIAGNOSTICS del_count = ROW_COUNT;

  ----------------------------------------------------------------------
  -- 5) Inactivate project mappings for soft-deleted customers
  UPDATE customer_project_map m
  SET active = FALSE
  FROM customer c
  WHERE m.customer_id     = c.customer_id
    AND c.customer_type_id = 2
    AND c.is_from_api      = TRUE
    AND c.is_deleted       = TRUE
    AND c.process_id       = ANY(v_process_ids);

  ----------------------------------------------------------------------
  -- 6) Return JSON summary
  RETURN JSONB_BUILD_OBJECT(
    'inserted_count',  COALESCE(array_length(ins_names,1),0),
    'updated_count',   COALESCE(array_length(upd_names,1),0),
    'deleted_count',   COALESCE(del_count,0),
    'inserted_names',  ins_names,
    'updated_names',   upd_names,
    'deleted_names',   del_names
  );
END;
$$ LANGUAGE plpgsql;
***************88888

CREATE OR REPLACE FUNCTION sync_customers_from_batch(
  p_batch_id       TEXT,
  p_process_texts  TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_texts       TEXT[];
  v_process_ids INT[];
  …  
BEGIN
  -- DEBUG: show what the raw input was
  RAISE NOTICE 'Input p_process_texts = %', p_process_texts;

  -- 0) parse into TEXT[]
  v_texts := string_to_array(
               replace(p_process_texts, '''', ''),  -- strip all single-quotes
               ','
             );
  RAISE NOTICE 'Parsed v_texts[] = %', array_to_string(v_texts, ',');  -- e.g. P1,P2

  -- 0b) resolve to IDs
  SELECT array_agg(id)
    INTO v_process_ids
  FROM process
  WHERE name = ANY(v_texts);
  RAISE NOTICE 'Resolved v_process_ids[] = %', array_to_string(v_process_ids::text[], ',');  

  … your existing logic …

END;
$$ LANGUAGE plpgsql;



8888888888888888
-- 0) Parse & trim p_process_texts into a clean TEXT[] of names
v_texts := (
  SELECT ARRAY_AGG(trim(both FROM part))
  FROM unnest(
         string_to_array(
           replace(p_process_texts, '''', ''),  -- remove quotes
           ','
         )
       ) AS part
);

RAISE NOTICE 'Parsed & trimmed v_texts[] = %',
             array_to_string(v_texts, ',');

-- 0b) Resolve to IDs
SELECT array_agg(id)
  INTO v_process_ids
FROM process
WHERE name = ANY(v_texts);

RAISE NOTICE 'Resolved v_process_ids[] = %',
             array_to_string(v_process_ids::text[], ',');
