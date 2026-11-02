using System.Text.RegularExpressions;
namespace Scooply.Api.Services;

/// <summary>Password policy: at least 8 chars with upper, lower, digit and symbol.</summary>
public static class PasswordRules
{
    private static readonly Regex Strong =
        new(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$", RegexOptions.Compiled);

    public static bool IsStrong(string? password) => password != null && Strong.IsMatch(password);

    public const string Message =
        "Password must be at least 8 characters and include upper-case, lower-case, a digit and a symbol.";
}
