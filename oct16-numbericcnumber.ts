using System;
using System.Text.RegularExpressions;

public class NumberFormatter
{
    public static string NormalizeNumber(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Extract the numeric and alpha parts
        var match = Regex.Match(input, @"^([\d\.]+)([a-zA-Z]*)$");
        if (!match.Success)
            return input;

        string numericPart = match.Groups[1].Value;
        string alphaPart = match.Groups[2].Value;

        // Split by '.' and pad numeric segments
        var segments = numericPart.Split('.', StringSplitOptions.RemoveEmptyEntries);

        // Combine into a single string of max 3 digits
        string combined = string.Join("", segments).PadRight(3, '0');

        if (combined.Length > 3)
            combined = combined.Substring(0, 3);

        return combined + alphaPart.ToLower();
    }

    // Demo
    public static void Main()
    {
        Console.WriteLine(NormalizeNumber("0.1"));     // 010
        Console.WriteLine(NormalizeNumber("0.2"));     // 020
        Console.WriteLine(NormalizeNumber("0.9KA"));   // 090ka
        Console.WriteLine(NormalizeNumber("0.0.1"));   // 001
        Console.WriteLine(NormalizeNumber("1.1"));     // 110
        Console.WriteLine(NormalizeNumber("2.3B"));    // 230b
    }
}
