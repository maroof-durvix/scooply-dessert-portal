using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Book catalogue, ordering (guests and members), tracking.</summary>
[ApiController]
[Route("api/books")]
public class BooksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly OrderService _orders;
    public BooksController(AppDbContext db, OrderService orders) { _db = db; _orders = orders; }

    /// <summary>List with image, title, author, description, price and stock flag.</summary>
    [HttpGet]
    public async Task<IActionResult> List() => Ok(await _db.Books.AsNoTracking().Where(b => b.IsActive)
        .OrderBy(b => b.BookId).Select(b => new { b.BookId, b.Title, b.Author, b.Description, b.ImagePath, b.Price,
            InStock = b.Stock > 0 }).ToListAsync());

    /// <summary>Single book for the order form.</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var b = await _db.Books.AsNoTracking().Where(x => x.BookId == id && x.IsActive)
            .Select(x => new { x.BookId, x.Title, x.Author, x.Description, x.ImagePath, x.Price, InStock = x.Stock > 0, x.Stock })
            .FirstOrDefaultAsync();
        return b == null ? NotFound(new { error = "Book not found." }) : Ok(b);
    }

    /// <summary>Place an order. Works for guests and members (members' orders are linked to their account).</summary>
    [HttpPost("order")]
    public async Task<IActionResult> Order(OrderRequest r)
    {
        var outcome = await _orders.PlaceOrderAsync(r, User.MemberId());
        return StatusCode(outcome.Status, outcome.Body);
    }

    /// <summary>Order tracking by order number + email (no login needed).</summary>
    [HttpGet("track")]
    public async Task<IActionResult> Track([FromQuery] string orderNumber, [FromQuery] string email)
    {
        var no = (orderNumber ?? "").Trim().ToUpperInvariant();
        var em = (email ?? "").Trim().ToLowerInvariant();
        var o = await _db.BookOrders.AsNoTracking().Include(x => x.Book)
            .FirstOrDefaultAsync(x => x.OrderNumber == no && x.Email == em);
        if (o == null) return NotFound(new { error = "No order found for that number and email." });
        return Ok(new { o.OrderNumber, Status = o.Status.ToString(), StatusStep = (int)o.Status, o.OrderedAt,
                        o.StatusUpdatedAt, BookTitle = o.Book!.Title, o.Quantity, o.TotalCost });
    }

    /// <summary>My Orders (members).</summary>
    [Authorize(Roles = Roles.Member)]
    [HttpGet("my-orders")]
    public async Task<IActionResult> MyOrders()
    {
        int uid = User.MemberId()!.Value;
        // Status is stored as text, so the numeric step is computed after the rows are loaded (SQL can't CAST 'Sent' to int).
        var rows = await _db.BookOrders.AsNoTracking().Where(o => o.UserId == uid)
            .OrderByDescending(o => o.OrderedAt).Take(100)
            .Select(o => new { o.OrderNumber, BookTitle = o.Book!.Title, o.Quantity, o.TotalCost, o.Status, o.OrderedAt, o.StatusUpdatedAt })
            .ToListAsync();
        return Ok(rows.Select(o => new { o.OrderNumber, o.BookTitle, o.Quantity, o.TotalCost,
                                         Status = o.Status.ToString(), StatusStep = (int)o.Status, o.OrderedAt, o.StatusUpdatedAt }));
    }
}
