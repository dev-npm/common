-- 1.1: Staging table (snapshot of each Excel upload)
CREATE TABLE customer_raw_upload (
  upload_batch_id    TEXT       NOT NULL,
  customer_name      TEXT       NOT NULL,
  normalized_name    TEXT       NOT NULL,
  supplier_text      TEXT,
  process_text       TEXT,
  uploaded_at        TIMESTAMP  NOT NULL DEFAULT now()
);

-- 1.2: Main customer table
CREATE TABLE customer (
  customer_id        SERIAL      PRIMARY KEY,
  customer_name      TEXT        NOT NULL,
  normalized_name    TEXT        NOT NULL UNIQUE,
  batch_id           TEXT        NULL,
  customer_type_id   INT         NOT NULL,    -- 2 = Planning
  supplier_id        INT         NULL,
  process_id         INT         NULL,
  is_from_api        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_deleted         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP   NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMP   NULL
);

-- 1.3: Project‐customer map
CREATE TABLE customer_project_map (
  customer_id INT NOT NULL REFERENCES customer(customer_id),
  project_id  INT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (customer_id, project_id)
);

-- 1.4: Upsert & cleanup function
CREATE OR REPLACE FUNCTION sync_customers_from_batch(p_batch_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Upsert all staging rows into customer
  INSERT INTO customer (
    customer_name, normalized_name, batch_id,
    customer_type_id, supplier_id, process_id,
    is_from_api, is_deleted, updated_at
  )
  SELECT
    r.customer_name,
    r.normalized_name,
    p_batch_id,
    2,  -- Planning
    (SELECT id FROM supplier WHERE name = r.supplier_text),
    (SELECT id FROM process  WHERE name = r.process_text),
    TRUE,
    FALSE,
    now()
  FROM customer_raw_upload r
  WHERE r.upload_batch_id = p_batch_id

  ON CONFLICT (normalized_name)
  DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    batch_id      = EXCLUDED.batch_id,
    supplier_id   = EXCLUDED.supplier_id,
    process_id    = EXCLUDED.process_id,
    is_from_api   = TRUE,
    is_deleted    = FALSE,
    updated_at    = now();

  -- Soft-delete customers no longer in staging (and not tied to active project)
  UPDATE customer c
  SET
    is_deleted = TRUE,
    deleted_at = now(),
    updated_at = now()
  WHERE c.customer_type_id = 2
    AND c.is_from_api = TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM customer_raw_upload r
      WHERE r.upload_batch_id = p_batch_id
        AND r.normalized_name = c.normalized_name
    )
    AND NOT EXISTS (
      SELECT 1
      FROM customer_project_map m
      WHERE m.customer_id = c.customer_id
        AND m.active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- 1.5: Manual‐add helper
CREATE OR REPLACE FUNCTION add_manual_customer(
  p_name        TEXT,
  p_supplier_id INT,
  p_process_id  INT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO customer (
    customer_name, normalized_name, customer_type_id,
    supplier_id, process_id,
    is_from_api, is_deleted, created_at, updated_at
  ) VALUES (
    p_name,
    lower(trim(p_name)),
    2,
    p_supplier_id,
    p_process_id,
    FALSE,
    FALSE,
    now(),
    now()
  )
  ON CONFLICT (normalized_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
&&&&&&&&&&&&&&&&&&&&&&&&&&
[HttpPost("upload-excel")]
public async Task<IActionResult> UploadExcel(
    IFormFile file,
    [FromQuery] string? batchId // optional: allow client to pass one
)
{
    if (file == null || file.Length == 0)
        return BadRequest("Please attach an Excel file.");

    // 1) Generate if not provided
    batchId ??= DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");

    // 2) Save file to temp path
    var path = Path.Combine(Path.GetTempPath(), file.FileName);
    await using (var fs = System.IO.File.Create(path))
        await file.CopyToAsync(fs);

    // 3) Stage & validate
    var validation = await _excel.ImportAndValidateAsync(path, batchId);
    if (!validation.IsValid)
    {
        return Ok(new {
            batchId,
            validation.MissingSuppliers,
            validation.MissingProcesses,
            isValid = false
        });
    }

    // 4) Success — staging is complete
    return Ok(new {
        batchId,
        isValid = true,
        message = "File staged successfully. You may now sync."
    });
}

// Services/ExcelImportService.cs
using ClosedXML.Excel;
public class ExcelImportService
{
    private readonly AppDbContext _db;
    public ExcelImportService(AppDbContext db) => _db = db;

    public async Task LoadToStagingAsync(string filePath, string batchId)
    {
        using var workbook = new XLWorkbook(filePath);
        var ws = workbook.Worksheet(1);
        var rows = ws.RangeUsed().RowsUsed().Skip(1);

        // Clear previous staging for this batch (optional)
        await _db.Database.ExecuteSqlRawAsync(
          "DELETE FROM customer_raw_upload WHERE upload_batch_id = {0}", batchId);

        foreach (var r in rows)
        {
            var name = r.Cell(1).GetString();
            _db.CustomerRawUpload.Add(new CustomerRawUpload {
                UploadBatchId  = batchId,
                CustomerName   = name,
                NormalizedName = name.Trim().ToLowerInvariant(),
                SupplierText   = r.Cell(2).GetString(),
                ProcessText    = r.Cell(3).GetString()
            });
        }
        await _db.SaveChangesAsync();
    }
}

// Services/CustomerSyncService.cs
using Dapper;
using Npgsql;
public class CustomerSyncService
{
    private readonly string _conn;
    public CustomerSyncService(IConfiguration cfg)
        => _conn = cfg.GetConnectionString("Default");

    public async Task SyncBatchAsync(string batchId)
    {
        await using var db = new NpgsqlConnection(_conn);
        await db.ExecuteAsync("SELECT sync_customers_from_batch(@BatchId);",
                              new { BatchId = batchId });
    }

    public async Task AddManualCustomerAsync(string name, int supplierId, int processId)
    {
        await using var db = new NpgsqlConnection(_conn);
        await db.ExecuteAsync(
          "SELECT add_manual_customer(@Name,@Sup,@Proc);",
          new { Name = name, Sup = supplierId, Proc = processId });
    }
}
&&&&&&&&&&&777

// Controllers/CustomerController.cs
[ApiController]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly ExcelImportService _excel;
    private readonly CustomerSyncService _sync;

    public CustomerController(
      ExcelImportService excel,
      CustomerSyncService sync)
    {
      _excel = excel;
      _sync  = sync;
    }

    [HttpPost("upload-excel")]
    public async Task<IActionResult> UploadExcel(
      IFormFile file, [FromQuery] string batchId)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file");
        var path = Path.Combine("data", file.FileName);
        await using (var fs = System.IO.File.Create(path))
            await file.CopyToAsync(fs);

        await _excel.LoadToStagingAsync(path, batchId);
        return Ok($"Staged batch {batchId}");
    }

    [HttpPost("sync-batch")]
    public async Task<IActionResult> SyncBatch([FromQuery] string batchId)
    {
        await _sync.SyncBatchAsync(batchId);
        return Ok($"Synced batch {batchId}");
    }

    [HttpPost("add-manual")]
    public async Task<IActionResult> AddManual(
      [FromQuery] string name,
      [FromQuery] int supplierId,
      [FromQuery] int processId)
    {
        await _sync.AddManualCustomerAsync(name, supplierId, processId);
        return Ok($"Added manual customer {name}");
    }
}

// Program.cs (minimal .NET 6+)
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<ExcelImportService>();
builder.Services.AddScoped<CustomerSyncService>();
builder.Services.AddControllers();
var app = builder.Build();*******
app.MapControllers();
app.Run();

fail fast

public class ExcelImportService
{
    private readonly AppDbContext _db;
    public ExcelImportService(AppDbContext db) => _db = db;

    public async Task<LookupValidationResult> LoadToStagingAndValidateAsync(string filePath, string batchId)
    {
        // 1) Save to staging
        using var workbook = new XLWorkbook(filePath);
        var ws = workbook.Worksheet(1);
        var rows = ws.RangeUsed().RowsUsed().Skip(1);

        // Optional: clear old staging for this batch
        await _db.Database.ExecuteSqlRawAsync(
            "DELETE FROM customer_raw_upload WHERE upload_batch_id = {0}", batchId);

        foreach (var r in rows)
        {
            var name = r.Cell(1).GetString();
            _db.CustomerRawUpload.Add(new CustomerRawUpload {
                UploadBatchId  = batchId,
                CustomerName   = name,
                NormalizedName = name.Trim().ToLowerInvariant(),
                SupplierText   = r.Cell(2).GetString(),
                ProcessText    = r.Cell(3).GetString()
            });
        }
        await _db.SaveChangesAsync();

        // 2) Validate lookups
        return await ValidateLookupsAsync(batchId);
    }

    private async Task<LookupValidationResult> ValidateLookupsAsync(string batchId)
    {
        var result = new LookupValidationResult();

        // Find distinct supplier_text in staging not in supplier table
        var stagingSuppliers = await _db.CustomerRawUpload
            .Where(r => r.UploadBatchId == batchId && !string.IsNullOrEmpty(r.SupplierText))
            .Select(r => r.SupplierText.Trim())
            .Distinct()
            .ToListAsync();

        var existingSuppliers = await _db.Suppliers
            .Select(s => s.Name.Trim())
            .ToListAsync();

        result.MissingSuppliers = stagingSuppliers
            .Except(existingSuppliers, StringComparer.InvariantCultureIgnoreCase)
            .ToList();

        // Same for processes
        var stagingProcs = await _db.CustomerRawUpload
            .Where(r => r.UploadBatchId == batchId && !string.IsNullOrEmpty(r.ProcessText))
            .Select(r => r.ProcessText.Trim())
            .Distinct()
            .ToListAsync();

        var existingProcs = await _db.Processes
            .Select(p => p.Name.Trim())
            .ToListAsync();

        result.MissingProcesses = stagingProcs
            .Except(existingProcs, StringComparer.InvariantCultureIgnoreCase)
            .ToList();

        return result;
    }
}
[ApiController]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly ExcelImportService _excel;
    private readonly CustomerSyncService _sync;

    public CustomerController(
        ExcelImportService excel,
        CustomerSyncService sync)
    {
        _excel = excel;
        _sync  = sync;
    }

    [HttpPost("upload-excel")]
    public async Task<IActionResult> UploadExcel(
        IFormFile file,
        [FromQuery] string batchId)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Please attach an Excel file.");

        var path = Path.Combine(Path.GetTempPath(), file.FileName);
        await using (var fs = System.IO.File.Create(path))
            await file.CopyToAsync(fs);

        // Load to staging + validate lookups
        var validation = await _excel.LoadToStagingAndValidateAsync(path, batchId);

        if (!validation.IsValid)
        {
            // Return 200 with the lists (UI can still proceed to fix)
            return Ok(validation);
        }

        // No missing lookups → ready to sync
        return Ok(new { validation.IsValid, Message = "Staging complete. Ready to sync." });
    }

    [HttpPost("sync-batch")]
    public async Task<IActionResult> SyncBatch([FromQuery] string batchId)
    {
        // safe to call now
        await _sync.SyncBatchAsync(batchId);
        return Ok($"Batch {batchId} synced.");
    }
}


*********** wuth cout
CREATE OR REPLACE FUNCTION sync_customers_from_batch(p_batch_id TEXT)
RETURNS JSONB AS $$
DECLARE
  ins_names TEXT[];
  upd_names TEXT[];
BEGIN
  -- 1) Gather names of new inserts
  SELECT ARRAY_AGG(r.customer_name)
    INTO ins_names
  FROM (
    SELECT DISTINCT r.customer_name
    FROM customer_raw_upload r
    WHERE r.upload_batch_id = p_batch_id
      AND NOT EXISTS (
        SELECT 1
        FROM customer c
        WHERE c.normalized_name = r.normalized_name
          AND c.batch_id IS NOT NULL
      )
  ) AS r;

  -- 2) Perform the INSERT for new rows
  INSERT INTO customer (
    customer_name, normalized_name, batch_id,
    customer_type_id, supplier_id, process_id,
    is_from_api, is_deleted, updated_at
  )
  SELECT
    r.customer_name,
    r.normalized_name,
    p_batch_id,
    2,  -- Planning
    (SELECT id FROM supplier WHERE name = r.supplier_text),
    (SELECT id FROM process  WHERE name = r.process_text),
    TRUE,
    FALSE,
    NOW()
  FROM customer_raw_upload r
  WHERE r.upload_batch_id = p_batch_id
    AND NOT EXISTS (
      SELECT 1
      FROM customer c
      WHERE c.normalized_name = r.normalized_name
        AND c.batch_id IS NOT NULL
    );

  -- 3) Gather names of rows to UPDATE
  SELECT ARRAY_AGG(r.customer_name)
    INTO upd_names
  FROM (
    SELECT DISTINCT r.customer_name
    FROM customer_raw_upload r
    JOIN customer c
      ON c.normalized_name = r.normalized_name
     AND c.batch_id IS NOT NULL
    WHERE r.upload_batch_id = p_batch_id
  ) AS r;

  -- 4) Perform the UPDATE for existing rows
  UPDATE customer AS c
  SET
    customer_name = r.customer_name,
    batch_id      = p_batch_id,
    supplier_id   = (SELECT id FROM supplier WHERE name = r.supplier_text),
    process_id    = (SELECT id FROM process  WHERE name = r.process_text),
    is_from_api   = TRUE,
    is_deleted    = FALSE,
    updated_at    = NOW()
  FROM customer_raw_upload AS r
  WHERE r.upload_batch_id = p_batch_id
    AND c.normalized_name = r.normalized_name
    AND c.batch_id IS NOT NULL;

  -- 5) Soft‐delete omitted imports (as before)
  UPDATE customer AS c
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE c.customer_type_id = 2
    AND c.is_from_api = TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM customer_raw_upload r
      WHERE r.upload_batch_id = p_batch_id
        AND r.normalized_name = c.normalized_name
    )
    AND NOT EXISTS (
      SELECT 1
      FROM customer_project_map m
      WHERE m.customer_id = c.customer_id
        AND m.active = TRUE
    );

  -- 6) Return a JSON summary
  RETURN JSONB_BUILD_OBJECT(
    'inserted_count', COALESCE(ARRAY_LENGTH(ins_names, 1), 0),
    'updated_count',  COALESCE(ARRAY_LENGTH(upd_names, 1), 0),
    'inserted_names', ins_names,
    'updated_names',  upd_names
  );
END;
$$ LANGUAGE plpgsql;
// Services/CustomerSyncService.cs
public class CustomerSyncService
{
    private readonly string _connectionString;

    public CustomerSyncService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Default");
    }

    public async Task<SyncResult> SyncBatchAsync(string batchId)
    {
        const string sql = "SELECT sync_customers_from_batch(@BatchId);";
        await using var conn = new NpgsqlConnection(_connectionString);
        var json = await conn.ExecuteScalarAsync<string>(sql, new { BatchId = batchId });
        
        // Deserialize the JSONB result into our SyncResult
        return JsonSerializer.Deserialize<SyncResult>(json, new JsonSerializerOptions {
            PropertyNameCaseInsensitive = true
        })!;
    }
}
// Controllers/CustomerController.cs
[ApiController]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly ExcelImportService  _excel;
    private readonly CustomerSyncService _sync;

    public CustomerController(
        ExcelImportService excel,
        CustomerSyncService sync)
    {
        _excel = excel;
        _sync  = sync;
    }

    [HttpPost("sync-batch")]
    public async Task<IActionResult> SyncBatch([FromQuery] string batchId)
    {
        var result = await _sync.SyncBatchAsync(batchId);
        return Ok(result);
    }
}
'mmmmmmmmmmmmmmmmmmmmm


CREATE OR REPLACE FUNCTION sync_customers_from_batch(p_batch_id TEXT)
RETURNS JSONB AS $$
DECLARE
  ins_names   TEXT[];
  upd_names   TEXT[];
  del_names   TEXT[];
  del_count   INT;
BEGIN
  -- 1) Upsert staging rows, returning each row’s customer_name & xmax
  WITH staging AS (
    SELECT
      r.customer_name,
      r.normalized_name,
      (SELECT id FROM supplier WHERE name = r.supplier_text) AS sup_id,
      (SELECT id FROM process  WHERE name = r.process_text)  AS proc_id
    FROM customer_raw_upload r
    WHERE r.upload_batch_id = p_batch_id
  ),
  upserted AS (
    INSERT INTO customer (
      customer_name, normalized_name, batch_id,
      customer_type_id, supplier_id, process_id,
      is_from_api, is_deleted, updated_at
    )
    SELECT
      s.customer_name,
      s.normalized_name,
      p_batch_id,
      2,         -- Planning
      s.sup_id,
      s.proc_id,
      TRUE,
      FALSE,
      NOW()
    FROM staging s
    ON CONFLICT (normalized_name, supplier_id)
    DO UPDATE SET
      customer_name = EXCLUDED.customer_name,
      batch_id      = EXCLUDED.batch_id,
      process_id    = EXCLUDED.process_id,
      is_from_api   = TRUE,
      is_deleted    = FALSE,
      updated_at    = NOW()
    RETURNING
      customer_name,
      xmax
  )
  SELECT
    ARRAY_AGG(customer_name) FILTER (WHERE xmax = 0),
    ARRAY_AGG(customer_name) FILTER (WHERE xmax <> 0)
    INTO ins_names, upd_names
  FROM upserted;

  -- 2) Identify customers to be soft-deleted
  SELECT ARRAY_AGG(c.customer_name)
    INTO del_names
  FROM customer c
  WHERE c.customer_type_id = 2
    AND c.is_from_api = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM customer_raw_upload r
      WHERE r.upload_batch_id  = p_batch_id
        AND r.normalized_name  = c.normalized_name
        AND (SELECT id FROM supplier WHERE name = r.supplier_text) = c.supplier_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM customer_project_map m
      WHERE m.customer_id = c.customer_id
        AND m.active = TRUE
    );

  -- 3) Soft-delete those missing customers
  UPDATE customer c
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE c.customer_type_id = 2
    AND c.is_from_api = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM customer_raw_upload r
      WHERE r.upload_batch_id  = p_batch_id
        AND r.normalized_name  = c.normalized_name
        AND (SELECT id FROM supplier WHERE name = r.supplier_text) = c.supplier_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM customer_project_map m
      WHERE m.customer_id = c.customer_id
        AND m.active = TRUE
    );

  GET DIAGNOSTICS del_count = ROW_COUNT;

  -- 4) Return JSON summary
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

