using Microsoft.EntityFrameworkCore;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>HTTP-style outcome so the controller stays thin.</summary>
public record OrderOutcome(bool Success, int Status, object Body);

/// <summary>Places book orders: validates, reserves stock, charges, then creates the order atomically.</summary>
public class OrderService
{
    private readonly AppDbContext _db;
    private readonly IPaymentService _payment;
    public OrderService(AppDbContext db, IPaymentService payment) { _db = db; _payment = payment; }

    public async Task<OrderOutcome> PlaceOrderAsync(OrderRequest r, int? userId)
    {
        if (!OrderRules.IsValidQuantity(r.Quantity))
            return new(false, 400, new { error = $"Quantity must be between 1 and {OrderRules.MaxQuantity}." });

        var book = await _db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.BookId == r.BookId && b.IsActive);
        if (book == null) return new(false, 404, new { error = "Book not found." });

        var cardErrors = _payment.ValidateCard(r.Card);
        if (cardErrors.Count > 0) return new(false, 400, new { error = "Card validation failed.", errors = cardErrors });

        // Cost is ALWAYS recalculated here; any client-sent value is ignored.
        var total = OrderRules.CalculateTotal(book.Price, r.Quantity);

        await using var tx = await _db.Database.BeginTransactionAsync();

        // Reserve stock atomically (only succeeds when enough copies remain).
        int qty = r.Quantity;
        var rows = await _db.Books.Where(b => b.BookId == book.BookId && b.Stock >= qty)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Stock, b => b.Stock - qty));
        if (rows == 0)
        {
            await tx.RollbackAsync();
            return new(false, 409, new { error = "Sorry, this book is out of stock." });
        }

        var result = await _payment.ChargeAsync(r.Card, total);
        if (!result.Success)
        {
            await tx.RollbackAsync();                                // stock reservation is undone
            _db.Payments.Add(new Payment
            {
                UserId = userId, Amount = total, PaymentType = PaymentType.BookOrder, CardType = r.Card.CardType,
                CardLast4 = result.Last4, CardHolderName = r.Card.HolderName.Trim(),
                TransactionRef = result.TransactionRef, Status = PaymentStatus.Failed, FailureReason = result.Reason
            });
            await _db.SaveChangesAsync();                             // failed payments are logged, no order is created
            return new(false, 402, new { error = "Transaction Failed", reason = result.Reason });
        }

        var payment = new Payment
        {
            UserId = userId, Amount = total, PaymentType = PaymentType.BookOrder, CardType = r.Card.CardType,
            CardLast4 = result.Last4, CardHolderName = r.Card.HolderName.Trim(),
            TransactionRef = result.TransactionRef, Status = PaymentStatus.Success
        };
        var order = new BookOrder
        {
            OrderNumber = "TMP-" + Guid.NewGuid().ToString("N")[..24],   // fits MaxLength(30); replaced below once the id is known
            UserId = userId, CustomerName = r.Name.Trim(), Email = r.Email.Trim().ToLowerInvariant(),
            ContactNumber = r.ContactNumber.Trim(), Address = r.Address.Trim(),
            BookId = book.BookId, Quantity = r.Quantity, TotalCost = total, Payment = payment,
            Status = OrderStatus.Placed
        };
        _db.BookOrders.Add(order);
        await _db.SaveChangesAsync();
        order.OrderNumber = $"SCP-{DateTime.UtcNow.Year}-{order.OrderId:000000}";
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return new(true, 200, new
        {
            message = "Transaction Completed Successfully",
            orderNumber = order.OrderNumber, amount = total, bookTitle = book.Title, quantity = r.Quantity,
            unitPrice = book.Price, transactionRef = result.TransactionRef, cardLast4 = result.Last4,
            customerName = order.CustomerName, email = order.Email, address = order.Address,
            orderedAt = order.OrderedAt
        });
    }
}
