using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Scooply.Api.Data;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Base for every admin controller: Admin role required + activity logging helper.</summary>
[ApiController]
[Authorize(Roles = Roles.Admin)]
public abstract class AdminBase : ControllerBase
{
    protected readonly AppDbContext Db;
    protected AdminBase(AppDbContext db) => Db = db;
    protected int AdminId => User.AdminId()!.Value;

    /// <summary>Queues an activity-log row (saved with the caller's next SaveChanges).</summary>
    protected void Log(string action) => Db.ActivityLogs.Add(new ActivityLog { AdminId = AdminId, Action = action });

    /// <summary>Escapes a CSV cell and neutralises spreadsheet formulas (=,+,-,@).</summary>
    protected static string Csv(object? v)
    {
        var s = v?.ToString() ?? "";
        if (s.Length > 0 && "=+-@".Contains(s[0])) s = "'" + s;
        return "\"" + s.Replace("\"", "\"\"") + "\"";
    }
}
