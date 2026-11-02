using Microsoft.EntityFrameworkCore;
using Scooply.Api.Models;
namespace Scooply.Api.Data;

/// <summary>EF Core context: tables, unique indexes, precision and delete behaviour.</summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Admin> Admins => Set<Admin>();
    public DbSet<MembershipPlan> MembershipPlans => Set<MembershipPlan>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Flavor> Flavors => Set<Flavor>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookOrder> BookOrders => Set<BookOrder>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<RecipeSubmission> RecipeSubmissions => Set<RecipeSubmission>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<NewsletterSubscriber> NewsletterSubscribers => Set<NewsletterSubscriber>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Uniqueness rules from the SRS design
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<User>().HasIndex(u => u.Username).IsUnique();
        b.Entity<Admin>().HasIndex(a => a.Username).IsUnique();
        b.Entity<Flavor>().HasIndex(f => f.Name).IsUnique();
        b.Entity<Payment>().HasIndex(p => p.TransactionRef).IsUnique();
        b.Entity<BookOrder>().HasIndex(o => o.OrderNumber).IsUnique();
        b.Entity<NewsletterSubscriber>().HasIndex(n => n.Email).IsUnique();

        // Indexes for frequent queries
        b.Entity<BookOrder>().HasIndex(o => new { o.Email, o.OrderNumber });
        b.Entity<RecipeSubmission>().HasIndex(s => new { s.Status, s.ShowOnHome });
        b.Entity<Membership>().HasIndex(m => new { m.UserId, m.EndDate });

        // One recipe per flavor
        b.Entity<Recipe>().HasIndex(r => r.FlavorId).IsUnique();

        // Money columns
        b.Entity<MembershipPlan>().Property(x => x.Price).HasColumnType("decimal(18,2)");
        b.Entity<Payment>().Property(x => x.Amount).HasColumnType("decimal(18,2)");
        b.Entity<Book>().Property(x => x.Price).HasColumnType("decimal(18,2)");
        b.Entity<BookOrder>().Property(x => x.TotalCost).HasColumnType("decimal(18,2)");
        b.Entity<RecipeSubmission>().Property(x => x.PrizeAmount).HasColumnType("decimal(18,2)");

        // Store enums as readable strings in the DB
        b.Entity<Payment>().Property(x => x.PaymentType).HasConversion<string>();
        b.Entity<Payment>().Property(x => x.Status).HasConversion<string>();
        b.Entity<Payment>().Property(x => x.CardType).HasConversion<string>();
        b.Entity<Membership>().Property(x => x.Status).HasConversion<string>();
        b.Entity<BookOrder>().Property(x => x.Status).HasConversion<string>();
        b.Entity<RecipeSubmission>().Property(x => x.Status).HasConversion<string>();

        // Restrict deletes everywhere to avoid cascade cycles and protect financial history
        foreach (var fk in b.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;
    }
}
