using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Registration (payment-gated), member login, admin login, password reset.</summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const int MaxFailedLogins = 5;
    private static readonly TimeSpan LockoutTime = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly IPaymentService _payment;
    private readonly ITokenService _tokens;
    private readonly RecipeAccessService _access;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _log;

    public AuthController(AppDbContext db, IPaymentService payment, ITokenService tokens,
        RecipeAccessService access, IWebHostEnvironment env, ILogger<AuthController> log)
    { _db = db; _payment = payment; _tokens = tokens; _access = access; _env = env; _log = log; }

    // ---------- Async uniqueness checks used by the register wizard ----------

    /// <summary>GET api/auth/check-email?email=x -> { available }</summary>
    [HttpGet("check-email")]
    public async Task<IActionResult> CheckEmail([FromQuery] string email)
    {
        var e = (email ?? "").Trim().ToLowerInvariant();
        return Ok(new { available = e.Length > 0 && !await _db.Users.AnyAsync(u => u.Email == e) });
    }

    /// <summary>GET api/auth/check-username?username=x -> { available }</summary>
    [HttpGet("check-username")]
    public async Task<IActionResult> CheckUsername([FromQuery] string username)
    {
        var u = (username ?? "").Trim();
        if (System.Text.RegularExpressions.Regex.IsMatch(u, @"\d"))
            return Ok(new { available = false, error = "Numbers are not allowed in username." });
        return Ok(new { available = u.Length > 0 && !await _db.Users.AnyAsync(x => x.Username == u) });
    }

    // ---------- Registration ----------

    /// <summary>
    /// SRS rule: the customer registers ONLY if the payment succeeds.
    /// Order of work: validate -> uniqueness -> validate card -> charge ->
    /// (transaction) create User + Payment + Membership. Failed charges are logged
    /// in Payments but create no account.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (!PasswordRules.IsStrong(req.Password))
            return ValidationProblem(new ValidationProblemDetails(
                new Dictionary<string, string[]> { ["Password"] = new[] { PasswordRules.Message } }));

        var email = req.Email.Trim().ToLowerInvariant();
        var username = req.Username.Trim();

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { error = "This email is already registered." });
        if (await _db.Users.AnyAsync(u => u.Username == username))
            return Conflict(new { error = "This username is taken." });

        var plan = await _db.MembershipPlans.FirstOrDefaultAsync(p => p.PlanId == req.PlanId && p.IsActive);
        if (plan == null) return BadRequest(new { error = "Selected plan is not available." });

        bool isFree = plan.Price == 0;
        PaymentResult result;
        if (isFree)
        {
            // No card, no charge for the free plan.
            result = new PaymentResult(true, null, "", Guid.NewGuid());
        }
        else
        {
            if (req.Card == null)
                return ValidationProblem(new ValidationProblemDetails(
                    new Dictionary<string, string[]> { ["Card"] = new[] { "Card details are required for this plan." } }));

            var cardErrors = _payment.ValidateCard(req.Card);
            if (cardErrors.Count > 0) return ValidationProblem(new ValidationProblemDetails(cardErrors));

            // Charge FIRST; account creation depends on success.
            result = await _payment.ChargeAsync(req.Card, plan.Price);
            if (!result.Success)
            {
                // Log the failed attempt (last 4 only) and create NO account.
                _db.Payments.Add(new Payment
                {
                    UserId = null, Amount = plan.Price, PaymentType = PaymentType.Membership,
                    CardType = req.Card.CardType, CardLast4 = result.Last4,
                    CardHolderName = req.Card.HolderName.Trim(), TransactionRef = result.TransactionRef,
                    Status = PaymentStatus.Failed, FailureReason = result.Reason
                });
                await _db.SaveChangesAsync();
                return StatusCode(StatusCodes.Status402PaymentRequired,
                    new { error = "Transaction Failed", reason = result.Reason });
            }
        }

        // Atomic creation of user, payment and membership.
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var user = new User
            {
                FullName = req.FullName.Trim(), Email = email, Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Phone = req.Phone.Trim(), Address = req.Address.Trim()
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();   // obtain UserId

            var payment = new Payment
            {
                UserId = user.UserId, Amount = plan.Price, PaymentType = PaymentType.Membership,
                CardType = req.Card?.CardType ?? default, CardLast4 = result.Last4,
                CardHolderName = req.Card?.HolderName.Trim() ?? "FREE PLAN", TransactionRef = result.TransactionRef,
                Status = PaymentStatus.Success
            };
            var start = DateTime.UtcNow;
            var membership = new Membership
            {
                UserId = user.UserId, PlanId = plan.PlanId, Payment = payment,
                StartDate = start, EndDate = MembershipRules.CalculateEndDate(start, plan.DurationDays),
                Status = MembershipStatus.Active
            };
            _db.Memberships.Add(membership);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            var auth = BuildAuth(user, membership.EndDate, true, false);
            var receipt = new RegisterReceipt(result.TransactionRef, plan.Name, plan.Price,
                result.Last4, membership.StartDate, membership.EndDate);
            return Ok(new RegisterResponse(auth, receipt));
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            // Payment was charged but persistence failed (e.g. race on unique email): log for manual refund.
            _log.LogError(ex, "Registration persistence failed after successful charge. Tx={Tx}", result.TransactionRef);
            return Conflict(new { error = "Email or username was just taken. Your payment will be refunded." });
        }
    }

    // ---------- Login ----------

    /// <summary>Username + password login with lockout (5 failures -> 15 minutes).</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        if (System.Text.RegularExpressions.Regex.IsMatch(req.Username ?? "", @"\d"))
            return BadRequest(new { error = "Numbers are not allowed in username." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username.Trim());
        const string generic = "Invalid username or password.";
        if (user == null) return Unauthorized(new { error = generic });

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTime.UtcNow)
        {
            var mins = (int)Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
            return StatusCode(StatusCodes.Status423Locked,
                new { error = $"Too many failed attempts. Try again in {mins} minute(s)." });
        }
        if (!user.IsActive) return StatusCode(StatusCodes.Status403Forbidden, new { error = "This account is deactivated." });

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedLogins)
            {
                user.LockoutEnd = DateTime.UtcNow.Add(LockoutTime);
                user.FailedLoginCount = 0;
            }
            await _db.SaveChangesAsync();
            return Unauthorized(new { error = generic });
        }

        user.FailedLoginCount = 0; user.LockoutEnd = null;
        await _db.SaveChangesAsync();

        // Expired members may still log in; recipes stay locked until renewal.
        var active = await _access.GetActiveMembershipAsync(user.UserId);
        var end = active?.EndDate ?? await _access.GetLatestEndDateAsync(user.UserId);
        return Ok(BuildAuth(user, end, active != null, req.RememberMe));
    }

    /// <summary>Separate admin login (distinct endpoint, Admin role claim).</summary>
    [HttpPost("admin-login")]
    public async Task<IActionResult> AdminLogin(LoginRequest req)
    {
        if (System.Text.RegularExpressions.Regex.IsMatch(req.Username ?? "", @"\d"))
            return BadRequest(new { error = "Numbers are not allowed in admin username." });

        var admin = await _db.Admins.FirstOrDefaultAsync(a => a.Username == req.Username.Trim());
        if (admin == null || !BCrypt.Net.BCrypt.Verify(req.Password, admin.PasswordHash))
            return Unauthorized(new { error = "Invalid admin credentials." });

        var (token, exp) = _tokens.Create(admin.AdminId, admin.Username, Roles.Admin, req.RememberMe);
        return Ok(new AuthResponse(token, exp, Roles.Admin, admin.AdminId, admin.FullName, admin.Username, false, null));
    }

    // ---------- Forgot / reset password (email is simulated) ----------

    /// <summary>Creates a 1-hour reset token. The link is logged; in Development it is also returned.</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        string? link = null;
        if (user != null)
        {
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
            user.ResetToken = BCrypt.Net.BCrypt.HashPassword(token);   // store only a hash
            user.ResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _db.SaveChangesAsync();
            link = $"http://localhost:4200/account/reset-password?email={Uri.EscapeDataString(email)}&token={token}";
            _log.LogInformation("SIMULATED EMAIL - password reset link for {Email}: {Link}", email, link);
        }
        // Same message either way so the endpoint does not reveal which emails exist.
        return Ok(new { message = "If that email is registered, a reset link has been sent.",
                        resetLink = _env.IsDevelopment() ? link : null });
    }

    /// <summary>Sets a new password when the token is valid and unexpired.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req)
    {
        if (!PasswordRules.IsStrong(req.NewPassword)) return BadRequest(new { error = PasswordRules.Message });

        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user?.ResetToken == null || user.ResetTokenExpiry < DateTime.UtcNow ||
            !BCrypt.Net.BCrypt.Verify(req.Token, user.ResetToken))
            return BadRequest(new { error = "Reset link is invalid or has expired." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.ResetToken = null; user.ResetTokenExpiry = null;
        user.FailedLoginCount = 0; user.LockoutEnd = null;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Password updated. You can now log in." });
    }

    // ---------- Current user ----------

    /// <summary>Returns fresh membership status for the logged-in member (Angular calls this on load).</summary>
    [Authorize(Roles = Roles.Member)]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        int id = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null) return Unauthorized();
        var active = await _access.GetActiveMembershipAsync(id);
        var end = active?.EndDate ?? await _access.GetLatestEndDateAsync(id);
        return Ok(new { user.UserId, user.FullName, user.Username, user.Email, user.Phone, user.Address,
                        membershipActive = active != null, membershipEndsOn = end,
                        plan = active?.Plan?.Name });
    }

    /// <summary>Builds the token + profile payload for a member.</summary>
    private AuthResponse BuildAuth(User u, DateTime? membershipEnd, bool active, bool remember)
    {
        var (token, exp) = _tokens.Create(u.UserId, u.Username, Roles.Member, remember);
        return new AuthResponse(token, exp, Roles.Member, u.UserId, u.FullName, u.Username, active, membershipEnd);
    }
}
