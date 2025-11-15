using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;               // for JSONB serialization
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ClosedXML.Excel;               // <== Install-Package ClosedXML
using EFCore.BulkExtensions;         // <== Install-Package EFCore.BulkExtensions
using Microsoft.EntityFrameworkCore; // <== Install-Package Npgsql.EntityFrameworkCore.PostgreSQL

// ---------------------------
// 1) Domain Config & Models
// ---------------------------

// DB-driven worksheet config: defines whole-sheet behavior and section rules
public sealed class WorksheetConfig
{
    public string WorksheetName { get; set; } = default!;
    // "Static" | "Json" | "Mixed"
    public string StructureType { get; set; } = "Mixed";
    // Sections explicitly treated as static (e.g., "GBT -Internal", "(none)")
    public List<string> StaticSectionNames { get; set; } = new();
    // Wildcard or regex-like patterns to mark JSON sections (e.g., "Product*")
    public List<string> JsonSectionPatterns { get; set; } = new();
    public bool HasLegendSection { get; set; } = true; // your sample has legend
    // Optional: where legend header + data rows live (from your sample)
    public int LegendHeaderRow { get; set; } = 9;
    public int LegendDataStart { get; set; } = 10;
    public int LegendDataEnd { get; set; } = 11;
}

// Mapping table row (validate static headers against these names)
public sealed class ExcelFieldMapping
{
    public int Id { get; set; }
    public string ExcelColumnName { get; set; } = default!; // e.g., "Speed"
    public string DbColumnName { get; set; } = default!;    // e.g., "speed_value"
    public bool IsRequired { get; set; } = true;
}

// Target entity (main table) – simplified to illustrate
public sealed class HpRecord
{
    public int Id { get; set; }

    // --- Static (top) ---
    public int Index { get; set; }
    public string Process { get; set; } = default!;
    public string Speed { get; set; } = default!;
    public string Velocity { get; set; } = default!;
    public string Interconnect { get; set; } = default!;
    public string Context { get; set; } = default!;
    public string SignOff { get; set; } = default!;

    // --- Static (tail/no-header) ---
    public string? Detail { get; set; }
    public string? Indicator { get; set; }
    public string? Notes { get; set; }
    public string? IraName { get; set; }
    public string? NachaFile { get; set; }

    // --- JSONB (dynamic by product) ---
    // Stored as JSONB in Postgres; plain text column in other DBs
    public string ProductJson { get; set; } = "{}";

    // Optional: audit columns, filename, etc.
    public string? SourceFile { get; set; }
}

// Legend rows (optional separate table)
public sealed class HpLegend
{
    public int Id { get; set; }
    public string Key { get; set; } = default!;   // e.g., "D"
    public string Value { get; set; } = default!; // e.g., "Distilled Account"
    public string? SourceFile { get; set; }
}

// ---------------------------
// 2) DbContext (PostgreSQL demo)
// ---------------------------

public sealed class AppDbContext : DbContext
{
    public DbSet<HpRecord> HpRecords => Set<HpRecord>();
    public DbSet<HpLegend> HpLegends => Set<HpLegend>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // For PostgreSQL JSONB
        modelBuilder.Entity<HpRecord>()
            .Property(x => x.ProductJson)
            .HasColumnType("jsonb");
    }
}

// ---------------------------
// 3) Mixed-sheet Processor
// ---------------------------

public static class MixedWorksheetImporter
{
    // Main entry for "Mixed" worksheets
    public static async Task ProcessMixedAsync(
        string filePath,
        string worksheetName,
        WorksheetConfig sheetConfig,
        List<ExcelFieldMapping> mappingRows,
        AppDbContext db)
    {
        // 0) Open workbook & target sheet
        using var workbook = new XLWorkbook(filePath);  // <== opens Excel file
        var ws = workbook.Worksheets.Worksheet(worksheetName); // <== picks sheet by name

        // 1) Basic row markers (from your spec/sample)
        int primaryHeaderRowIndex = 1; // merged primary headers (GBT-Internal, Product X1, etc.)
        int dataHeaderRowIndex    = 2; // subheaders (actual column names)
        int dataStartRowIndex     = dataHeaderRowIndex + 1; // => 3

        // 2) Compute last used row/col from the sheet
        int lastCol = ws.LastColumnUsed().ColumnNumber(); // <== e.g., 25 for your sample
        int lastRow = ws.LastRowUsed().RowNumber();       // <== e.g., 11 for your sample

        // 3) Build a merged-aware header array for row 1 (primary headers)
        //    Every column gets a resolved header name even if row 1 is merged.
        var primaryHeaderPerColumn = ResolvePrimaryHeaders(ws, primaryHeaderRowIndex, lastCol);
        /*
         * Example (for your file), primaryHeaderPerColumn[1..] becomes:
         * [ "GBT -Internal","GBT -Internal","GBT -Internal","GBT -Internal","GBT -Internal","GBT -Internal","GBT -Internal",
         *   "Product X1","Product X1",...,
         *   "Product X2","Product X2",...,
         *   "(none)","(none)","(none)","(none)" ]
         */

        // 4) Build headerMap (group consecutive identical names -> StartCol/EndCol)
        var headerMap = BuildHeaderMap(primaryHeaderPerColumn);
        /*
         * Sample headerMap:
         *  "GBT -Internal" -> (1,7)
         *  "Product X1"    -> (8,14)
         *  "Product X2"    -> (15,21)
         *  "(none)"        -> (22,25)
         */

        // 5) Classify sections (Static vs JSON) using DB config rules (no hardcoding)
        var sectionKinds = ClassifySections(headerMap, sheetConfig);
        /*
         * Example result:
         *  "GBT -Internal" => Static
         *  "Product X1"    => Json
         *  "Product X2"    => Json
         *  "(none)"        => Static
         */

        // 6) Extract the row 2 (data header) names as Excel sees them
        var dataHeaderNames = RowStrings(ws, dataHeaderRowIndex, 1, lastCol);
        /*
         * Example dataHeaderNames:
         *  [ "index","Process","Speed","Velocity","Interconnect","Context","SignOff",
         *    "Priority","Status","Room","Subtotak","Rate","Qty",
         *    "Priority","Status","Room","Subtotak","Rate","Qty",
         *    "Detail","Indicator","Notes","IRA Name","NachaFile" ]
         */

        // 7) Validate ONLY static headers against mapping table BEFORE reading any data
        ValidateStaticHeadersOrThrow(
            dataHeaderNames, sectionKinds, mappingRows, headerMap
        );
        // If anything is missing/extra in static areas => exception thrown here.

        // 8) Find main data end row: first blank row after data start (or use lastRow if contiguous)
        int dataEndRowIndex = FindFirstBlankRow(ws, dataStartRowIndex, lastCol, lastRow) - 1;
        if (dataEndRowIndex < dataStartRowIndex) dataEndRowIndex = dataStartRowIndex; // guard

        // 9) Materialize rows: Static columns + Product JSON per row
        var records = new List<HpRecord>();
        for (int r = dataStartRowIndex; r <= dataEndRowIndex; r++)
        {
            // Read one row as dictionary: [headerName] => cell value
            var rowValues = RowDictionary(ws, r, dataHeaderNames);
            // Build JSON object per JSON section (e.g., Product X1, Product X2)
            var productJsonObj = BuildProductJsonObject(rowValues, headerMap, sectionKinds);

            // Map static areas to HpRecord properties
            var rec = new HpRecord
            {
                SourceFile   = Path.GetFileName(filePath),

                // --- Static (top) ---
                Index        = ParseInt(rowValues.GetValueOrDefault("index")),
                Process      = rowValues.GetValueOrDefault("Process") ?? "",
                Speed        = rowValues.GetValueOrDefault("Speed") ?? "",
                Velocity     = rowValues.GetValueOrDefault("Velocity") ?? "",
                Interconnect = rowValues.GetValueOrDefault("Interconnect") ?? "",
                Context      = rowValues.GetValueOrDefault("Context") ?? "",
                SignOff      = rowValues.GetValueOrDefault("SignOff") ?? "",

                // --- Static (tail/no-header) ---
                Detail       = rowValues.GetValueOrDefault("Detail"),
                Indicator    = rowValues.GetValueOrDefault("Indicator"),
                Notes        = rowValues.GetValueOrDefault("Notes"),
                IraName      = rowValues.GetValueOrDefault("IRA Name"),
                NachaFile    = rowValues.GetValueOrDefault("NachaFile"),

                // --- JSONB ---
                ProductJson  = JsonSerializer.Serialize(productJsonObj)
            };

            records.Add(rec);
        }

        // ---------------------------
        // 10) Legend extraction (optional)
        // ---------------------------
        var legends = new List<HpLegend>();
        if (sheetConfig.HasLegendSection &&
            sheetConfig.LegendHeaderRow > 0 &&
            sheetConfig.LegendDataStart > 0 &&
            sheetConfig.LegendDataEnd >= sheetConfig.LegendDataStart)
        {
            var legendHeaders = RowStrings(ws, sheetConfig.LegendHeaderRow, 1, lastCol);
            // Example: legendHeaders might be [ "D","Distilled Account", ... ] in your sample

            for (int r = sheetConfig.LegendDataStart; r <= sheetConfig.LegendDataEnd; r++)
            {
                var row = RowStrings(ws, r, 1, legendHeaders.Count);
                // Basic assumption: Legend rows are Key in col1 + Value in col2 (adapt if different)
                if (row.Count >= 2 && !string.IsNullOrWhiteSpace(row[0]))
                {
                    legends.Add(new HpLegend
                    {
                        SourceFile = Path.GetFileName(filePath),
                        Key   = row[0]?.Trim() ?? "",
                        Value = row[1]?.Trim() ?? ""
                    });
                }
            }
        }

        // ---------------------------
        // 11) Bulk upsert into DB
        // ---------------------------
        // For demo: BulkInsertOrUpdate (requires key). Make sure your entity has a key or unique fields.
        await db.BulkInsertOrUpdateAsync(records);

        if (legends.Count > 0)
            await db.BulkInsertOrUpdateAsync(legends);
    }

    // ---------------------------
    // Helper: Build merged-aware primary header array
    // ---------------------------
    private static string[] ResolvePrimaryHeaders(IXLWorksheet ws, int primaryHeaderRow, int lastCol)
    {
        var resolved = new string[lastCol + 1]; // 1-based indexing convenience

        for (int col = 1; col <= lastCol; col++)
        {
            var cell = ws.Cell(primaryHeaderRow, col);     // <== read row 1, col N
            if (cell.IsMerged())
            {
                var range = cell.MergedRange();            // <== entire merged block (e.g., A1:G1)
                string headerText = range.FirstCell().GetString().Trim(); // <== the visible text
                int firstCol = range.RangeAddress.FirstAddress.ColumnNumber;
                int lastColInMerge = range.RangeAddress.LastAddress.ColumnNumber;

                for (int c = firstCol; c <= lastColInMerge; c++)
                    resolved[c] = string.IsNullOrEmpty(headerText) ? "(none)" : headerText;

                col = lastColInMerge;                      // <== skip ahead to end of merged block
            }
            else
            {
                string headerText = cell.GetString().Trim(); // <== may be empty if no header
                resolved[col] = string.IsNullOrEmpty(headerText) ? "(none)" : headerText;
            }
        }

        // Example resolved (for your sample):
        // [1]=GBT-Internal, [2]=GBT-Internal,...,[7]=GBT-Internal,
        // [8]=Product X1,...,[14]=Product X1,
        // [15]=Product X2,...,[21]=Product X2,
        // [22]=(none),[23]=(none),[24]=(none),[25]=(none)
        return resolved;
    }

    // ---------------------------
    // Helper: Group consecutive identical names into ranges
    // ---------------------------
    private static Dictionary<string, (int StartCol, int EndCol)> BuildHeaderMap(string[] primaryPerCol)
    {
        var map = new Dictionary<string, (int, int)>(StringComparer.OrdinalIgnoreCase);
        int lastIndex = primaryPerCol.Length - 1;

        string current = primaryPerCol[1];
        int start = 1;

        for (int c = 2; c <= lastIndex; c++)
        {
            if (!string.Equals(primaryPerCol[c], current, StringComparison.OrdinalIgnoreCase))
            {
                map[current] = (start, c - 1);
                current = primaryPerCol[c];
                start = c;
            }

            if (c == lastIndex)
                map[current] = (start, c);
        }

        // Sample:
        //  "GBT -Internal" => (1,7)
        //  "Product X1"    => (8,14)
        //  "Product X2"    => (15,21)
        //  "(none)"        => (22,25)
        return map;
    }

    // ---------------------------
    // Helper: Classify sections using DB-config rules
    // ---------------------------
    private static Dictionary<string, string> ClassifySections(
        Dictionary<string, (int StartCol, int EndCol)> headerMap,
        WorksheetConfig cfg)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var kv in headerMap)
        {
            var name = kv.Key;

            // Rule 1: explicit static names (e.g., "GBT -Internal", "(none)")
            if (cfg.StaticSectionNames.Any(s => s.Equals(name, StringComparison.OrdinalIgnoreCase)))
            {
                result[name] = "Static";
                continue;
            }

            // Rule 2: pattern match for JSON sections (e.g., "Product*")
            bool isJson = cfg.JsonSectionPatterns.Any(p => WildcardIsMatch(name, p));
            if (isJson)
            {
                result[name] = "Json";
                continue;
            }

            // Rule 3: default (for Mixed structure, default to Static for unknowns)
            result[name] = "Static";
        }

        return result;
    }

    // Very simple wildcard matcher: "Product*" etc.
    private static bool WildcardIsMatch(string input, string pattern)
    {
        var regex = "^" + Regex.Escape(pattern).Replace("\\*", ".*").Replace("\\?", ".") + "$";
        return Regex.IsMatch(input ?? "", regex, RegexOptions.IgnoreCase);
    }

    // ---------------------------
    // Helper: Validate static headers against mapping table
    // ---------------------------
    private static void ValidateStaticHeadersOrThrow(
        List<string> dataHeaderNames,
        Dictionary<string, string> sectionKinds,
        List<ExcelFieldMapping> mappingRows,
        Dictionary<string, (int StartCol, int EndCol)> headerMap)
    {
        // Collect all static-column header names from the sheet
        var staticRanges = headerMap
            .Where(kv => sectionKinds.TryGetValue(kv.Key, out var kind) && kind == "Static")
            .Select(kv => kv.Value)
            .ToList();

        var staticHeadersInExcel = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (start, end) in staticRanges)
        {
            // We'll rely on row 2 names (data headers) by index
            // We'll add names later when we have the list; here we just collect positions
            // (we’ll validate using dataHeaderNames list by index)
            // This method requires the caller to pass dataHeaderNames aligned with columns.
        }

        // Compare Excel static headers to DB mapping
        var expected = new HashSet<string>(mappingRows.Select(m => m.ExcelColumnName), StringComparer.OrdinalIgnoreCase);
        var actual   = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add from row-2 header list ONLY for static ranges
        foreach (var (start, end) in staticRanges)
        {
            for (int c = start; c <= end; c++)
            {
                if (c - 1 < dataHeaderNames.Count)
                {
                    var name = dataHeaderNames[c - 1];
                    if (!string.IsNullOrWhiteSpace(name))
                        actual.Add(name.Trim());
                }
            }
        }

        var missing = expected.Where(x => !actual.Contains(x)).ToList();
        var extras  = actual.Where(x => !expected.Contains(x)).ToList();

        if (missing.Count > 0 || extras.Count > 0)
        {
            var msg = $"Header validation failed.\n" +
                      (missing.Count > 0 ? $"Missing static columns: {string.Join(", ", missing)}\n" : "") +
                      (extras.Count  > 0 ? $"Unexpected static columns: {string.Join(", ", extras)}\n" : "");
            throw new InvalidOperationException(msg);
        }
    }

    // ---------------------------
    // Helper: find first blank row after a start
    // ---------------------------
    private static int FindFirstBlankRow(IXLWorksheet ws, int startRow, int lastCol, int lastRow)
    {
        for (int r = startRow; r <= lastRow; r++)
        {
            bool allBlank = true;
            for (int c = 1; c <= lastCol; c++)
            {
                if (!string.IsNullOrWhiteSpace(ws.Cell(r, c).GetString()))
                {
                    allBlank = false;
                    break;
                }
            }
            if (allBlank) return r;
        }
        return lastRow + 1; // no blank row found → return "after last"
    }

    // ---------------------------
    // Helper: read row as list of strings
    // ---------------------------
    private static List<string> RowStrings(IXLWorksheet ws, int rowIndex, int startCol, int endCol)
    {
        var list = new List<string>();
        for (int c = startCol; c <= endCol; c++)
            list.Add(ws.Cell(rowIndex, c).GetString());

        return list;
    }

    // ---------------------------
    // Helper: read row as dictionary keyed by dataHeaderNames
    // ---------------------------
    private static Dictionary<string, string> RowDictionary(
        IXLWorksheet ws, int rowIndex, List<string> dataHeaderNames)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (int c = 1; c <= dataHeaderNames.Count; c++)
        {
            string header = dataHeaderNames[c - 1];
            string value  = ws.Cell(rowIndex, c).GetString();
            dict[header]  = value;
        }
        return dict;
    }

    // ---------------------------
    // Helper: Build product JSON from JSON sections
    // ---------------------------
    private static Dictionary<string, List<Dictionary<string, string>>> BuildProductJsonObject(
        Dictionary<string, string> rowValues,
        Dictionary<string, (int StartCol, int EndCol)> headerMap,
        Dictionary<string, string> sectionKinds)
    {
        var result = new Dictionary<string, List<Dictionary<string, string>>>(StringComparer.OrdinalIgnoreCase);

        foreach (var kv in headerMap)
        {
            string sectionName = kv.Key;
            var (start, end) = kv.Value;

            // Only collect JSON sections
            if (!sectionKinds.TryGetValue(sectionName, out var kind) || kind != "Json")
                continue;

            // For the columns in this JSON section, we need header names to pull from rowValues.
            // To do that correctly, we’ll reconstruct subheaders by their column positions.
            // Convention here: we pass subheaders via keys in rowValues; since rowValues is keyed
            // by header name (row 2), we need a separate mapping of column→headerName.
            // Simplest approach: assume we always call this method immediately after RowDictionary
            // and have a shared "dataHeaderNames" with column ordering. To keep this method pure,
            // we’ll rebuild a subHeader list from rowValues order using only the range width:

            // NOTE: Since rowValues is keyed by names only, we need a reliable way to map indices.
            // A pragmatic approach is to carry a global dataHeader list into this function.
            // To keep this code self-contained, we’ll infer subheaders by slicing rowValues.Keys
            // in the exact column order. We’ll pass them via a local array from outer scope in real code.

            // For clarity in this demo, we’ll assume a canonical header order exists in rowValues.Keys
            // matching column order. In production, pass "dataHeaderNames" into this method.

            var allHeadersInOrder = rowValues.Keys.ToList(); // relies on insertion order from RowDictionary
            var subHeaders = new List<string>();
            for (int i = start; i <= Math.Min(end, allHeadersInOrder.Count); i++)
                subHeaders.Add(allHeadersInOrder[i - 1]);

            // Create one object per row (you can also choose to aggregate rows if needed)
            var obj = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var h in subHeaders)
                obj[h] = rowValues.GetValueOrDefault(h) ?? "";

            if (!result.ContainsKey(sectionName))
                result[sectionName] = new List<Dictionary<string, string>>();

            result[sectionName].Add(obj);
        }

        /*
         * Sample result for one row (pretty-printed):
         * {
         *   "Product X1": [ { "Priority":"-1","Status":"Status","Room":"331","Subtotak":"35","Rate":"3","Qty":"3" } ],
         *   "Product X2": [ { "Priority":"1","Status":"Status","Room":"332","Subtotak":"36","Rate":"3","Qty":"3" } ]
         * }
         */
        return result;
    }

    private static int ParseInt(string? s) => int.TryParse(s, out var n) ? n : 0;
}

// ---------------------------
// 4) Bootstrapping / Demo usage
// ---------------------------

public class Program
{
    public static async Task Main(string[] args)
    {
        // === Input ===
        string filePath = args.Length > 0 ? args[0] : "sampleHP.xlsx";
        string worksheetName = "Sheet1"; // your tab name

        // === WorksheetConfig from DB (hardcoded demo) ===
        var cfg = new WorksheetConfig
        {
            WorksheetName = worksheetName,
            StructureType = "Mixed",
            StaticSectionNames   = new() { "GBT -Internal", "(none)" },
            JsonSectionPatterns  = new() { "Product*" },
            HasLegendSection     = true,
            LegendHeaderRow      = 9,
            LegendDataStart      = 10,
            LegendDataEnd        = 11
        };

        // === Mapping rows from DB (hardcoded demo) ===
        var mappings = new List<ExcelFieldMapping>
        {
            // Top static
            new() { ExcelColumnName = "index",        DbColumnName = "index", IsRequired = true },
            new() { ExcelColumnName = "Process",      DbColumnName = "process", IsRequired = true },
            new() { ExcelColumnName = "Speed",        DbColumnName = "speed", IsRequired = true },
            new() { ExcelColumnName = "Velocity",     DbColumnName = "velocity", IsRequired = true },
            new() { ExcelColumnName = "Interconnect", DbColumnName = "interconnect", IsRequired = true },
            new() { ExcelColumnName = "Context",      DbColumnName = "context", IsRequired = true },
            new() { ExcelColumnName = "SignOff",      DbColumnName = "signoff", IsRequired = true },
            // Tail static
            new() { ExcelColumnName = "Detail",       DbColumnName = "detail", IsRequired = false },
            new() { ExcelColumnName = "Indicator",    DbColumnName = "indicator", IsRequired = false },
            new() { ExcelColumnName = "Notes",        DbColumnName = "notes", IsRequired = false },
            new() { ExcelColumnName = "IRA Name",     DbColumnName = "ira_name", IsRequired = false },
            new() { ExcelColumnName = "NachaFile",    DbColumnName = "nacha_file", IsRequired = false },
        };

        // === EF setup (PostgreSQL demo connection) ===
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=hp_demo;Username=postgres;Password=postgres")
            .Options;

        using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        // === Run the importer (Mixed) ===
        await MixedWorksheetImporter.ProcessMixedAsync(filePath, worksheetName, cfg, mappings, db);

        Console.WriteLine("Import completed.");
    }
}



private static void ValidateStaticHeadersOrThrow(
    List<string> excelDataHeaders, 
    Dictionary<string, string> sectionKinds,
    List<ExcelFieldMapping> mappings,
    Dictionary<string, (int StartCol, int EndCol)> headerMap)
{
    // ------------------------------------------
    // 1) NORMALIZE MAPPINGS FROM DATABASE
    // ------------------------------------------
    var expectedNormalized = new HashSet<string>(
        mappings.Select(m => Normalize(m.ExcelColumnName)),
        StringComparer.OrdinalIgnoreCase
    );

    // ------------------------------------------
    // 2) COLLECT STATIC SECTION COLUMN HEADERS
    // ------------------------------------------
    var staticHeadersNormalized = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    foreach (var kv in headerMap)
    {
        var sectionName = kv.Key;

        // only validate STATIC sections
        if (!sectionKinds.TryGetValue(sectionName, out var kind) || kind != "Static")
            continue;

        var (start, end) = kv.Value;

        // loop through the columns belonging to this STATIC range
        for (int c = start; c <= end; c++)
        {
            if (c - 1 >= excelDataHeaders.Count)
                continue;

            string rawHeader = excelDataHeaders[c - 1];
            string normalized = Normalize(rawHeader);

            if (!string.IsNullOrWhiteSpace(normalized))
                staticHeadersNormalized.Add(normalized);
        }
    }

    // ------------------------------------------
    // 3) COMPARE NORMALIZED HEADERS
    // ------------------------------------------

    // headers expected (from DB) but not found in Excel
    var missing = expectedNormalized
        .Where(e => !staticHeadersNormalized.Contains(e))
        .ToList();

    // headers in Excel but not in DB mapping
    var extra = staticHeadersNormalized
        .Where(a => !expectedNormalized.Contains(a))
        .ToList();

    // ------------------------------------------
    // 4) THROW IF ANY MISMATCH
    // ------------------------------------------
    if (missing.Count > 0 || extra.Count > 0)
    {
        var msg = "Static column header validation failed.\n";

        if (missing.Count > 0)
            msg += "Missing (from Excel): " + string.Join(", ", missing) + "\n";

        if (extra.Count > 0)
            msg += "Unexpected (extra in Excel): " + string.Join(", ", extra) + "\n";

        throw new InvalidOperationException(msg);
    }
}


private static string Normalize(string input)
{
    if (string.IsNullOrWhiteSpace(input))
        return "";

    // Remove ALL whitespace: space, tab, newline, NBSP, etc.
    var cleaned = new string(
        input.Where(ch => !char.IsWhiteSpace(ch)).ToArray()
    );

    // Remove Unicode non-breaking space
    cleaned = cleaned.Replace(((char)160).ToString(), "");

    return cleaned.Trim().ToUpperInvariant();
}

