using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Flavor listing, recipe details (locked/unlocked), free and most-famous pages, contest submissions.</summary>
[ApiController]
[Route("api/recipes")]
public class RecipesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RecipeAccessService _access;
    private readonly IFileUploadService _files;
    private readonly CertificateService _cert;
    public RecipesController(AppDbContext db, RecipeAccessService access, IFileUploadService files, CertificateService cert)
    { _db = db; _access = access; _files = files; _cert = cert; }

    /// <summary>All active flavors (cards only). filter: all|free|famous; sort: name|newest.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] string filter = "all", [FromQuery] string sort = "name")
    {
        bool paid = await _access.CanViewRecipeAsync(User, false);
        var q = _db.Flavors.AsNoTracking().Where(f => f.IsActive);
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(f => f.Name.Contains(search.Trim()));
        if (filter == "free") q = q.Where(f => f.IsFree);
        if (filter == "famous") q = q.Where(f => f.IsMostFamous);
        q = sort == "newest" ? q.OrderByDescending(f => f.FlavorId) : q.OrderBy(f => f.Name);

        var items = await q.Take(100).Select(f => new FlavorCard(f.FlavorId, f.Name, f.ImagePath, f.ShortDescription,
            f.IsFree, f.IsMostFamous, !f.IsFree && !paid)).ToListAsync();
        return Ok(items);
    }

    /// <summary>Free Recipe Available page: fully visible recipes for everyone.</summary>
    [HttpGet("free")]
    public async Task<IActionResult> Free()
    {
        var flavors = await _db.Flavors.AsNoTracking().Include(f => f.Recipe)
            .Where(f => f.IsActive && f.IsFree).OrderBy(f => f.Name).ToListAsync();
        return Ok(flavors.Select(f => ToDetail(f, false)));
    }

    /// <summary>Most Famous Flavors: enabled for registered members only (SRS).</summary>
    [Authorize(Roles = Roles.Member + "," + Roles.Admin)]
    [HttpGet("most-famous")]
    public async Task<IActionResult> MostFamous()
    {
        bool locked = !await _access.CanViewRecipeAsync(User, false);
        var items = await _db.Flavors.AsNoTracking().Where(f => f.IsActive && f.IsMostFamous).OrderBy(f => f.Name)
            .Select(f => new FlavorCard(f.FlavorId, f.Name, f.ImagePath, f.ShortDescription, f.IsFree, true, !f.IsFree && locked))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>Recipe details. Ingredients and steps are omitted when the viewer has no access (R5/R6).</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Details(int id)
    {
        var f = await _db.Flavors.AsNoTracking().Include(x => x.Recipe).FirstOrDefaultAsync(x => x.FlavorId == id && x.IsActive);
        if (f == null) return NotFound(new { error = "Flavor not found." });
        bool locked = !await _access.CanViewRecipeAsync(User, f.IsFree);
        return Ok(ToDetail(f, locked));
    }

    /// <summary>Maps a flavor to the DTO, stripping recipe text when locked.</summary>
    private static RecipeDetail ToDetail(Flavor f, bool locked) => new(f.FlavorId, f.Name, f.ImagePath, f.ShortDescription,
        f.IsFree, f.IsMostFamous, locked, f.Recipe?.PrepTimeMinutes ?? 0, f.Recipe?.Servings ?? 0,
        locked ? null : TextRows.Split(f.Recipe?.Ingredients), locked ? null : TextRows.Split(f.Recipe?.Procedure));

    // ---------------- Contest ----------------

    /// <summary>Submit a recipe (members only). Starts as Pending.</summary>
    [Authorize(Roles = Roles.Member)]
    [HttpPost("submit")]
    [RequestSizeLimit(4 * 1024 * 1024)]
    public async Task<IActionResult> Submit([FromForm] SubmissionForm f)
    {
        int uid = User.MemberId()!.Value;
        string path;
        try { path = await _files.SaveImageAsync(f.Image, "submissions"); }
        catch (UploadException ex) { return BadRequest(new { error = ex.Message }); }

        var desc = f.Description.Trim() + (string.IsNullOrWhiteSpace(f.Notes) ? "" : $"\nNotes: {f.Notes.Trim()}");
        _db.RecipeSubmissions.Add(new RecipeSubmission
        {
            UserId = uid, RecipeTitle = f.RecipeTitle.Trim(), Description = desc,
            Ingredients = string.Join("\n", TextRows.Split(f.Ingredients)),
            Procedure = string.Join("\n", TextRows.Split(f.Procedure)), ImagePath = path,
            Status = SubmissionStatus.Pending
        });
        await _db.SaveChangesAsync();
        return Ok(new { message = "Recipe submitted! We'll review it soon." });
    }

    /// <summary>The member's own submissions (IDOR-safe: filtered by token user id).</summary>
    [Authorize(Roles = Roles.Member)]
    [HttpGet("my-submissions")]
    public async Task<IActionResult> MySubmissions()
    {
        int uid = User.MemberId()!.Value;
        return Ok(await _db.RecipeSubmissions.AsNoTracking().Where(s => s.UserId == uid)
            .OrderByDescending(s => s.SubmittedAt).Take(100)
            .Select(s => new { s.SubmissionId, s.RecipeTitle, s.ImagePath, Status = s.Status.ToString(), s.PrizeAmount,
                               s.AdminRemarks, s.CertificateNumber, s.SubmittedAt, s.ReviewedAt }).ToListAsync());
    }

    /// <summary>Certificate PDF for the member's own Selected submission.</summary>
    [Authorize(Roles = Roles.Member)]
    [HttpGet("submissions/{id:int}/certificate")]
    public async Task<IActionResult> Certificate(int id)
    {
        int uid = User.MemberId()!.Value;
        var s = await _db.RecipeSubmissions.Include(x => x.User)
            .FirstOrDefaultAsync(x => x.SubmissionId == id && x.UserId == uid && x.Status == SubmissionStatus.Selected);
        if (s == null) return NotFound(new { error = "Certificate not available." });
        var site = await _db.SiteSettings.AsNoTracking().FirstAsync();
        return File(_cert.Generate(s, site), "application/pdf", $"{s.CertificateNumber}.pdf");
    }
}
