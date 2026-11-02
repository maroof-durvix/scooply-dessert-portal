using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>Database-backed membership lookups used by auth and recipe endpoints.</summary>
public class RecipeAccessService
{
    private readonly AppDbContext _db;
    public RecipeAccessService(AppDbContext db) => _db = db;

    /// <summary>Latest-ending membership for the user that is currently active, or null.</summary>
    public async Task<Membership?> GetActiveMembershipAsync(int userId)
    {
        var now = DateTime.UtcNow;
        return await _db.Memberships.AsNoTracking()
            .Include(m => m.Plan)
            .Where(m => m.UserId == userId && m.StartDate <= now && m.EndDate >= now)
            .OrderByDescending(m => m.EndDate)
            .FirstOrDefaultAsync();
    }

    /// <summary>Latest membership end date regardless of status (used for renewals).</summary>
    public async Task<DateTime?> GetLatestEndDateAsync(int userId) =>
        await _db.Memberships.Where(m => m.UserId == userId)
            .OrderByDescending(m => m.EndDate).Select(m => (DateTime?)m.EndDate).FirstOrDefaultAsync();
}
