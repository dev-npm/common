CREATE OR REPLACE FUNCTION get_speednode_mapping_json(speed_node_id INT)
RETURNS jsonb AS
$$
WITH rows AS (
  SELECT
    sn.id              AS sn_id,
    sn.name            AS sn_name,
    lib.id             AS lib_id,
    lib.name           AS lib_name,
    tdk.id             AS tdk_id,
    tdk.sdk_version    AS sdk_version,
    lv.id              AS lv_id,
    lv.version         AS lv_version,
    lv.release_type    AS lv_release_type,
    lv.planned_date    AS lv_planned_date
  FROM speed_node sn
  JOIN speednode_library_tdk slt ON slt.speed_node_id = sn.id
  JOIN library lib               ON lib.id = slt.library_id
  JOIN tech_design_kit tdk       ON tdk.id = slt.tdk_id
  LEFT JOIN library_version lv
         ON lv.speed_node_id = sn.id
        AND lv.library_id    = lib.id
        AND lv.tdk_id        = tdk.id
  WHERE sn.id = speed_node_id
),
mappings AS (
  SELECT
    sn_id, sn_name, lib_id, lib_name, tdk_id, sdk_version,
    /* Build versions array from the SAME joined rows */
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id',          lv_id,
          'version',     lv_version,
          'releaseType', lv_release_type,
          'plannedDate', lv_planned_date
        )
        ORDER BY lv_version
      ) FILTER (WHERE lv_id IS NOT NULL),
      '[]'::jsonb
    ) AS versions
  FROM rows
  GROUP BY sn_id, sn_name, lib_id, lib_name, tdk_id, sdk_version
)
SELECT jsonb_build_object(
  'speedNode', jsonb_build_object('id', m.sn_id, 'name', m.sn_name),
  'mappings',  jsonb_agg(
                 jsonb_build_object(
                   'library',  jsonb_build_object('id', m.lib_id, 'name', m.lib_name),
                   'tdk',      jsonb_build_object('id', m.tdk_id, 'sdkVersion', m.sdk_version),
                   'versions', m.versions
                 )
                 ORDER BY m.lib_name, m.sdk_version
               )
)
FROM mappings m
GROUP BY m.sn_id, m.sn_name;
$$ LANGUAGE SQL;
