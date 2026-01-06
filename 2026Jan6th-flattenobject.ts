private static void FlattenItemsInPlace(JObject root)
{
    // Get Items array
    if (root["Items"] is not JArray items)
        return;

    var flattenedItems = new JArray();

    foreach (JObject item in items)
    {
        var flat = new JObject();

        // Copy all non-dynamic properties
        foreach (var prop in item.Properties())
        {
            if (prop.Name != "DynamicProperties")
            {
                flat[prop.Name] = prop.Value;
            }
        }

        // Merge DynamicProperties into root of item
        if (item["DynamicProperties"] is JObject dyn)
        {
            foreach (var dp in dyn.Properties())
            {
                // Prevent overwrite of known fields
                if (flat[dp.Name] == null)
                {
                    flat[dp.Name] = dp.Value;
                }
            }
        }

        flattenedItems.Add(flat);
    }

    // Replace Items only
    root["Items"] = flattenedItems;

    // ❗ LegendItems remains untouched in root
}
