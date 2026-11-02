using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Home page data, About/Contact info, FAQs, contact form and newsletter.</summary>
[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RecipeAccessService _access;
    private readonly IConfiguration _cfg;
    public PublicController(AppDbContext db, RecipeAccessService access, IConfiguration cfg)
    { _db = db; _access = access; _cfg = cfg; }

    /// <summary>One call returns every Home section (SRS: includes the Top Recipe champions).</summary>
    [HttpGet("home")]
    public async Task<IActionResult> Home()
    {
        bool memberAccess = await _access.CanViewRecipeAsync(User, false);

        var famous = await _db.Flavors.AsNoTracking().Where(f => f.IsActive && f.IsMostFamous)
            .OrderBy(f => f.FlavorId).Take(10)
            .Select(f => new FlavorCard(f.FlavorId, f.Name, f.ImagePath, f.ShortDescription, f.IsFree, f.IsMostFamous,
                                        !f.IsFree && !memberAccess)).ToListAsync();

        var free = await _db.Flavors.AsNoTracking().Where(f => f.IsActive && f.IsFree).Take(6)
            .Select(f => new FlavorCard(f.FlavorId, f.Name, f.ImagePath, f.ShortDescription, true, f.IsMostFamous, false))
            .ToListAsync();

        var plans = await _db.MembershipPlans.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.Price)
            .Select(p => new { p.PlanId, p.Name, p.Price, p.DurationDays }).ToListAsync();

        var books = await _db.Books.AsNoTracking().Where(b => b.IsActive).OrderBy(b => b.BookId).Take(4)
            .Select(b => new { b.BookId, b.Title, b.Author, b.Description, b.ImagePath, b.Price, InStock = b.Stock > 0 }).ToListAsync();

        // TOP RECIPE section: winners the admin chose to show on Home
        var champions = await _db.RecipeSubmissions.AsNoTracking()
            .Where(s => s.Status == SubmissionStatus.Selected && s.ShowOnHome)
            .OrderByDescending(s => s.ReviewedAt).Take(12)
            .Select(s => new {
                s.SubmissionId,
                WinnerName = s.User!.FullName,
                s.RecipeTitle,
                s.ImagePath,
                s.Description,
                s.PrizeAmount,
                s.CertificateNumber,
                s.AdminRemarks,
                AwardedOn = s.ReviewedAt
            }).ToListAsync();

        var testimonials = await _db.Feedbacks.AsNoTracking().Where(f => f.IsFeatured)
            .OrderByDescending(f => f.SubmittedAt).Take(8)
            .Select(f => new { f.Name, f.Rating, f.Subject, f.Message }).ToListAsync();

        var branches = await _db.Branches.AsNoTracking().ToListAsync();
        var site = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var allFlavors = await _db.Flavors.CountAsync(f => f.IsActive);

        return Ok(new
        {
            stats = new { happyCustomers = _cfg.GetValue("Stats:HappyCustomers", 12000), flavors = allFlavors,
                          branches = branches.Count, recipes = await _db.Recipes.CountAsync() },
            flavorNames = await _db.Flavors.AsNoTracking().Where(f => f.IsActive).Select(f => f.Name).ToListAsync(),
            mostFamous = famous, freeRecipes = free, plans, books, champions, testimonials, branches, site
        });
    }

    /// <summary>About + Contact content (editable from Admin settings).</summary>
    [HttpGet("site")]
    public async Task<IActionResult> Site() => Ok(new
    {
        site = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(),
        branches = await _db.Branches.AsNoTracking().ToListAsync()
    });

    /// <summary>Active FAQs ordered for the accordion.</summary>
    [HttpGet("faqs")]
    public async Task<IActionResult> Faqs() => Ok(await _db.Faqs.AsNoTracking()
        .Where(f => f.IsActive).OrderBy(f => f.DisplayOrder).ToListAsync());

    /// <summary>Membership plans for the Register wizard.</summary>
    [HttpGet("plans")]
    public async Task<IActionResult> Plans() => Ok(await _db.MembershipPlans.AsNoTracking()
        .Where(p => p.IsActive).OrderBy(p => p.Price).ToListAsync());

    /// <summary>Contact Us form submission (stored for the admin).</summary>
    [HttpPost("contact")]
    public async Task<IActionResult> Contact(ContactRequest r)
    {
        _db.ContactMessages.Add(new ContactMessage { Name = r.Name.Trim(), Email = r.Email.Trim(),
            Subject = r.Subject.Trim(), Message = r.Message.Trim() });
        await _db.SaveChangesAsync();
        return Ok(new { message = "Thanks! We received your message." });
    }

    /// <summary>Footer newsletter box; duplicates are accepted silently.</summary>
    [HttpPost("newsletter")]
    public async Task<IActionResult> Newsletter(NewsletterRequest r)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        if (!await _db.NewsletterSubscribers.AnyAsync(n => n.Email == email))
        {
            _db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = email });
            await _db.SaveChangesAsync();
        }
        return Ok(new { message = "You're subscribed!" });
    }
}
