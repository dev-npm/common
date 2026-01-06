using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Linq;

public class Program
{
    public static void Main()
    {
        string jsonInput = @"{
          ""Items"": [
            { ""Id"": ""1"", ""Name"": ""Item A"", ""Color"": ""Red"", ""Size"": ""Large"" },
            { ""Id"": ""2"", ""Name"": ""Item B"", ""Weight"": 3.4, ""Color"": ""Blue"" }
          ],
          ""LegendItems"": [
            { ""Key"": ""Color"", ""Description"": ""The color of the item"" }
          ]
        }";

        // Parse
        JsonNode root = JsonNode.Parse(jsonInput)!;

        // Flatten Items to List<Dictionary<string, object>>
        var flatItems = new List<Dictionary<string, object>>();

        foreach (var item in root["Items"].AsArray())
        {
            var dict = new Dictionary<string, object>();

            foreach (var prop in item.AsObject())
            {
                dict[prop.Key] = ExtractValue(prop.Value);
            }

            flatItems.Add(dict);
        }

        // Deserialize LegendItems
        var legendItems = root["LegendItems"].Deserialize<List<LegendItemDto>>() ?? new();

        // Compose final output
        var output = new
        {
            Items = flatItems,
            LegendItems = legendItems
        };

        // Serialize result
        var finalJson = JsonSerializer.Serialize(output, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        Console.WriteLine(finalJson);
    }

    // Legend DTO
    public class LegendItemDto
    {
        public string Key { get; set; }
        public string Description { get; set; }
    }

    // Simple value extractor
    private static object? ExtractValue(JsonNode? node)
    {
        return node?.GetValueKind() switch
        {
            JsonValueKind.Number => node.GetValue<double>(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => node.GetValue<string>(),
            _ => node?.ToString()
        };
    }
}
