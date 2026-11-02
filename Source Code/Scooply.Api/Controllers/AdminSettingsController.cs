using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Admin: dashboard KPIs/charts, plans, FAQs, branches, site settings, password, activity log.</summary>
[Route("api/admin")]
public class AdminSettingsController : AdminBase
{
    public AdminSettingsController(AppDbContext db) : base(db) { }

    /// <summary>KPI cards + chart series (last 6 months).</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var now = DateTime.UtcNow;
        var since = new DateTime(now.Year, now.Month, 1).AddMonths(-5);

        var okPayments = Db.Payments.AsNoTracking().Where(p => p.Status == PaymentStatus.Success);
        decimal memberRev = await okPayments.Where(p => p.PaymentType == PaymentType.Membership).SumAsync(p => (decimal?)p.Amount) ?? 0;
        decimal bookRev = await okPayments.Where(p => p.PaymentType == PaymentType.BookOrder).SumAsync(p => (decimal?)p.Amount) ?? 0;

        var byStatus = await Db.BookOrders.AsNoTracking().GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key.ToString(), Count = g.Count() }).ToListAsync();

        // Group in memory by month: tiny result sets, avoids provider-specific date SQL
        var pay = await okPayments.Where(p => p.PaidAt >= since).Select(p => new { p.PaidAt, p.Amount }).ToListAsync();
        var usr = await Db.Users.AsNoTracking().Where(u => u.CreatedAt >= since).Select(u => u.CreatedAt).ToListAsync();
        var months = Enumerable.Range(0, 6).Select(i => since.AddMonths(i)).ToList();

        return Ok(new
        {
            totalMembers = await Db.Users.CountAsync(),
            activeMemberships = await Db.Memberships.CountAsync(m => m.StartDate <= now && m.EndDate >= now),
            revenue = new { memberships = memberRev, books = bookRev, total = memberRev + bookRev },
            orders = new { total = byStatus.Sum(x => x.Count), byStatus },
            pendingFeedbacks = await Db.Feedbacks.CountAsync(f => !f.IsRead),
            pendingSubmissions = await Db.RecipeSubmissions.CountAsync(s => s.Status == SubmissionStatus.Pending),
            charts = new
            {
                labels = months.Select(m => m.ToString("MMM yyyy")),
                revenue = months.Select(m => pay.Where(p => p.PaidAt.Year == m.Year && p.PaidAt.Month == m.Month).Sum(p => p.Amount)),
                newMembers = months.Select(m => usr.Count(u => u.Year == m.Year && u.Month == m.Month))
            }
        });
    }

    // ---------------- Plans ----------------
    [HttpGet("plans")]
    public async Task<IActionResult> Plans() => Ok(await Db.MembershipPlans.AsNoTracking().OrderBy(p => p.Price).ToListAsync());

    [HttpPut("plans/{id:int}")]
    public async Task<IActionResult> UpdatePlan(int id, PlanUpdateRequest r)
    {
        if (r.Price <= 0 || r.DurationDays < 1) return BadRequest(new { error = "Price and duration must be positive." });
        var p = await Db.MembershipPlans.FindAsync(id); if (p == null) return NotFound();
        p.Name = r.Name.Trim(); p.Price = r.Price; p.DurationDays = r.DurationDays; p.IsActive = r.IsActive;
        Log($"Updated plan {p.Name} price {p.Price}"); await Db.SaveChangesAsync();
        return Ok(new { message = "Plan updated." });
    }

    // ---------------- FAQs ----------------
    [HttpGet("faqs")]
    public async Task<IActionResult> Faqs() => Ok(await Db.Faqs.AsNoTracking().OrderBy(f => f.DisplayOrder).ToListAsync());

    [HttpPost("faqs")]
    public async Task<IActionResult> AddFaq(FaqRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Question) || string.IsNullOrWhiteSpace(r.Answer)) return BadRequest(new { error = "Question and answer are required." });
        var f = new Faq { Category = r.Category, Question = r.Question.Trim(), Answer = r.Answer.Trim(), DisplayOrder = r.DisplayOrder, IsActive = r.IsActive };
        Db.Faqs.Add(f); Log("Added FAQ"); await Db.SaveChangesAsync(); return Ok(f);
    }

    [HttpPut("faqs/{id:int}")]
    public async Task<IActionResult> UpdateFaq(int id, FaqRequest r)
    {
        var f = await Db.Faqs.FindAsync(id); if (f == null) return NotFound();
        f.Category = r.Category; f.Question = r.Question.Trim(); f.Answer = r.Answer.Trim(); f.DisplayOrder = r.DisplayOrder; f.IsActive = r.IsActive;
        Log($"Updated FAQ {id}"); await Db.SaveChangesAsync(); return Ok(f);
    }

    [HttpDelete("faqs/{id:int}")]
    public async Task<IActionResult> DeleteFaq(int id)
    {
        var f = await Db.Faqs.FindAsync(id); if (f == null) return NotFound();
        Db.Faqs.Remove(f); Log($"Deleted FAQ {id}"); await Db.SaveChangesAsync(); return Ok(new { message = "Deleted." });
    }

    // ---------------- Branches ----------------
    [HttpGet("branches")]
    public async Task<IActionResult> Branches() => Ok(await Db.Branches.AsNoTracking().ToListAsync());

    [HttpPost("branches")]
    public async Task<IActionResult> AddBranch(BranchRequest r)
    {
        var b = new Branch { Name = r.Name.Trim(), Address = r.Address.Trim(), Phone = r.Phone.Trim(), MapEmbedUrl = r.MapEmbedUrl };
        Db.Branches.Add(b); Log($"Added branch {b.Name}"); await Db.SaveChangesAsync(); return Ok(b);
    }

    [HttpPut("branches/{id:int}")]
    public async Task<IActionResult> UpdateBranch(int id, BranchRequest r)
    {
        var b = await Db.Branches.FindAsync(id); if (b == null) return NotFound();
        b.Name = r.Name.Trim(); b.Address = r.Address.Trim(); b.Phone = r.Phone.Trim(); b.MapEmbedUrl = r.MapEmbedUrl;
        Log($"Updated branch {id}"); await Db.SaveChangesAsync(); return Ok(b);
    }

    [HttpDelete("branches/{id:int}")]
    public async Task<IActionResult> DeleteBranch(int id)
    {
        var b = await Db.Branches.FindAsync(id); if (b == null) return NotFound();
        Db.Branches.Remove(b); Log($"Deleted branch {id}"); await Db.SaveChangesAsync(); return Ok(new { message = "Deleted." });
    }

    // ---------------- Site settings ----------------
    [HttpGet("site")]
    public async Task<IActionResult> Site() => Ok(await Db.SiteSettings.AsNoTracking().FirstAsync());

    [HttpPut("site")]
    public async Task<IActionResult> UpdateSite(SiteSettingRequest r)
    {
        var s = await Db.SiteSettings.FirstAsync();
        s.ShopName = r.ShopName.Trim(); s.OwnerName = r.OwnerName.Trim(); s.Phone = r.Phone.Trim(); s.Email = r.Email.Trim();
        s.Address = r.Address.Trim(); s.WorkingHours = r.WorkingHours.Trim(); s.AboutText = r.AboutText.Trim(); s.OwnerQuote = r.OwnerQuote.Trim();
        Log("Updated site settings"); await Db.SaveChangesAsync(); return Ok(new { message = "Settings saved." });
    }

    // ---------------- Password + activity ----------------
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(AdminPasswordRequest r)
    {
        var a = await Db.Admins.FirstAsync(x => x.AdminId == AdminId);
        if (!BCrypt.Net.BCrypt.Verify(r.CurrentPassword, a.PasswordHash)) return BadRequest(new { error = "Current password is incorrect." });
        if (!PasswordRules.IsStrong(r.NewPassword)) return BadRequest(new { error = PasswordRules.Message });
        a.PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.NewPassword);
        Log("Changed admin password"); await Db.SaveChangesAsync();
        return Ok(new { message = "Password changed." });
    }

    [HttpGet("activity")]
    public async Task<IActionResult> Activity() => Ok(await Db.ActivityLogs.AsNoTracking().OrderByDescending(a => a.At).Take(100).ToListAsync());
}
