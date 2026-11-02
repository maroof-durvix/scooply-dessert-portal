using System.Text.RegularExpressions;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>Outcome of a charge attempt. Never contains the full card number or CVV.</summary>
public record PaymentResult(bool Success, string? Reason, string Last4, Guid TransactionRef);

/// <summary>
/// Payment gateway abstraction. The simulated implementation below can be replaced
/// by a real gateway (e.g. Stripe) by registering a different class in Program.cs.
/// </summary>
public interface IPaymentService
{
    /// <summary>Field-level card validation. Empty dictionary means the card is well-formed.</summary>
    Dictionary<string, string[]> ValidateCard(CardDto card);

    /// <summary>Validates and charges the card; returns Success or Failed with a reason.</summary>
    Task<PaymentResult> ChargeAsync(CardDto card, decimal amount);
}

/// <summary>
/// Deterministic fake gateway for demos and tests:
/// 4000 0000 0000 0002 = declined, 4000 0000 0000 9995 = insufficient funds,
/// every other Luhn-valid card succeeds.
/// </summary>
public class SimulatedPaymentService : IPaymentService
{
    private static readonly Regex NameRx = new(@"^[A-Za-z][A-Za-z .'-]{2,79}$", RegexOptions.Compiled);
    private static readonly Regex ExpiryRx = new(@"^(0[1-9]|1[0-2])\s*/\s*(\d{2})$", RegexOptions.Compiled);

    // Known test numbers whose card type is fixed, so a Credit/Debit mismatch can be caught.
    private static readonly Dictionary<string, CardType> KnownTypes = new()
    {
        ["4111111111111111"] = CardType.Credit,
        ["5555555555554444"] = CardType.Credit,
        ["378282246310005"] = CardType.Credit,
        ["4000056655665556"] = CardType.Debit,
        ["5200828282828210"] = CardType.Debit
    };

    private static readonly Dictionary<string, string> Declines = new()
    {
        ["4000000000000002"] = "Your card was declined by the bank.",
        ["4000000000009995"] = "Insufficient funds."
    };

    public Dictionary<string, string[]> ValidateCard(CardDto card)
    {
        var errors = new Dictionary<string, string[]>();
        void Add(string field, string msg) => errors[field] = new[] { msg };

        // Card holder
        if (!NameRx.IsMatch((card.HolderName ?? "").Trim()))
            Add(nameof(card.HolderName), "Enter the card holder name (letters only, 3-80 characters).");

        // Number: length, Luhn, known type match
        var digits = LuhnValidator.Digits(card.Number);
        if (!LuhnValidator.IsValid(digits))
            Add(nameof(card.Number), "Card number is invalid.");
        else if (KnownTypes.TryGetValue(digits, out var actual) && actual != card.CardType)
            Add(nameof(card.CardType), $"This is a {actual} card. Please select '{actual}' as the paying option.");

        // Expiry: MM/YY and not in the past (valid through the last day of that month)
        var m = ExpiryRx.Match(card.Expiry ?? "");
        if (!m.Success) Add(nameof(card.Expiry), "Expiry must be in MM/YY format.");
        else
        {
            var end = new DateTime(2000 + int.Parse(m.Groups[2].Value), int.Parse(m.Groups[1].Value), 1)
                .AddMonths(1).AddTicks(-1);
            if (end < DateTime.UtcNow) Add(nameof(card.Expiry), "This card has expired.");
        }

        // CVV: 4 digits for Amex, otherwise 3
        int cvvLen = LuhnValidator.DetectBrand(digits) == "Amex" ? 4 : 3;
        if (!Regex.IsMatch(card.Cvv ?? "", $@"^\d{{{cvvLen}}}$"))
            Add(nameof(card.Cvv), $"CVV must be {cvvLen} digits.");

        return errors;
    }

    public Task<PaymentResult> ChargeAsync(CardDto card, decimal amount)
    {
        var digits = LuhnValidator.Digits(card.Number);
        var last4 = digits.Length >= 4 ? digits[^4..] : "";
        var tx = Guid.NewGuid();

        // Defence in depth: never charge a card that fails validation.
        if (ValidateCard(card).Count > 0)
            return Task.FromResult(new PaymentResult(false, "Card details are invalid.", last4, tx));
        if (amount <= 0)
            return Task.FromResult(new PaymentResult(false, "Invalid amount.", last4, tx));

        if (Declines.TryGetValue(digits, out var reason))
            return Task.FromResult(new PaymentResult(false, reason, last4, tx));

        return Task.FromResult(new PaymentResult(true, null, last4, tx));
    }
}
