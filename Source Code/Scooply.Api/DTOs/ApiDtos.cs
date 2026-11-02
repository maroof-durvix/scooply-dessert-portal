using System.ComponentModel.DataAnnotations;
using Scooply.Api.Models;
namespace Scooply.Api.DTOs;

/// <summary>Generic page wrapper so no list is unbounded.</summary>
public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);

/// <summary>Flavor card for grids (no recipe text). Locked = recipe hidden from this viewer.</summary>
public record FlavorCard(int FlavorId, string Name, string ImagePath, string ShortDescription,
                         bool IsFree, bool IsMostFamous, bool Locked);

/// <summary>Full recipe; Ingredients/Steps are null when Locked (guest or expired member).</summary>
public record RecipeDetail(int FlavorId, string Name, string ImagePath, string ShortDescription,
                           bool IsFree, bool IsMostFamous, bool Locked, int PrepTimeMinutes, int Servings,
                           string[]? Ingredients, string[]? Steps);

/// <summary>SRS order form: Name, Email, Contact, Address, (Cost is computed server-side), Paying option + card.</summary>
public class OrderRequest
{
    [Required] public int BookId { get; set; }
    [Range(1, 10)] public int Quantity { get; set; } = 1;
    [Required, RegularExpression(@"^[A-Za-z][A-Za-z .'-]{2,59}$", ErrorMessage = "Name: letters and spaces, 3-60 characters.")]
    public string Name { get; set; } = "";
    [Required, EmailAddress, StringLength(120)] public string Email { get; set; } = "";
    [Required, RegularExpression(@"^\+?\d{10,15}$", ErrorMessage = "Contact: 10-15 digits, '+' allowed.")]
    public string ContactNumber { get; set; } = "";
    [Required, StringLength(300, MinimumLength = 10)] public string Address { get; set; } = "";
    [Required] public Scooply.Api.DTOs.CardDto Card { get; set; } = new();
}

public class FeedbackRequest
{
    [Required, StringLength(60, MinimumLength = 2)] public string Name { get; set; } = "";
    [Required, EmailAddress, StringLength(120)] public string Email { get; set; } = "";
    [Range(1, 5)] public int Rating { get; set; }
    [Required, StringLength(120, MinimumLength = 3)] public string Subject { get; set; } = "";
    [Required, StringLength(2000, MinimumLength = 10)] public string Message { get; set; } = "";
}

public class ContactRequest
{
    [Required, StringLength(60, MinimumLength = 2)] public string Name { get; set; } = "";
    [Required, EmailAddress, StringLength(120)] public string Email { get; set; } = "";
    [Required, StringLength(120, MinimumLength = 3)] public string Subject { get; set; } = "";
    [Required, StringLength(2000, MinimumLength = 10)] public string Message { get; set; } = "";
}

public class NewsletterRequest { [Required, EmailAddress, StringLength(120)] public string Email { get; set; } = ""; }

/// <summary>Contest entry (multipart/form-data).</summary>
public class SubmissionForm
{
    [Required, StringLength(120, MinimumLength = 3)] public string RecipeTitle { get; set; } = "";
    [Required, StringLength(300, MinimumLength = 10)] public string Description { get; set; } = "";
    [Required, MinLength(10)] public string Ingredients { get; set; } = "";   // newline separated
    [Required, MinLength(20)] public string Procedure { get; set; } = "";     // newline separated
    [StringLength(190)] public string? Notes { get; set; }
    [Range(typeof(bool), "true", "true", ErrorMessage = "You must accept the contest rules.")]
    public bool AcceptTerms { get; set; }
    [Required] public IFormFile Image { get; set; } = null!;
}

public class ProfileUpdateRequest
{
    [Required, StringLength(60, MinimumLength = 3)] public string FullName { get; set; } = "";
    [Required, RegularExpression(@"^\+?\d{10,15}$")] public string Phone { get; set; } = "";
    [Required, StringLength(250, MinimumLength = 10)] public string Address { get; set; } = "";
}

public class ChangePasswordRequest
{
    [Required] public string CurrentPassword { get; set; } = "";
    [Required] public string NewPassword { get; set; } = "";
}

public class RenewRequest { [Required] public int PlanId { get; set; } [Required] public CardDto Card { get; set; } = new(); }

// ---------------- Admin forms ----------------

/// <summary>Flavor + recipe editor (multipart). Ingredients/Procedure are newline-separated rows.</summary>
public class FlavorForm
{
    [Required, StringLength(80)] public string Name { get; set; } = "";
    [Required, StringLength(300)] public string ShortDescription { get; set; } = "";
    public bool IsFree { get; set; }
    public bool IsMostFamous { get; set; }
    public bool IsActive { get; set; } = true;
    [Required] public string Ingredients { get; set; } = "";
    [Required] public string Procedure { get; set; } = "";
    [Range(1, 600)] public int PrepTimeMinutes { get; set; } = 30;
    [Range(1, 100)] public int Servings { get; set; } = 6;
    public IFormFile? Image { get; set; }
}

public class BookForm
{
    [Required, StringLength(150)] public string Title { get; set; } = "";
    [StringLength(80)] public string Author { get; set; } = "";
    [StringLength(1000)] public string Description { get; set; } = "";
    [Range(0.01, 100000)] public decimal Price { get; set; }
    [Range(0, 100000)] public int Stock { get; set; }
    public bool IsActive { get; set; } = true;
    public IFormFile? Image { get; set; }
}

public record OrderStatusRequest(OrderStatus Status);
public record SelectSubmissionRequest(decimal PrizeAmount, string? Remarks, bool ShowOnHome);
public record RejectSubmissionRequest(string? Remarks);
public record PlanUpdateRequest(string Name, decimal Price, int DurationDays, bool IsActive);
public record FaqRequest(string Category, string Question, string Answer, int DisplayOrder, bool IsActive);
public record BranchRequest(string Name, string Address, string Phone, string? MapEmbedUrl);
public record SiteSettingRequest(string ShopName, string OwnerName, string Phone, string Email, string Address,
                                 string WorkingHours, string AboutText, string OwnerQuote);
public record AdminPasswordRequest(string CurrentPassword, string NewPassword);
