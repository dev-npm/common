-- 0) Catalog of template types (lightweight)
CREATE TABLE IF NOT EXISTS email_template_type (
  template_key   TEXT PRIMARY KEY,           -- e.g., 'RequestSubmitted'
  display_name   TEXT NOT NULL,              -- e.g., 'Request Submitted'
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1) PDL per template (TEXT[] for To/Cc/Bcc)
CREATE TABLE IF NOT EXISTS email_distribution_list (
  id             SERIAL PRIMARY KEY,
  template_key   TEXT NOT NULL REFERENCES email_template_type(template_key) ON DELETE RESTRICT,
  to_emails      TEXT[] NOT NULL DEFAULT '{}',
  cc_emails      TEXT[] NOT NULL DEFAULT '{}',
  bcc_emails     TEXT[] NOT NULL DEFAULT '{}',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by     TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pdl_template UNIQUE (template_key)
);

-- 2) Outbox (append-only; track send status only)
CREATE TABLE IF NOT EXISTS email_outbox (
  id             BIGSERIAL PRIMARY KEY,
  template_key   TEXT NOT NULL REFERENCES email_template_type(template_key) ON DELETE RESTRICT,
  entity_type    TEXT NOT NULL,              -- e.g., 'Request'
  entity_id      BIGINT NOT NULL,            -- e.g., 123
  subject        TEXT NOT NULL,
  body_html      TEXT NOT NULL,
  to_emails      TEXT[] NOT NULL,
  cc_emails      TEXT[] NOT NULL,
  bcc_emails     TEXT[] NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('Pending','Sent','Failed')),
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at        TIMESTAMPTZ
);

-- Helpful indexes for lookups and dashboards
CREATE INDEX IF NOT EXISTS idx_outbox_lookup
  ON email_outbox (entity_type, entity_id, template_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbox_status
  ON email_outbox (status, created_at DESC);



public static class TemplateKeys
{
    public const string RequestSubmitted = "RequestSubmitted";
    public const string RequestApproved  = "RequestApproved";
    public const string RequestRejected  = "RequestRejected";
}

public class EmailTemplateType
{
    public string TemplateKey { get; set; } = default!;
    public string DisplayName { get; set; } = default!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; }
}

public class EmailDistributionList
{
    public int Id { get; set; }
    public string TemplateKey { get; set; } = default!;
    public string[] ToEmails { get; set; } = Array.Empty<string>();
    public string[] CcEmails { get; set; } = Array.Empty<string>();
    public string[] BccEmails { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; } = true;
    public string? UpdatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class EmailOutbox
{
    public long Id { get; set; }
    public string TemplateKey { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public long EntityId { get; set; }
    public string Subject { get; set; } = default!;
    public string BodyHtml { get; set; } = default!;
    public string[] ToEmails { get; set; } = Array.Empty<string>();
    public string[] CcEmails { get; set; } = Array.Empty<string>();
    public string[] BccEmails { get; set; } = Array.Empty<string>();
    public string Status { get; set; } = "Pending"; // Pending | Sent | Failed
    public string? Error { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
}


public interface ITemplateRenderer
{
    Task<string> LoadAsync(string templateKey, CancellationToken ct = default);
    string Render(string template, IReadOnlyDictionary<string, string> model);
}

public class FileBasedTemplateRenderer : ITemplateRenderer
{
    private readonly string _root;
    public FileBasedTemplateRenderer(IHostEnvironment env)
        => _root = Path.Combine(env.ContentRootPath, "EmailTemplates");

    public async Task<string> LoadAsync(string templateKey, CancellationToken ct = default)
    {
        var path = Path.Combine(_root, $"{templateKey}.html");
        if (!File.Exists(path))
            throw new FileNotFoundException($"Email template not found: {path}");
        return await File.ReadAllTextAsync(path, ct);
    }

    public string Render(string template, IReadOnlyDictionary<string, string> model)
    {
        foreach (var kv in model)
            template = template.Replace($"@{kv.Key}", kv.Value ?? string.Empty, StringComparison.Ordinal);
        return template;
    }
}



public record PdlConfig(string[] To, string[] Cc, string[] Bcc);

public interface IPdlService
{
    Task<PdlConfig> GetAsync(string templateKey, CancellationToken ct = default);
}

public class PdlService : IPdlService
{
    private readonly AppDbContext _db;
    public PdlService(AppDbContext db) => _db = db;

    public async Task<PdlConfig> GetAsync(string templateKey, CancellationToken ct = default)
    {
        var row = await _db.EmailDistributionLists
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TemplateKey == templateKey && x.IsActive, ct);

        if (row == null)
            throw new InvalidOperationException($"PDL not found/active for '{templateKey}'.");

        return new PdlConfig(row.ToEmails, row.CcEmails, row.BccEmails);
    }
}



public interface IEmailSender
{
    Task SendAsync(string subject, string htmlBody, string[] to, string[]? cc = null, string[]? bcc = null, CancellationToken ct = default);
}

public class SmtpConfig
{
    public string Host { get; set; } = default!;
    public int Port { get; set; } = 587;
    public bool UseSsl { get; set; } = true;
    public string FromEmail { get; set; } = default!;
    public string FromName { get; set; } = "No-Reply";
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public class MailKitEmailSender : IEmailSender
{
    private readonly SmtpConfig _cfg;
    public MailKitEmailSender(IOptions<SmtpConfig> cfg) => _cfg = cfg.Value;

    public async Task SendAsync(string subject, string htmlBody, string[] to, string[]? cc = null, string[]? bcc = null, CancellationToken ct = default)
    {
        var msg = new MimeKit.MimeMessage();
        msg.From.Add(new MimeKit.MailboxAddress(_cfg.FromName, _cfg.FromEmail));
        foreach (var e in to)  msg.To.Add(MimeKit.MailboxAddress.Parse(e));
        if (cc is { Length: > 0 })  foreach (var e in cc)  msg.Cc.Add(MimeKit.MailboxAddress.Parse(e));
        if (bcc is { Length: > 0 }) foreach (var e in bcc) msg.Bcc.Add(MimeKit.MailboxAddress.Parse(e));

        msg.Subject = subject;
        msg.Body = new MimeKit.BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var client = new MailKit.Net.Smtp.SmtpClient();
        await client.ConnectAsync(_cfg.Host, _cfg.Port, _cfg.UseSsl, ct);
        if (!string.IsNullOrWhiteSpace(_cfg.Username))
            await client.AuthenticateAsync(_cfg.Username, _cfg.Password, ct);
        await client.SendAsync(msg, ct);
        await client.DisconnectAsync(true, ct);
    }
}


public class NotificationService
{
    private readonly AppDbContext _db;
    private readonly IPdlService _pdl;
    private readonly ITemplateRenderer _renderer;
    private readonly IEmailSender _sender;

    public NotificationService(AppDbContext db, IPdlService pdl, ITemplateRenderer renderer, IEmailSender sender)
    {
        _db = db; _pdl = pdl; _renderer = renderer; _sender = sender;
    }

    public async Task<long> SendAsync(
        string templateKey,
        string entityType, long entityId,
        IReadOnlyDictionary<string, string> model,
        string subject,
        CancellationToken ct = default)
    {
        // Render body + get PDL
        var template = await _renderer.LoadAsync(templateKey, ct);
        var body = _renderer.Render(template, model);
        var pdl = await _pdl.GetAsync(templateKey, ct);

        // Create outbox row (Pending)
        var outbox = new EmailOutbox
        {
            TemplateKey = templateKey,
            EntityType = entityType,
            EntityId = entityId,
            Subject = subject,
            BodyHtml = body,
            ToEmails = pdl.To,
            CcEmails = pdl.Cc,
            BccEmails = pdl.Bcc,
            Status = "Pending",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.EmailOutbox.Add(outbox);
        await _db.SaveChangesAsync(ct); // get Id

        try
        {
            // Send
            await _sender.SendAsync(subject, body, pdl.To, pdl.Cc, pdl.Bcc, ct);

            // Mark Sent
            outbox.Status = "Sent";
            outbox.SentAt = DateTimeOffset.UtcNow;
            outbox.Error = null;
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Mark Failed (still recorded)
            outbox.Status = "Failed";
            outbox.Error = ex.Message;
            await _db.SaveChangesAsync(ct);
            throw;
        }

        return outbox.Id;
    }

    // Quick check: was it sent yet? (latest attempt only)
    public async Task<bool> WasSentAsync(string templateKey, string entityType, long entityId, CancellationToken ct = default)
    {
        var latest = await _db.EmailOutbox
            .Where(x => x.TemplateKey == templateKey && x.EntityType == entityType && x.EntityId == entityId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.Status)
            .FirstOrDefaultAsync(ct);

        return latest == "Sent";
    }
}

// Program.cs
builder.Services.Configure<SmtpConfig>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IPdlService, PdlService>();
builder.Services.AddSingleton<ITemplateRenderer, FileBasedTemplateRenderer>();
builder.Services.AddScoped<IEmailSender, MailKitEmailSender>();
builder.Services.AddScoped<NotificationService>();

