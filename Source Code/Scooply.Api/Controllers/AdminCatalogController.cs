using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Admin: flavors + recipes (R15, R17) and books.</summary>
[Route("api/admin")]
public class AdminCatalogController : AdminBase
{
    private readonly IFileUploadService _files;
    public AdminCatalogController(AppDbContext db, IFileUploadService files) : base(db) => _files = files;

    // ---------------- Flavors & recipes ----------------

    [HttpGet("flavors")]
    public async Task<IActionResult> Flavors([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var q = Db.Flavors.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(f => f.Name.Contains(search.Trim()));
        var total = await q.CountAsync();
        var items = await q.OrderBy(f => f.Name).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(f => new { f.FlavorId, f.Name, f.ImagePath, f.ShortDescription, f.IsFree, f.IsMostFamous, f.IsActive }).ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("flavors/{id:int}")]
    public async Task<IActionResult> Flavor(int id)
    {
        var f = await Db.Flavors.AsNoTracking().Include(x => x.Recipe).FirstOrDefaultAsync(x => x.FlavorId == id);
        if (f == null) return NotFound();
        return Ok(new { f.FlavorId, f.Name, f.ImagePath, f.ShortDescription, f.IsFree, f.IsMostFamous, f.IsActive,
                        Ingredients = f.Recipe?.Ingredients ?? "", Procedure = f.Recipe?.Procedure ?? "",
                        PrepTimeMinutes = f.Recipe?.PrepTimeMinutes ?? 30, Servings = f.Recipe?.Servings ?? 6 });
    }

    /// <summary>Create a flavor and its recipe (image required for a new flavor).</summary>
    [HttpPost("flavors")]
    public async Task<IActionResult> CreateFlavor([FromForm] FlavorForm f)
    {
        if (await Db.Flavors.AnyAsync(x => x.Name == f.Name.Trim())) return Conflict(new { error = "A flavor with this name already exists." });
        if (f.Image == null) return BadRequest(new { error = "Please upload an image." });
        string path;
        try { path = await _files.SaveImageAsync(f.Image, "flavors"); }
        catch (UploadException ex) { return BadRequest(new { error = ex.Message }); }

        var flavor = new Flavor { Name = f.Name.Trim(), ShortDescription = f.ShortDescription.Trim(), ImagePath = path,
            IsFree = f.IsFree, IsMostFamous = f.IsMostFamous, IsActive = f.IsActive,
            Recipe = new Recipe { Ingredients = string.Join("\n", TextRows.Split(f.Ingredients)),
                Procedure = string.Join("\n", TextRows.Split(f.Procedure)), PrepTimeMinutes = f.PrepTimeMinutes,
                Servings = f.Servings, UpdatedByAdminId = AdminId } };
        Db.Flavors.Add(flavor);
        Log($"Added flavor '{flavor.Name}'");
        await Db.SaveChangesAsync();
        return Ok(new { flavor.FlavorId, message = "Flavor added." });
    }

    /// <summary>Update flavor + recipe; a new image replaces (and deletes) the old upload.</summary>
    [HttpPut("flavors/{id:int}")]
    public async Task<IActionResult> UpdateFlavor(int id, [FromForm] FlavorForm f)
    {
        var flavor = await Db.Flavors.Include(x => x.Recipe).FirstOrDefaultAsync(x => x.FlavorId == id);
        if (flavor == null) return NotFound();
        if (await Db.Flavors.AnyAsync(x => x.Name == f.Name.Trim() && x.FlavorId != id)) return Conflict(new { error = "Name already used." });

        if (f.Image != null)
        {
            try { var np = await _files.SaveImageAsync(f.Image, "flavors"); _files.Delete(flavor.ImagePath); flavor.ImagePath = np; }
            catch (UploadException ex) { return BadRequest(new { error = ex.Message }); }
        }
        flavor.Name = f.Name.Trim(); flavor.ShortDescription = f.ShortDescription.Trim();
        flavor.IsFree = f.IsFree; flavor.IsMostFamous = f.IsMostFamous; flavor.IsActive = f.IsActive;
        flavor.Recipe ??= new Recipe();
        flavor.Recipe.Ingredients = string.Join("\n", TextRows.Split(f.Ingredients));
        flavor.Recipe.Procedure = string.Join("\n", TextRows.Split(f.Procedure));
        flavor.Recipe.PrepTimeMinutes = f.PrepTimeMinutes; flavor.Recipe.Servings = f.Servings;
        flavor.Recipe.UpdatedAt = DateTime.UtcNow; flavor.Recipe.UpdatedByAdminId = AdminId;
        Log($"Updated flavor '{flavor.Name}'");
        await Db.SaveChangesAsync();
        return Ok(new { message = "Flavor updated." });
    }

    /// <summary>Soft delete: hides the flavor but keeps history.</summary>
    [HttpDelete("flavors/{id:int}")]
    public async Task<IActionResult> DeleteFlavor(int id)
    {
        var f = await Db.Flavors.FindAsync(id);
        if (f == null) return NotFound();
        f.IsActive = false; Log($"Deactivated flavor '{f.Name}'");
        await Db.SaveChangesAsync();
        return Ok(new { message = "Flavor deactivated." });
    }

    // ---------------- Books ----------------

    [HttpGet("books")]
    public async Task<IActionResult> Books() => Ok(await Db.Books.AsNoTracking().OrderBy(b => b.BookId).ToListAsync());

    [HttpPost("books")]
    public async Task<IActionResult> CreateBook([FromForm] BookForm f)
    {
        if (f.Image == null) return BadRequest(new { error = "Please upload a cover image." });
        string path;
        try { path = await _files.SaveImageAsync(f.Image, "books"); }
        catch (UploadException ex) { return BadRequest(new { error = ex.Message }); }
        var b = new Book { Title = f.Title.Trim(), Author = f.Author.Trim(), Description = f.Description.Trim(),
            Price = f.Price, Stock = f.Stock, IsActive = f.IsActive, ImagePath = path };
        Db.Books.Add(b); Log($"Added book '{b.Title}'");
        await Db.SaveChangesAsync();
        return Ok(new { b.BookId, message = "Book added." });
    }

    [HttpPut("books/{id:int}")]
    public async Task<IActionResult> UpdateBook(int id, [FromForm] BookForm f)
    {
        var b = await Db.Books.FindAsync(id);
        if (b == null) return NotFound();
        if (f.Image != null)
        {
            try { var np = await _files.SaveImageAsync(f.Image, "books"); _files.Delete(b.ImagePath); b.ImagePath = np; }
            catch (UploadException ex) { return BadRequest(new { error = ex.Message }); }
        }
        b.Title = f.Title.Trim(); b.Author = f.Author.Trim(); b.Description = f.Description.Trim();
        b.Price = f.Price; b.Stock = f.Stock; b.IsActive = f.IsActive;
        Log($"Updated book '{b.Title}'");
        await Db.SaveChangesAsync();
        return Ok(new { message = "Book updated." });
    }

    /// <summary>Soft delete (orders reference books, so rows are never removed).</summary>
    [HttpDelete("books/{id:int}")]
    public async Task<IActionResult> DeleteBook(int id)
    {
        var b = await Db.Books.FindAsync(id);
        if (b == null) return NotFound();
        b.IsActive = false; Log($"Deactivated book '{b.Title}'");
        await Db.SaveChangesAsync();
        return Ok(new { message = "Book deactivated." });
    }
}
