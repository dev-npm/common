CREATE OR REPLACE FUNCTION get_speednode_mapping_json(speed_node_id INT)
RETURNS JSONB AS $$
SELECT jsonb_build_object(
  'speedNode', jsonb_build_object('id', sn.id, 'name', sn.name),
  'mappings', jsonb_agg(
    jsonb_build_object(
      'library', jsonb_build_object('id', lib.id, 'name', lib.name),
      'tdk', jsonb_build_object('id', tdk.id, 'sdkVersion', tdk.sdk_version),
      'versions', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', lv.id,
          'version', lv.version,
          'releaseType', lv.release_type,
          'plannedDate', lv.planned_date
        ))
        FROM library_version lv
        WHERE lv.library_id = lib.id
          AND lv.tdk_id = tdk.id
          AND lv.speed_node_id = sn.id
      ), '[]'::jsonb)
    )
  )
)
FROM speed_node sn
JOIN speednode_library_tdk slt ON slt.speed_node_id = sn.id
JOIN library lib ON lib.id = slt.library_id
JOIN tech_design_kit tdk ON tdk.id = slt.tdk_id
WHERE sn.id = speed_node_id
GROUP BY sn.id, sn.name;
$$ LANGUAGE SQL;



public async Task<JsonDocument> GetSpeedNodeMappingsAsync(int speedNodeId)
{
    var connection = _context.Database.GetDbConnection();
    await connection.OpenAsync();

    using var command = connection.CreateCommand();
    command.CommandText = "SELECT get_speednode_mapping_json(@speed_node_id)";
    var param = command.CreateParameter();
    param.ParameterName = "@speed_node_id";
    param.Value = speedNodeId;
    command.Parameters.Add(param);

    using var reader = await command.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
        var json = reader.GetString(0);
        return JsonDocument.Parse(json);
    }

    return null;
}
