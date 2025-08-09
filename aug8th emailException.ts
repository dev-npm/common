public static class ExceptionLoggingExtensions
{
    public static void LogException(this ILogger logger, Exception ex, string message = "Unhandled exception")
    {
        var err = new StringBuilder();
        int depth = 0;

        for (var e = ex; e != null; e = e.InnerException)
        {
            err.AppendLine($"--- Exception level {depth} ---");
            err.AppendLine($"Type: {e.GetType().FullName}");
            err.AppendLine($"Message: {e.Message}");
            err.AppendLine($"HResult: {e.HResult}");
            err.AppendLine($"Source: {e.Source}");
            err.AppendLine($"TargetSite: {e.TargetSite}");
            err.AppendLine($"StackTrace:\n{e.StackTrace}");

            if (e.Data?.Count > 0)
            {
                err.AppendLine("Data:");
                foreach (var key in e.Data.Keys)
                    err.AppendLine($"  {key}: {e.Data[key]}");
            }

            depth++;
        }

        logger.LogError("{Message}\n{Details}", message, err.ToString());
    }
}

try
{
    using var client = new SmtpClient("smtp.server.com", 587)
    {
        Credentials = new NetworkCredential("user", "pass"),
        EnableSsl = true
    };

    var mail = new MailMessage("from@domain.com", "to@domain.com", "Test", "Hello World");
    client.Send(mail);
}
catch (SmtpFailedRecipientsException frex)
{
    foreach (var inner in frex.InnerExceptions)
    {
        Console.WriteLine($"Recipient failed: {inner.FailedRecipient}");
        Console.WriteLine($"StatusCode: {inner.StatusCode}");
        Console.WriteLine($"Message: {inner.Message}");
    }
}
catch (SmtpFailedRecipientException frex)
{
    Console.WriteLine($"Recipient failed: {frex.FailedRecipient}");
    Console.WriteLine($"StatusCode: {frex.StatusCode}");
    Console.WriteLine($"Message: {frex.Message}");
}
catch (SmtpException sex)
{
    Console.WriteLine($"SMTP StatusCode: {sex.StatusCode}");
    Console.WriteLine($"Error: {sex.Message}");

    if (sex.InnerException != null)
    {
        Console.WriteLine($"Inner: {sex.InnerException.Message}");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex}");
}



private string BuildExceptionDetails(Exception ex)
{
    var sb = new StringBuilder();
    int depth = 0;

    for (var e = ex; e != null; e = e.InnerException)
    {
        sb.AppendLine($"--- Exception level {depth} ---");
        sb.AppendLine($"Type: {e.GetType().FullName}");
        sb.AppendLine($"Message: {e.Message}");
        sb.AppendLine($"Source: {e.Source}");
        sb.AppendLine($"TargetSite: {e.TargetSite}");
        sb.AppendLine($"StackTrace:\n{e.StackTrace}");

        if (e is System.Net.Mail.SmtpException smtpEx)
        {
            sb.AppendLine($"SMTP StatusCode: {smtpEx.StatusCode}");
        }
        if (e is System.Net.Mail.SmtpFailedRecipientException failedRecEx)
        {
            sb.AppendLine($"FailedRecipient: {failedRecEx.FailedRecipient}");
            sb.AppendLine($"SMTP StatusCode: {failedRecEx.StatusCode}");
        }
        if (e is System.Net.Mail.SmtpFailedRecipientsException failedRecsEx)
        {
            foreach (var inner in failedRecsEx.InnerExceptions)
            {
                sb.AppendLine($"  FailedRecipient: {inner.FailedRecipient}");
                sb.AppendLine($"  SMTP StatusCode: {inner.StatusCode}");
                sb.AppendLine($"  Message: {inner.Message}");
            }
        }

        if (e.Data?.Count > 0)
        {
            sb.AppendLine("Data:");
            foreach (var key in e.Data.Keys)
                sb.AppendLine($"  {key}: {e.Data[key]}");
        }

        sb.AppendLine();
        depth++;
    }

    return sb.ToString();
}
try
{
    using var client = new SmtpClient("smtp.server.com", 587)
    {
        EnableSsl = true,
        Credentials = new NetworkCredential("user", "pass")
    };

    var mail = new MailMessage("from@domain.com", "to@domain.com", "Subject", "Body text");
    client.Send(mail);
}
catch (SmtpFailedRecipientsException frex)
{
    var details = BuildExceptionDetails(frex);
    _logger.LogError(details);
}
catch (SmtpFailedRecipientException frex)
{
    var details = BuildExceptionDetails(frex);
    _logger.LogError(details);
}
catch (SmtpException sex)
{
    var details = BuildExceptionDetails(sex);
    _logger.LogError(details);
}
catch (Exception ex)
{
    var details = BuildExceptionDetails(ex);
    _logger.LogError(details);
}

