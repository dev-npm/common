public static Dictionary<string, object> FlattenObject(object item, Dictionary<string, object> dynamicValues)
{
    var result = new Dictionary<string, object>();

    // A. AUTOMATICALLY copy all Static Properties (ItemData, Priority, etc.)
    // We use Reflection to scan the object so you don't have to type them manually.
    foreach (var prop in item.GetType().GetProperties())
    {
        // Skip the dictionary property itself to avoid infinite recursion
        if (prop.Name == "DynamicAttributes") continue;

        var value = prop.GetValue(item);
        
        // Add to result (using camelCase for the key if you prefer)
        result[prop.Name] = value; 
    }

    // B. Merge the Dynamic Values
    if (dynamicValues != null)
    {
        foreach (var kvp in dynamicValues)
        {
            result[kvp.Key] = kvp.Value;
        }
    }

    return result;
}
