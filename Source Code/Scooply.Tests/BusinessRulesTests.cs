using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
using Xunit;
namespace Scooply.Tests;

/// <summary>Luhn checksum and brand detection.</summary>
public class LuhnTests
{
    [Theory]
    [InlineData("4111 1111 1111 1111", true)]
    [InlineData("5555-5555-5555-4444", true)]
    [InlineData("378282246310005", true)]
    [InlineData("4111 1111 1111 1112", false)]   // bad checksum
    [InlineData("1234", false)]                   // too short
    [InlineData("", false)]
    public void IsValid_ChecksNumber(string number, bool expected) => Assert.Equal(expected, LuhnValidator.IsValid(number));

    [Theory]
    [InlineData("4111111111111111", "Visa")]
    [InlineData("5555555555554444", "Mastercard")]
    [InlineData("2221000000000009", "Mastercard")]
    [InlineData("378282246310005", "Amex")]
    [InlineData("9999999999999999", "Unknown")]
    public void DetectBrand_ReturnsExpected(string number, string brand) => Assert.Equal(brand, LuhnValidator.DetectBrand(number));
}

/// <summary>Membership date calculation (30 / 365 days, renewal keeps remaining days).</summary>
public class MembershipTests
{
    [Fact] public void Monthly_Ends30DaysLater() =>
        Assert.Equal(new DateTime(2026, 2, 1), MembershipRules.CalculateEndDate(new DateTime(2026, 1, 2), 30));

    [Fact] public void Yearly_Ends365DaysLater() =>
        Assert.Equal(new DateTime(2027, 1, 1), MembershipRules.CalculateEndDate(new DateTime(2026, 1, 1), 365));

    [Fact] public void Renewal_StartsWhenCurrentEnds()
    {
        var now = new DateTime(2026, 1, 1); var end = now.AddDays(10);
        Assert.Equal(end, MembershipRules.CalculateStartDate(now, end));
    }

    [Fact] public void Renewal_AfterExpiry_StartsNow()
    {
        var now = new DateTime(2026, 1, 1);
        Assert.Equal(now, MembershipRules.CalculateStartDate(now, now.AddDays(-5)));
        Assert.Equal(now, MembershipRules.CalculateStartDate(now, null));
    }

    [Fact] public void IsActive_OnlyInsideRange()
    {
        var s = new DateTime(2026, 1, 1); var e = new DateTime(2026, 2, 1);
        Assert.True(MembershipRules.IsActive(s, e, new DateTime(2026, 1, 15)));
        Assert.False(MembershipRules.IsActive(s, e, new DateTime(2026, 2, 2)));
    }
}

/// <summary>Order cost and forward-only status workflow.</summary>
public class OrderTests
{
    [Theory]
    [InlineData(24.99, 1, 24.99)]
    [InlineData(19.99, 2, 39.98)]
    [InlineData(12.995, 1, 13.00)]
    public void Total_IsPriceTimesQuantity(double price, int qty, double expected) =>
        Assert.Equal((decimal)expected, OrderRules.CalculateTotal((decimal)price, qty));

    [Theory] [InlineData(0, false)] [InlineData(1, true)] [InlineData(10, true)] [InlineData(11, false)]
    public void Quantity_Range(int q, bool ok) => Assert.Equal(ok, OrderRules.IsValidQuantity(q));

    [Theory]
    [InlineData(OrderStatus.Placed, OrderStatus.Processing, true)]
    [InlineData(OrderStatus.Processing, OrderStatus.Sent, true)]
    [InlineData(OrderStatus.Sent, OrderStatus.Completed, true)]
    [InlineData(OrderStatus.Placed, OrderStatus.Sent, false)]        // skipping a step
    [InlineData(OrderStatus.Sent, OrderStatus.Processing, false)]    // going backwards
    [InlineData(OrderStatus.Completed, OrderStatus.Completed, false)]
    public void StatusTransitions(OrderStatus from, OrderStatus to, bool allowed) =>
        Assert.Equal(allowed, OrderRules.CanTransition(from, to));
}

/// <summary>Who can see a full recipe.</summary>
public class RecipeAccessTests
{
    [Theory]
    [InlineData(true, false, false, true)]    // free recipe, guest
    [InlineData(false, false, false, false)]  // paid recipe, guest -> locked
    [InlineData(false, true, false, false)]   // expired member -> locked
    [InlineData(false, true, true, true)]     // active member -> unlocked
    public void Rule(bool free, bool loggedIn, bool active, bool expected) =>
        Assert.Equal(expected, RecipeAccessRules.CanViewFullRecipe(free, loggedIn, active));
}

/// <summary>Simulated gateway: validation and deterministic outcomes.</summary>
public class PaymentServiceTests
{
    private static CardDto Card(string number = "4111 1111 1111 1111", CardType t = CardType.Credit, string cvv = "123") => new()
    { HolderName = "Ali Khan", Number = number, Expiry = "12/99", Cvv = cvv, CardType = t };

    private readonly SimulatedPaymentService _svc = new();

    [Fact] public async Task ValidCard_Succeeds()
    {
        var r = await _svc.ChargeAsync(Card(), 15m);
        Assert.True(r.Success); Assert.Equal("1111", r.Last4);
    }

    [Fact] public async Task DeclineCard_Fails()
    {
        var r = await _svc.ChargeAsync(Card("4000 0000 0000 0002"), 15m);
        Assert.False(r.Success); Assert.NotNull(r.Reason);
    }

    [Fact] public void BadLuhn_IsRejected() => Assert.True(_svc.ValidateCard(Card("4111 1111 1111 1112")).ContainsKey("Number"));

    [Fact] public void ExpiredCard_IsRejected()
    {
        var c = Card(); c.Expiry = "01/20";
        Assert.True(_svc.ValidateCard(c).ContainsKey("Expiry"));
    }

    [Fact] public void Amex_NeedsFourDigitCvv()
    {
        Assert.True(_svc.ValidateCard(Card("378282246310005", CardType.Credit, "123")).ContainsKey("Cvv"));
        Assert.Empty(_svc.ValidateCard(Card("378282246310005", CardType.Credit, "1234")));
    }

    [Fact] public void CardTypeMismatch_IsRejected() =>
        Assert.True(_svc.ValidateCard(Card("4111 1111 1111 1111", CardType.Debit)).ContainsKey("CardType"));

    [Fact] public void WeakPassword_IsRejected()
    {
        Assert.False(PasswordRules.IsStrong("password"));
        Assert.True(PasswordRules.IsStrong("Admin@123"));
    }
}
