using System.ComponentModel.DataAnnotations;
namespace Scooply.Api.Models;

/// <summary>Registered customer (created only after successful membership payment).</summary>
public class User
{
    public int UserId { get; set; }
    [Required, MaxLength(60)] public string FullName { get; set; } = "";
    [Required, MaxLength(120)] public string Email { get; set; } = "";
    [Required, MaxLength(40)] public string Username { get; set; } = "";
    [Required] public string PasswordHash { get; set; } = "";   // BCrypt hash, never plain text
    [MaxLength(20)] public string Phone { get; set; } = "";
    [MaxLength(250)] public string Address { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public int FailedLoginCount { get; set; }                   // for lockout (5 attempts)
    public DateTime? LockoutEnd { get; set; }                   // 15 min lock window
    public string? ResetToken { get; set; }                     // forgot-password token
    public DateTime? ResetTokenExpiry { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Membership> Memberships { get; set; } = new();
}

/// <summary>Admin account, kept in a separate table from members.</summary>
public class Admin
{
    public int AdminId { get; set; }
    [Required, MaxLength(40)] public string Username { get; set; } = "";
    [Required] public string PasswordHash { get; set; } = "";
    [MaxLength(60)] public string FullName { get; set; } = "";
    [MaxLength(120)] public string Email { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Monthly ($15/30d) or Yearly ($150/365d) plan; price editable by admin.</summary>
public class MembershipPlan
{
    [Key] public int PlanId { get; set; }
    [Required, MaxLength(40)] public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int DurationDays { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>A paid membership period for a user.</summary>
public class Membership
{
    public int MembershipId { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int PlanId { get; set; }
    public MembershipPlan? Plan { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public MembershipStatus Status { get; set; } = MembershipStatus.Active;
    public int PaymentId { get; set; }
    public Payment? Payment { get; set; }
}

/// <summary>Payment record. Full card number and CVV are NEVER stored.</summary>
public class Payment
{
    public int PaymentId { get; set; }
    public int? UserId { get; set; }                            // null for guest book orders
    public decimal Amount { get; set; }
    public PaymentType PaymentType { get; set; }
    public CardType CardType { get; set; }
    [MaxLength(4)] public string CardLast4 { get; set; } = "";
    [MaxLength(80)] public string CardHolderName { get; set; } = "";
    public Guid TransactionRef { get; set; } = Guid.NewGuid();
    public PaymentStatus Status { get; set; }
    [MaxLength(200)] public string? FailureReason { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Ice-cream flavor card shown publicly (image, teaser, access flags).</summary>
public class Flavor
{
    public int FlavorId { get; set; }
    [Required, MaxLength(80)] public string Name { get; set; } = "";
    [MaxLength(250)] public string ImagePath { get; set; } = "";
    [MaxLength(300)] public string ShortDescription { get; set; } = "";
    public bool IsMostFamous { get; set; }
    public bool IsFree { get; set; }
    public bool IsActive { get; set; } = true;                  // soft delete
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Recipe? Recipe { get; set; }
}

/// <summary>Full recipe (locked for guests unless the flavor is free). One per flavor.</summary>
public class Recipe
{
    public int RecipeId { get; set; }
    public int FlavorId { get; set; }
    public Flavor? Flavor { get; set; }
    public string Ingredients { get; set; } = "";               // newline-separated list
    public string Procedure { get; set; } = "";                 // newline-separated steps
    public int PrepTimeMinutes { get; set; }
    public int Servings { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedByAdminId { get; set; }
}

/// <summary>Recipe book on sale.</summary>
public class Book
{
    public int BookId { get; set; }
    [Required, MaxLength(150)] public string Title { get; set; } = "";
    [MaxLength(80)] public string Author { get; set; } = "";
    [MaxLength(1000)] public string Description { get; set; } = "";
    [MaxLength(250)] public string ImagePath { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Book order; created only after a successful payment.</summary>
public class BookOrder
{
    [Key] public int OrderId { get; set; }
    [Required, MaxLength(30)] public string OrderNumber { get; set; } = "";   // e.g. SCP-2025-000123
    public int? UserId { get; set; }
    [MaxLength(60)] public string CustomerName { get; set; } = "";
    [MaxLength(120)] public string Email { get; set; } = "";
    [MaxLength(20)] public string ContactNumber { get; set; } = "";
    [MaxLength(300)] public string Address { get; set; } = "";
    public int BookId { get; set; }
    public Book? Book { get; set; }
    public int Quantity { get; set; }
    public decimal TotalCost { get; set; }                      // always recalculated server-side
    public int PaymentId { get; set; }
    public Payment? Payment { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Placed;
    public DateTime OrderedAt { get; set; } = DateTime.UtcNow;
    public DateTime StatusUpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Feedback from guests or members.</summary>
public class Feedback
{
    public int FeedbackId { get; set; }
    public int? UserId { get; set; }
    [MaxLength(60)] public string Name { get; set; } = "";
    [MaxLength(120)] public string Email { get; set; } = "";
    [Range(1, 5)] public int Rating { get; set; }
    [MaxLength(120)] public string Subject { get; set; } = "";
    [MaxLength(2000)] public string Message { get; set; } = "";
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }
    public bool IsFeatured { get; set; }                        // shown as testimonial on Home
}

/// <summary>Contest entry. If Selected and ShowOnHome, the user appears under "Top Recipe".</summary>
public class RecipeSubmission
{
    [Key] public int SubmissionId { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    [Required, MaxLength(120)] public string RecipeTitle { get; set; } = "";
    [MaxLength(500)] public string Description { get; set; } = "";
    public string Ingredients { get; set; } = "";
    public string Procedure { get; set; } = "";
    [MaxLength(250)] public string ImagePath { get; set; } = "";
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Pending;
    public decimal? PrizeAmount { get; set; }                   // decided by admin
    [MaxLength(500)] public string? AdminRemarks { get; set; }
    [MaxLength(40)] public string? CertificateNumber { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public bool ShowOnHome { get; set; }
}

/// <summary>FAQ entry, admin managed.</summary>
public class Faq
{
    public int FaqId { get; set; }
    [MaxLength(40)] public string Category { get; set; } = "";  // Membership, Recipes, Books, Payments, Contest
    [Required, MaxLength(300)] public string Question { get; set; } = "";
    [Required] public string Answer { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Message sent through the Contact Us form.</summary>
public class ContactMessage
{
    public int Id { get; set; }
    [MaxLength(60)] public string Name { get; set; } = "";
    [MaxLength(120)] public string Email { get; set; } = "";
    [MaxLength(120)] public string Subject { get; set; } = "";
    [MaxLength(2000)] public string Message { get; set; } = "";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Single-row editable site info (About, Contact, owner details).</summary>
public class SiteSetting
{
    public int Id { get; set; }
    [MaxLength(80)] public string ShopName { get; set; } = "Scooply";
    [MaxLength(80)] public string OwnerName { get; set; } = "Mr. A";
    [MaxLength(30)] public string Phone { get; set; } = "";
    [MaxLength(120)] public string Email { get; set; } = "";
    [MaxLength(300)] public string Address { get; set; } = "";
    [MaxLength(120)] public string WorkingHours { get; set; } = "";
    public string AboutText { get; set; } = "";
    public string OwnerQuote { get; set; } = "";
}

/// <summary>Parlor branch shown on Contact/About.</summary>
public class Branch
{
    public int BranchId { get; set; }
    [Required, MaxLength(80)] public string Name { get; set; } = "";
    [MaxLength(300)] public string Address { get; set; } = "";
    [MaxLength(30)] public string Phone { get; set; } = "";
    [MaxLength(500)] public string? MapEmbedUrl { get; set; }
}

/// <summary>Newsletter signup (footer box stores emails in DB).</summary>
public class NewsletterSubscriber
{
    public int Id { get; set; }
    [Required, MaxLength(120)] public string Email { get; set; } = "";
    public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Basic admin activity log.</summary>
public class ActivityLog
{
    public int Id { get; set; }
    public int AdminId { get; set; }
    [MaxLength(200)] public string Action { get; set; } = "";
    public DateTime At { get; set; } = DateTime.UtcNow;
}
