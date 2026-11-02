using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Admin: feedbacks (R20), contact messages and new recipe submissions (R21, R22, R23).</summary>
[Route("api/admin")]
public class AdminCommunityController : AdminBase
{
    private readonly CertificateService _cert;
    public AdminCommunityController(AppDbContext db, CertificateService cert) : base(db) => _cert = cert;

    // ---------------- Feedback ----------------

    [HttpGet("feedback")]
    public async Task<IActionResult> Feedback([FromQuery] int? rating, [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var q = Db.Feedbacks.AsNoTracking().AsQueryable();
        if (rating.HasValue) q = q.Where(f => f.Rating == rating);
        if (from.HasValue) q = q.Where(f => f.SubmittedAt >= from.Value);
        if (to.HasValue) q = q.Where(f => f.SubmittedAt <= to.Value.AddDays(1));
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.SubmittedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(f => new { f.FeedbackId, f.Name, f.Email, f.Rating, f.Subject, f.Message, f.SubmittedAt, f.IsRead, f.IsFeatured,
                UserType = f.UserId == null ? "Guest" : "Registered" }).ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("feedback/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var f = await Db.Feedbacks.FindAsync(id); if (f == null) return NotFound();
        f.IsRead = true; await Db.SaveChangesAsync(); return Ok(new { f.IsRead });
    }

    /// <summary>Toggle "feature on Home page" (testimonial).</summary>
    [HttpPost("feedback/{id:int}/feature")]
    public async Task<IActionResult> Feature(int id)
    {
        var f = await Db.Feedbacks.FindAsync(id); if (f == null) return NotFound();
        f.IsFeatured = !f.IsFeatured; Log($"Feedback {id} featured={f.IsFeatured}"); await Db.SaveChangesAsync();
        return Ok(new { f.IsFeatured });
    }

    [HttpDelete("feedback/{id:int}")]
    public async Task<IActionResult> DeleteFeedback(int id)
    {
        var f = await Db.Feedbacks.FindAsync(id); if (f == null) return NotFound();
        Db.Feedbacks.Remove(f); Log($"Deleted feedback {id}"); await Db.SaveChangesAsync(); return Ok(new { message = "Deleted." });
    }

    [HttpGet("contact-messages")]
    public async Task<IActionResult> ContactMessages([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var total = await Db.ContactMessages.CountAsync();
        var items = await Db.ContactMessages.AsNoTracking().OrderByDescending(m => m.SentAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    // ---------------- Recipe submissions ----------------

    [HttpGet("submissions")]
    public async Task<IActionResult> Submissions([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var q = Db.RecipeSubmissions.AsNoTracking().AsQueryable();
        if (Enum.TryParse<SubmissionStatus>(status, true, out var st)) q = q.Where(s => s.Status == st);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(s => s.SubmittedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new { s.SubmissionId, UserName = s.User!.FullName, s.User.Email, s.RecipeTitle, s.Description, s.Ingredients,
                s.Procedure, s.ImagePath, Status = s.Status.ToString(), s.PrizeAmount, s.AdminRemarks, s.CertificateNumber,
                s.SubmittedAt, s.ReviewedAt, s.ShowOnHome }).ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>Select a winner: prize (admin-decided), remarks, show-on-home flag; auto certificate number.</summary>
    [HttpPost("submissions/{id:int}/select")]
    public async Task<IActionResult> Select(int id, SelectSubmissionRequest r)
    {
        if (r.PrizeAmount < 0 || r.PrizeAmount > 1_000_000) return BadRequest(new { error = "Enter a valid prize amount." });
        var s = await Db.RecipeSubmissions.FindAsync(id); if (s == null) return NotFound();
        s.Status = SubmissionStatus.Selected; s.PrizeAmount = r.PrizeAmount; s.AdminRemarks = r.Remarks?.Trim();
        s.ShowOnHome = r.ShowOnHome; s.ReviewedAt = DateTime.UtcNow;
        s.CertificateNumber ??= $"SCP-CERT-{DateTime.UtcNow.Year}-{s.SubmissionId:0000}";
        Log($"Selected submission {id} prize {r.PrizeAmount}");
        await Db.SaveChangesAsync();
        return Ok(new { message = "Recipe selected.", s.CertificateNumber });
    }

    [HttpPost("submissions/{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, RejectSubmissionRequest r)
    {
        var s = await Db.RecipeSubmissions.FindAsync(id); if (s == null) return NotFound();
        s.Status = SubmissionStatus.Rejected; s.AdminRemarks = r.Remarks?.Trim(); s.ShowOnHome = false;
        s.PrizeAmount = null; s.ReviewedAt = DateTime.UtcNow;
        Log($"Rejected submission {id}"); await Db.SaveChangesAsync();
        return Ok(new { message = "Submission rejected." });
    }

    /// <summary>Revert to Pending (clears prize and home flag).</summary>
    [HttpPost("submissions/{id:int}/pending")]
    public async Task<IActionResult> Revert(int id)
    {
        var s = await Db.RecipeSubmissions.FindAsync(id); if (s == null) return NotFound();
        s.Status = SubmissionStatus.Pending; s.PrizeAmount = null; s.ShowOnHome = false; s.ReviewedAt = null;
        Log($"Reverted submission {id} to pending"); await Db.SaveChangesAsync();
        return Ok(new { message = "Reverted to pending." });
    }

    [HttpGet("submissions/{id:int}/certificate")]
    public async Task<IActionResult> Certificate(int id)
    {
        var s = await Db.RecipeSubmissions.Include(x => x.User).FirstOrDefaultAsync(x => x.SubmissionId == id && x.Status == SubmissionStatus.Selected);
        if (s == null) return NotFound(new { error = "Only selected submissions have certificates." });
        var site = await Db.SiteSettings.AsNoTracking().FirstAsync();
        return File(_cert.Generate(s, site), "application/pdf", $"{s.CertificateNumber}.pdf");
    }
}
