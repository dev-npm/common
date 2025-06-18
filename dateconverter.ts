using ClosedXML.Excel;
using System;
using System.Globalization;

public static class ExcelHelpers
{
    /// <summary>
    /// Reads a cell and, if it contains a date (or a parsable date-string),
    /// returns it formatted as "yyyy-MM-dd". Otherwise returns empty string.
    /// </summary>
    public static string GetDateText(IXLCell cell)
    {
        if (cell == null)
            return "";

        // Try real DateTime type or a fallback parse of its text
        if (cell.DataType == XLDataType.DateTime
            || DateTime.TryParse(cell.GetString(), out var fallback))
        {
            DateTime dt;

            try
            {
                // Preferred: direct date–cell access
                dt = cell.GetDateTime();
            }
            catch
            {
                // Fallback: parsed from text
                dt = fallback;
            }

            // Format as "yyyy-MM-dd"
            return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        // Not a date → blank
        return "";
    }
}



using ClosedXML.Excel;
using System;
using System.Globalization;

public static class ExcelHelpers
{
    /// <summary>
    /// Reads a cell and, if it contains a date (or a parsable date-string),
    /// returns it formatted as "yyyy-MM-dd". Otherwise returns empty string.
    /// </summary>
    public static string GetDateText(IXLCell cell)
    {
        if (cell == null)
            return "";

        DateTime dt;

        // 1) If the cell is stored as a real DateTime, use that
        if (cell.DataType == XLDataType.DateTime)
        {
            dt = cell.GetDateTime();
        }
        // 2) Otherwise, try parsing its text
        else if (DateTime.TryParse(cell.GetString(), out dt))
        {
            // dt is now the parsed fallback
        }
        else
        {
            // neither a date cell nor parseable text
            return "";
        }

        // Format as "yyyy-MM-dd"
        return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }
}

