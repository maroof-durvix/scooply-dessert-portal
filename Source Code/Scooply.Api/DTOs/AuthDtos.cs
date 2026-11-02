using System.ComponentModel.DataAnnotations;
using Scooply.Api.Models;
namespace Scooply.Api.DTOs;

/// <summary>Card data sent by Angular. Used for validation/charge only; never persisted in full.</summary>
public class CardDto
{
    [Required] public string HolderName { get; set; } = "";
    [Required] public string Number { get; set; } = "";
    [Required] public string Expiry { get; set; } = "";     // MM/YY
    [Required] public string Cvv { get; set; } = "";
    public CardType CardType { get; set; }                   // Credit | Debit
}

/// <summary>Registration is accepted only together with a successful membership payment.</summary>
public class RegisterRequest
{
    [Required] public int PlanId { get; set; }
    [Required, StringLength(60, MinimumLength = 3)] public string FullName { get; set; } = "";
    [Required, EmailAddress, StringLength(120)] public string Email { get; set; } = "";
    [Required, RegularExpression(@"^[A-Za-z_.]{4,40}$", ErrorMessage = "Username: 4-40 letters, _ or . (integers/numbers not allowed)")]
    public string Username { get; set; } = "";
    [Required] public string Password { get; set; } = "";
    [Required, Compare(nameof(Password))] public string ConfirmPassword { get; set; } = "";
    [Required, RegularExpression(@"^\+?\d{10,15}$", ErrorMessage = "Phone must be 10-15 digits.")]
    public string Phone { get; set; } = "";
    [Required, StringLength(250, MinimumLength = 10)] public string Address { get; set; } = "";
    [Range(typeof(bool), "true", "true", ErrorMessage = "You must accept the terms.")]
    public bool AcceptTerms { get; set; }
    public CardDto? Card { get; set; }                       // required only for paid plans
}

public class LoginRequest
{
    [Required, RegularExpression(@"^[^0-9]+$", ErrorMessage = "Username cannot contain numbers.")]
    public string Username { get; set; } = "";
    [Required] public string Password { get; set; } = "";
    public bool RememberMe { get; set; }
}

public class ForgotPasswordRequest { [Required, EmailAddress] public string Email { get; set; } = ""; }

public class ResetPasswordRequest
{
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required] public string Token { get; set; } = "";
    [Required] public string NewPassword { get; set; } = "";
}

/// <summary>Returned after login/registration.</summary>
public record AuthResponse(string Token, DateTime ExpiresAt, string Role, int UserId, string FullName,
                           string Username, bool MembershipActive, DateTime? MembershipEndsOn);

/// <summary>Receipt shown on the registration result step.</summary>
public record RegisterReceipt(Guid TransactionRef, string Plan, decimal Amount, string CardLast4,
                              DateTime StartDate, DateTime EndDate);

public record RegisterResponse(AuthResponse Auth, RegisterReceipt Receipt);
