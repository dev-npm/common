[ApiController]
[Route("api/[controller]/[action]")]
public class ExcelUploadController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ExcelUploadController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpPost]
    public async Task<IActionResult> UploadWithMeta([FromForm] ExcelUploadRequest request)
    {
        if (request.File == null)
            return BadRequest("No file received");

        // Save file to /Uploads
        var uploads = Path.Combine(_env.ContentRootPath, "Uploads");
        Directory.CreateDirectory(uploads);

        var fileName = $"{Guid.NewGuid()}_{request.File.FileName}";
        var filePath = Path.Combine(uploads, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await request.File.CopyToAsync(stream);

        // Load configuration from database
        var worksheetConfigs = await _db.WorksheetConfigs.ToListAsync();
        var mappings = await _db.ExcelFieldMappings.ToListAsync();

        // Process every worksheet
        await WorkbookImporter.ImportWorkbookAsync(
            filePath,
            _db,
            worksheetConfigs,
            mappings,
            request
        );

        return Ok(new { Message = "Upload and processing complete." });
    }
}


public static class WorkbookImporter
{
    public static async Task ImportWorkbookAsync(
        string filePath,
        AppDbContext db,
        List<WorksheetConfig> configs,
        List<ExcelFieldMapping> mappings,
        ExcelUploadRequest metadata
    )
    {
        using var workbook = new XLWorkbook(filePath);

        foreach (var sheet in workbook.Worksheets)
        {
            string sheetName = sheet.Name;

            // 1. Find config for this worksheet
            var cfg = configs.FirstOrDefault(c =>
                c.WorksheetName.Equals(sheetName, StringComparison.OrdinalIgnoreCase));

            if (cfg == null)
                continue; // skip sheets without config

            switch (cfg.StructureType)
            {
                case "Static":
                    await StaticWorksheetImporter.ProcessStaticAsync(
                        filePath, sheetName, cfg, mappings, metadata, db
                    );
                    break;

                case "Json":
                    await JsonWorksheetImporter.ProcessJsonAsync(
                        filePath, sheetName, cfg, metadata, db
                    );
                    break;

                case "Mixed":
                    await MixedWorksheetImporter.ProcessMixedAsync(
                        filePath, sheetName, cfg, mappings, metadata, db
                    );
                    break;
            }
        }
    }
}



public static class MixedWorksheetImporter
{
    public static async Task ProcessMixedAsync(
        string filePath,
        string sheetName,
        WorksheetConfig cfg,
        List<ExcelFieldMapping> mappings,
        ExcelUploadRequest metadata,
        AppDbContext db
    )
    {
        using var workbook = new XLWorkbook(filePath);
        var ws = workbook.Worksheet(sheetName);

        // ---------------------------
        // 1) Identify Header Rows
        // ---------------------------

        int primaryHeaderRow = 1; // merged high-level section names
        int dataHeaderRow = 2;    // actual column headers
        int dataStartRow = 3;     // data begins from row 3

        int lastCol = ws.LastColumnUsed().ColumnNumber();
        int lastRow = ws.LastRowUsed().RowNumber();

        // ---------------------------
        // 2) Resolve Merged Headers
        // ---------------------------

        var primaryHeaders = ResolvePrimaryHeaders(ws, primaryHeaderRow, lastCol);
        // Example result:
        // [1]=GBT-Internal, [2]=GBT-Internal,... [8]=Product X1, [15]=Product X2,...

        var headerMap = BuildHeaderMap(primaryHeaders);
        // Example:
        // { "GBT -Internal": (1,7), "Product X1": (8,14), ... }

        var sectionKinds = ClassifySections(headerMap, cfg);
        // { "GBT -Internal"=Static, "Product X1"=Json, "(none)"=Static }

        // ---------------------------
        // 3) Read Subheaders from Row 2
        // ---------------------------

        var dataHeaders = RowStrings(ws, dataHeaderRow, 1, lastCol);
        // Example:
        // [ "index","Process","Speed", ... "Priority","Status", ... ]

        // ---------------------------
        // 4) Validate Static Columns
        // ---------------------------

        ValidateStaticHeadersOrThrow(dataHeaders, sectionKinds, mappings, headerMap);

        // ---------------------------
        // 5) Determine Data Range
        // ---------------------------

        int dataEndRow = FindFirstBlankRow(ws, dataStartRow, lastCol, lastRow) - 1;
        if (dataEndRow < dataStartRow) dataEndRow = dataStartRow;

        // ---------------------------
        // 6) Extract Data Rows
        // ---------------------------

        var records = new List<HpRecord>();

        for (int r = dataStartRow; r <= dataEndRow; r++)
        {
            var rowDict = RowDictionary(ws, r, dataHeaders);
            var productJson = BuildProductJson(rowDict, headerMap, sectionKinds);

            var rec = new HpRecord
            {
                // Metadata from Angular UI
                TDKId = metadata.TDKId,
                FoundationId = metadata.FoundationId,
                CategoryId = metadata.CategoryId,
                FileDataTypeId = metadata.FileDataTypeId,
                IsInternal = metadata.IsInternal,
                Revision = metadata.Revision,
                SourceFile = Path.GetFileName(filePath),

                // Static columns
                Index = TryInt(rowDict["index"]),
                Process = rowDict["Process"],
                Speed = rowDict["Speed"],
                Velocity = rowDict["Velocity"],
                Interconnect = rowDict["Interconnect"],
                Context = rowDict["Context"],
                SignOff = rowDict["SignOff"],

                // Tail static
                Detail = rowDict.GetValueOrDefault("Detail"),
                Indicator = rowDict.GetValueOrDefault("Indicator"),
                Notes = rowDict.GetValueOrDefault("Notes"),
                IraName = rowDict.GetValueOrDefault("IRA Name"),
                NachaFile = rowDict.GetValueOrDefault("NachaFile"),

                // JSON field
                ProductJson = JsonSerializer.Serialize(productJson)
            };

            records.Add(rec);
        }

        // ---------------------------
        // 7) Legend Rows
        // ---------------------------

        var legends = new List<HpLegend>();

        if (cfg.HasLegendSection)
        {
            for (int lr = cfg.LegendDataStart; lr <= cfg.LegendDataEnd; lr++)
            {
                var row = RowStrings(ws, lr, 1, 2);

                if (!string.IsNullOrWhiteSpace(row[0]))
                {
                    legends.Add(new HpLegend
                    {
                        Key = row[0],
                        Value = row[1],
                        SourceFile = Path.GetFileName(filePath)
                    });
                }
            }
        }

        // ---------------------------
        // 8) Bulk Insert
        // ---------------------------

        await db.BulkInsertAsync(records);
        await db.BulkInsertOrUpdateAsync(legends);
    }

    // --------------- helpers below (same as earlier) --------------------
}
