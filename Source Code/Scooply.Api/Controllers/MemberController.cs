using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Member dashboard, profile, password and membership renewal.</summary>
[ApiController]
[Authorize(Roles = Roles.Member)]
[Route("api/member")]
public class MemberController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RecipeAccessService _access;
    private readonly IPaymentService _payment;
    public MemberController(AppDbContext db, RecipeAccessService access, IPaymentService payment)
    { _db = db; _access = access; _payment = payment; }

    private int Uid => User.MemberId()!.Value;

    /// <summary>Membership status (with days remaining), recent orders, submissions and payment history.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var uid = Uid;
        var active = await _access.GetActiveMembershipAsync(uid);
        var latest = active ?? await _db.Memberships.AsNoTracking().Include(m => m.Plan)
            .Where(m => m.UserId == uid).OrderByDescending(m => m.EndDate).FirstOrDefaultAsync();

        object? membership = null;
        if (latest != null)
        {
            var total = (latest.EndDate - latest.StartDate).TotalDays;
            var left = Math.Max(0, (latest.EndDate - DateTime.UtcNow).TotalDays);
            membership = new { Plan = latest.Plan!.Name, latest.StartDate, latest.EndDate, Active = active != null,
                               DaysRemaining = (int)Math.Ceiling(left), PercentLeft = total <= 0 ? 0 : Math.Round(left / total * 100) };
        }
        var orders = await _db.BookOrders.AsNoTracking().Where(o => o.UserId == uid).OrderByDescending(o => o.OrderedAt).Take(5)
            .Select(o => new { o.OrderNumber, BookTitle = o.Book!.Title, o.TotalCost, Status = o.Status.ToString(), o.OrderedAt }).ToListAsync();
        var subs = await _db.RecipeSubmissions.AsNoTracking().Where(s => s.UserId == uid).OrderByDescending(s => s.SubmittedAt).Take(5)
            .Select(s => new { s.SubmissionId, s.RecipeTitle, Status = s.Status.ToString(), s.PrizeAmount }).ToListAsync();
        var payments = await _db.Payments.AsNoTracking().Where(p => p.UserId == uid).OrderByDescending(p => p.PaidAt).Take(20)
            .Select(p => new { Type = p.PaymentType.ToString(), p.Amount, p.CardLast4, Status = p.Status.ToString(), p.TransactionRef, p.PaidAt }).ToListAsync();
        var user = await _db.Users.AsNoTracking().Where(u => u.UserId == uid)
            .Select(u => new { u.FullName, u.Username, u.Email, u.Phone, u.Address }).FirstAsync();

        return Ok(new { user, membership, orders, submissions = subs, payments });
    }

    /// <summary>Edit name, phone and address (email/username are fixed).</summary>
    [HttpPut("profile")]
    public async Task<IActionResult> Profile(ProfileUpdateRequest r)
    {
        var u = await _db.Users.FirstAsync(x => x.UserId == Uid);
        u.FullName = r.FullName.Trim(); u.Phone = r.Phone.Trim(); u.Address = r.Address.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { message = "Profile updated." });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest r)
    {
        var u = await _db.Users.FirstAsync(x => x.UserId == Uid);
        if (!BCrypt.Net.BCrypt.Verify(r.CurrentPassword, u.PasswordHash)) return BadRequest(new { error = "Current password is incorrect." });
        if (!PasswordRules.IsStrong(r.NewPassword)) return BadRequest(new { error = PasswordRules.Message });
        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.NewPassword);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Password changed." });
    }

    /// <summary>Renew/extend membership; reuses the payment flow. Remaining days are preserved.</summary>
    [HttpPost("renew")]
    public async Task<IActionResult> Renew(RenewRequest r)
    {
        var plan = await _db.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == r.PlanId && p.IsActive);
        if (plan == null) return BadRequest(new { error = "Plan not available." });
        var errs = _payment.ValidateCard(r.Card);
        if (errs.Count > 0) return ValidationProblem(new ValidationProblemDetails(errs));

        var res = await _payment.ChargeAsync(r.Card, plan.Price);
        var pay = new Payment { UserId = Uid, Amount = plan.Price, PaymentType = PaymentType.Membership, CardType = r.Card.CardType,
            CardLast4 = res.Last4, CardHolderName = r.Card.HolderName.Trim(), TransactionRef = res.TransactionRef,
            Status = res.Success ? PaymentStatus.Success : PaymentStatus.Failed, FailureReason = res.Reason };
        if (!res.Success)
        {
            _db.Payments.Add(pay); await _db.SaveChangesAsync();
            return StatusCode(402, new { error = "Transaction Failed", reason = res.Reason });
        }

        var start = MembershipRules.CalculateStartDate(DateTime.UtcNow, await _access.GetLatestEndDateAsync(Uid));
        var m = new Membership { UserId = Uid, PlanId = plan.PlanId, Payment = pay, StartDate = start,
            EndDate = MembershipRules.CalculateEndDate(start, plan.DurationDays) };
        _db.Memberships.Add(m);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Transaction Completed Successfully", plan = plan.Name, amount = plan.Price,
                        m.StartDate, m.EndDate, transactionRef = res.TransactionRef, cardLast4 = res.Last4 });
    }
}
