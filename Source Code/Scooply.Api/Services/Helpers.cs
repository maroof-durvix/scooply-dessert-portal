using System.Security.Claims;
using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>Claim helpers. Admin tokens also carry NameIdentifier, so member id is role-checked.</summary>
public static class UserExtensions
{
    /// <summary>Member's UserId, or null for guests and admins.</summary>
    public static int? MemberId(this ClaimsPrincipal p) =>
        p.Identity?.IsAuthenticated == true && p.IsInRole(Roles.Member) &&
        int.TryParse(p.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>Admin's AdminId, or null.</summary>
    public static int? AdminId(this ClaimsPrincipal p) =>
        p.Identity?.IsAuthenticated == true && p.IsInRole(Roles.Admin) &&
        int.TryParse(p.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}

public static class AccessExtensions
{
    /// <summary>Applies RecipeAccessRules for the current viewer (guest, member or admin).</summary>
    public static async Task<bool> CanViewRecipeAsync(this RecipeAccessService s, ClaimsPrincipal user, bool isFree)
    {
        if (user.IsInRole(Roles.Admin)) return true;               // admins always see everything
        var id = user.MemberId();
        bool active = id != null && await s.GetActiveMembershipAsync(id.Value) != null;
        return RecipeAccessRules.CanViewFullRecipe(isFree, id != null, active);
    }
}

/// <summary>Splits newline-separated text into trimmed, non-empty rows.</summary>
public static class TextRows
{
    public static string[] Split(string? s) =>
        (s ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
