namespace Scooply.Api.Services;

/// <summary>Card-number helpers: digit cleanup, Luhn checksum and brand detection.</summary>
public static class LuhnValidator
{
    /// <summary>Strips spaces/dashes and any non-digit characters.</summary>
    public static string Digits(string? s) => new string((s ?? "").Where(char.IsDigit).ToArray());

    /// <summary>True when the number is 13-19 digits and passes the Luhn checksum.</summary>
    public static bool IsValid(string? number)
    {
        var d = Digits(number);
        if (d.Length < 13 || d.Length > 19) return false;

        int sum = 0;
        bool doubleIt = false;
        // Walk right-to-left, doubling every second digit; subtract 9 if the result exceeds 9.
        for (int i = d.Length - 1; i >= 0; i--)
        {
            int n = d[i] - '0';
            if (doubleIt) { n *= 2; if (n > 9) n -= 9; }
            sum += n;
            doubleIt = !doubleIt;
        }
        return sum % 10 == 0;
    }

    /// <summary>Detects Visa, Mastercard or Amex from the leading digits; otherwise "Unknown".</summary>
    public static string DetectBrand(string? number)
    {
        var d = Digits(number);
        if (d.StartsWith("4")) return "Visa";
        if (d.Length >= 2)
        {
            int p2 = int.Parse(d[..2]);
            if (p2 is 34 or 37) return "Amex";
            if (p2 is >= 51 and <= 55) return "Mastercard";
        }
        if (d.Length >= 4)
        {
            int p4 = int.Parse(d[..4]);
            if (p4 is >= 2221 and <= 2720) return "Mastercard";
        }
        return "Unknown";
    }
}
