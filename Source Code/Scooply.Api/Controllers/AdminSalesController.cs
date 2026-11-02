using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Admin: registered users + payment details (R18), payments report, book orders + status (R19).</summary>
[Route("api/admin")]
public class AdminSalesController : AdminBase
{
    public AdminSalesController(AppDbContext db) : base(db) { }

    /// <summary>Row shape shared by the members list and the CSV export.</summary>
    private IQueryable<MemberRow> MemberQuery(string? search, string? plan, string? status, DateTime? from, DateTime? to)
    {
        var now = DateTime.UtcNow;
        var q = Db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(u => u.FullName.Contains(s) || u.Username.Contains(s) || u.Email.Contains(s));
        }
        if (from.HasValue) q = q.Where(u => u.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(u => u.CreatedAt <= to.Value.AddDays(1));

        var rows = q.Select(u => new MemberRow
        {
            UserId = u.UserId, FullName = u.FullName, Username = u.Username, Email = u.Email, Phone = u.Phone,
            IsActive = u.IsActive, JoinedAt = u.CreatedAt,
            Plan = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => m.Plan!.Name).FirstOrDefault(),
            StartDate = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => (DateTime?)m.StartDate).FirstOrDefault(),
            EndDate = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => (DateTime?)m.EndDate).FirstOrDefault(),
            Amount = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => (decimal?)m.Payment!.Amount).FirstOrDefault(),
            CardType = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => m.Payment!.CardType.ToString()).FirstOrDefault(),
            CardLast4 = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => m.Payment!.CardLast4).FirstOrDefault(),
            TransactionRef = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => (Guid?)m.Payment!.TransactionRef).FirstOrDefault(),
            PaidAt = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => (DateTime?)m.Payment!.PaidAt).FirstOrDefault(),
            PaymentStatus = u.Memberships.OrderByDescending(m => m.EndDate).Select(m => m.Payment!.Status.ToString()).FirstOrDefault()
        });
        if (!string.IsNullOrWhiteSpace(plan)) rows = rows.Where(r => r.Plan == plan);
        if (status == "active") rows = rows.Where(r => r.EndDate >= now);
        if (status == "expired") rows = rows.Where(r => r.EndDate < now);
        return rows;
    }

    public class MemberRow
    {
        public int UserId { get; set; } public string FullName { get; set; } = ""; public string Username { get; set; } = "";
        public string Email { get; set; } = ""; public string Phone { get; set; } = ""; public bool IsActive { get; set; }
        public DateTime JoinedAt { get; set; } public string? Plan { get; set; }
        public DateTime? StartDate { get; set; } public DateTime? EndDate { get; set; }
        public decimal? Amount { get; set; } public string? CardType { get; set; } public string? CardLast4 { get; set; }
        public Guid? TransactionRef { get; set; } public DateTime? PaidAt { get; set; } public string? PaymentStatus { get; set; }
    }

    [HttpGet("members")]
    public async Task<IActionResult> Members([FromQuery] string? search, [FromQuery] string? plan, [FromQuery] string? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string sort = "joined", [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var q = MemberQuery(search, plan, status, from, to);
        q = sort switch { "name" => q.OrderBy(r => r.FullName), "end" => q.OrderBy(r => r.EndDate), _ => q.OrderByDescending(r => r.JoinedAt) };
        var total = await q.CountAsync();
        return Ok(new { items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(), total, page, pageSize });
    }

    /// <summary>CSV export (opens in Excel). Capped at 5000 rows.</summary>
    [HttpGet("members/export")]
    public async Task<IActionResult> ExportMembers([FromQuery] string? search, [FromQuery] string? plan, [FromQuery] string? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var rows = await MemberQuery(search, plan, status, from, to).OrderBy(r => r.FullName).Take(5000).ToListAsync();
        var sb = new StringBuilder("Name,Username,Email,Phone,Plan,Start,End,Amount,CardType,Last4,TransactionRef,PaidAt,PaymentStatus,Active\n");
        foreach (var r in rows)
            sb.AppendLine(string.Join(",", new object?[] { r.FullName, r.Username, r.Email, r.Phone, r.Plan, r.StartDate?.ToString("yyyy-MM-dd"),
                r.EndDate?.ToString("yyyy-MM-dd"), r.Amount, r.CardType, r.CardLast4, r.TransactionRef, r.PaidAt?.ToString("yyyy-MM-dd HH:mm"),
                r.PaymentStatus, r.IsActive }.Select(Csv)));
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "members.csv");
    }

    [HttpPost("members/{id:int}/toggle")]
    public async Task<IActionResult> ToggleMember(int id)
    {
        var u = await Db.Users.FindAsync(id);
        if (u == null) return NotFound();
        u.IsActive = !u.IsActive; Log($"{(u.IsActive ? "Activated" : "Deactivated")} user {u.Username}");
        await Db.SaveChangesAsync();
        return Ok(new { u.IsActive });
    }

    // ---------------- Payments report ----------------

    private IQueryable<Payment> PaymentQuery(string? type, string? status, DateTime? from, DateTime? to)
    {
        var q = Db.Payments.AsNoTracking().AsQueryable();
        if (Enum.TryParse<PaymentType>(type, true, out var t)) q = q.Where(p => p.PaymentType == t);
        if (Enum.TryParse<PaymentStatus>(status, true, out var s)) q = q.Where(p => p.Status == s);
        if (from.HasValue) q = q.Where(p => p.PaidAt >= from.Value);
        if (to.HasValue) q = q.Where(p => p.PaidAt <= to.Value.AddDays(1));
        return q;
    }

    [HttpGet("payments")]
    public async Task<IActionResult> Payments([FromQuery] string? type, [FromQuery] string? status, [FromQuery] DateTime? from,
        [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 15)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var q = PaymentQuery(type, status, from, to);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(p => p.PaidAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new { p.PaymentId, p.UserId, Type = p.PaymentType.ToString(), p.Amount, CardType = p.CardType.ToString(),
                p.CardLast4, p.CardHolderName, p.TransactionRef, Status = p.Status.ToString(), p.FailureReason, p.PaidAt }).ToListAsync();
        var revenue = await q.Where(p => p.Status == PaymentStatus.Success).SumAsync(p => (decimal?)p.Amount) ?? 0;
        return Ok(new { items, total, page, pageSize, revenue });
    }

    [HttpGet("payments/export")]
    public async Task<IActionResult> ExportPayments([FromQuery] string? type, [FromQuery] string? status, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var rows = await PaymentQuery(type, status, from, to).OrderByDescending(p => p.PaidAt).Take(5000).ToListAsync();
        var sb = new StringBuilder("PaymentId,Type,Amount,CardType,Last4,Holder,TransactionRef,Status,Reason,PaidAt\n");
        foreach (var p in rows)
            sb.AppendLine(string.Join(",", new object?[] { p.PaymentId, p.PaymentType, p.Amount, p.CardType, p.CardLast4, p.CardHolderName,
                p.TransactionRef, p.Status, p.FailureReason, p.PaidAt.ToString("yyyy-MM-dd HH:mm") }.Select(Csv)));
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "payments.csv");
    }

    // ---------------- Book orders ----------------

    private IQueryable<BookOrder> OrderQuery(string? status, string? search, DateTime? from, DateTime? to)
    {
        var q = Db.BookOrders.AsNoTracking().AsQueryable();
        if (Enum.TryParse<OrderStatus>(status, true, out var st)) q = q.Where(o => o.Status == st);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(o => o.OrderNumber.Contains(s) || o.CustomerName.Contains(s) || o.Email.Contains(s));
        }
        if (from.HasValue) q = q.Where(o => o.OrderedAt >= from.Value);
        if (to.HasValue) q = q.Where(o => o.OrderedAt <= to.Value.AddDays(1));
        return q;
    }

    [HttpGet("orders")]
    public async Task<IActionResult> Orders([FromQuery] string? status, [FromQuery] string? search, [FromQuery] DateTime? from,
        [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var q = OrderQuery(status, search, from, to);
        var total = await q.CountAsync();
        // Statuses are stored as text: load the enums, then derive the display string and numeric step in memory.
        var rows = await q.OrderByDescending(o => o.OrderedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new { o.OrderId, o.OrderNumber, o.CustomerName, o.Email, o.ContactNumber, o.Address, BookTitle = o.Book!.Title,
                o.Quantity, o.TotalCost, PayStatus = o.Payment!.Status, CardLast4 = o.Payment.CardLast4, o.Status, o.OrderedAt, o.StatusUpdatedAt })
            .ToListAsync();
        var items = rows.Select(o => new { o.OrderId, o.OrderNumber, o.CustomerName, o.Email, o.ContactNumber, o.Address, o.BookTitle,
            o.Quantity, o.TotalCost, PaymentStatus = o.PayStatus.ToString(), o.CardLast4,
            Status = o.Status.ToString(), StatusStep = (int)o.Status, o.OrderedAt, o.StatusUpdatedAt });
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>Update status; only the next step in Placed -> Processing -> Sent -> Completed is accepted.</summary>
    [HttpPost("orders/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, OrderStatusRequest r)
    {
        var o = await Db.BookOrders.FindAsync(id);
        if (o == null) return NotFound();
        if (!OrderRules.CanTransition(o.Status, r.Status))
            return BadRequest(new { error = $"Cannot change status from {o.Status} to {r.Status}. Statuses only move forward one step." });
        o.Status = r.Status; o.StatusUpdatedAt = DateTime.UtcNow;
        Log($"Order {o.OrderNumber} -> {r.Status}");
        await Db.SaveChangesAsync();
        return Ok(new { Status = o.Status.ToString(), StatusStep = (int)o.Status, o.StatusUpdatedAt });
    }

    [HttpGet("orders/export")]
    public async Task<IActionResult> ExportOrders([FromQuery] string? status, [FromQuery] string? search, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var rows = await OrderQuery(status, search, from, to).Include(o => o.Book).OrderByDescending(o => o.OrderedAt).Take(5000).ToListAsync();
        var sb = new StringBuilder("OrderNumber,Customer,Email,Contact,Address,Book,Qty,Total,Status,OrderedAt\n");
        foreach (var o in rows)
            sb.AppendLine(string.Join(",", new object?[] { o.OrderNumber, o.CustomerName, o.Email, o.ContactNumber, o.Address,
                o.Book?.Title, o.Quantity, o.TotalCost, o.Status, o.OrderedAt.ToString("yyyy-MM-dd HH:mm") }.Select(Csv)));
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "orders.csv");
    }
}
