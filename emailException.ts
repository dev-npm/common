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
