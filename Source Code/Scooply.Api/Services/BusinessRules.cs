using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>Pure business rules (no database) so they are easy to unit test.</summary>
public static class MembershipRules
{
    /// <summary>End date = start + plan duration (30 or 365 days).</summary>
    public static DateTime CalculateEndDate(DateTime start, int durationDays) => start.AddDays(durationDays);

    /// <summary>
    /// Start date for a new/renewed membership: if the member is still active the new period
    /// begins when the current one ends (no days lost); otherwise it begins now.
    /// </summary>
    public static DateTime CalculateStartDate(DateTime now, DateTime? currentEnd) =>
        currentEnd.HasValue && currentEnd.Value > now ? currentEnd.Value : now;

    /// <summary>A membership is active only while now is inside [Start, End].</summary>
    public static bool IsActive(DateTime start, DateTime end, DateTime now) => now >= start && now <= end;
}

/// <summary>Order cost and status workflow rules.</summary>
public static class OrderRules
{
    public const int MaxQuantity = 10;

    /// <summary>Total = unit price x quantity, rounded to 2 decimals. Server-side source of truth.</summary>
    public static decimal CalculateTotal(decimal unitPrice, int quantity) =>
        decimal.Round(unitPrice * quantity, 2, MidpointRounding.AwayFromZero);

    /// <summary>True when quantity is 1..MaxQuantity.</summary>
    public static bool IsValidQuantity(int quantity) => quantity >= 1 && quantity <= MaxQuantity;

    /// <summary>
    /// Forward-only workflow: Placed -> Processing -> Sent -> Completed.
    /// Only the immediate next status is allowed (assumption documented in the algorithms doc).
    /// </summary>
    public static bool CanTransition(OrderStatus from, OrderStatus to) => (int)to == (int)from + 1;
}

/// <summary>Who may see a full recipe.</summary>
public static class RecipeAccessRules
{
    /// <summary>Free recipes are open to everyone; others need a logged-in member with an active membership.</summary>
    public static bool CanViewFullRecipe(bool isFreeFlavor, bool isLoggedIn, bool hasActiveMembership) =>
        isFreeFlavor || (isLoggedIn && hasActiveMembership);
}
