CREATE OR REPLACE FUNCTION get_request_with_history(p_request_id bigint)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
           'requestId', r.id,                -- renamed from id
           'currentStatus', r.status,        -- renamed from status
           'customerId', r.customer_id,      -- renamed from customer_id
           'createdDate', r.created_at,      -- renamed from created_at
           'history',
             COALESCE(
               jsonb_agg(
                 jsonb_build_object(
                   'historyId', h.id,         -- renamed from id
                   'status', h.status,
                   'changedBy', h.changed_by, -- renamed from changed_by
                   'changedDate', h.changed_at,
                   'remarks', h.comment       -- renamed from comment
                 )
                 ORDER BY h.changed_at
               ) FILTER (WHERE h.id IS NOT NULL),
               '[]'::jsonb
             )
         )
  FROM request r
  LEFT JOIN request_history h ON h.request_id = r.id
  WHERE r.id = p_request_id
  GROUP BY r.id, r.status, r.customer_id, r.created_at;
$$;
