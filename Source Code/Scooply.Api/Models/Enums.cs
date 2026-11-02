namespace Scooply.Api.Models;

/// <summary>Role names used in JWT claims and [Authorize(Roles=...)].</summary>
public static class Roles
{
    public const string Member = "Member";
    public const string Admin = "Admin";
}

/// <summary>Book order lifecycle. Transitions are forward-only (see OrderService).</summary>
public enum OrderStatus { Placed = 0, Processing = 1, Sent = 2, Completed = 3 }

/// <summary>Why a payment was made.</summary>
public enum PaymentType { Membership = 0, BookOrder = 1 }

/// <summary>Result of a payment attempt.</summary>
public enum PaymentStatus { Success = 0, Failed = 1 }

/// <summary>Card category chosen by the customer.</summary>
public enum CardType { Credit = 0, Debit = 1 }

/// <summary>Membership state; Expired is derived from EndDate but persisted for reporting.</summary>
public enum MembershipStatus { Active = 0, Expired = 1 }

/// <summary>Recipe contest review state.</summary>
public enum SubmissionStatus { Pending = 0, Selected = 1, Rejected = 2 }
