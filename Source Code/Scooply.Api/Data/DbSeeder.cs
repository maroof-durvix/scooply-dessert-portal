using Microsoft.EntityFrameworkCore;
using Scooply.Api.Models;
namespace Scooply.Api.Data;

/// <summary>
/// Seeds mandatory demo data on first run: admin, plans, 20 flavors with full recipes,
/// books, FAQs, members, orders, feedback, contest submissions, branches and site text.
/// Safe to call on every startup (does nothing if data already exists).
/// </summary>
public static class DbSeeder
{
    /// <summary>One flavor + recipe definition used only for seeding.</summary>
    private record FlavorSeed(string Name, string Slug, string Teaser, bool Famous, bool Free,
                              int Prep, int Servings, string[] Ingredients, string[] Steps);

    /// <summary>Entry point called from Program.cs after migrations.</summary>
    public static async Task SeedAsync(AppDbContext db)
    {
        // Free plan ($0). Ensured separately so existing databases get it too.
        if (!await db.MembershipPlans.AnyAsync(p => p.Price == 0))
        {
            db.MembershipPlans.Add(new MembershipPlan { Name = "Free", Price = 0m, DurationDays = 30 });
            await db.SaveChangesAsync();
        }

        // Ensure demo champions have high-res photos and full contest showcase details
        var saraSub = await db.RecipeSubmissions.FirstOrDefaultAsync(s => s.RecipeTitle.Contains("Rose Cardamom"));
        if (saraSub != null && (saraSub.ImagePath.EndsWith(".svg") || string.IsNullOrEmpty(saraSub.AdminRemarks)))
        {
            saraSub.ImagePath = "/images/flavors/pistachio.jpg";
            saraSub.AdminRemarks = "Masterpiece balance of pure rose essence, fragrant green cardamom, and slow-churned malai.";
            saraSub.Description = "A heritage kulfi-style gelato infused with organic rose extract, stone-ground cardamom, and rich pistachio crumble.";
            await db.SaveChangesAsync();
        }

        if (await db.RecipeSubmissions.CountAsync(s => s.Status == SubmissionStatus.Selected && s.ShowOnHome) <= 1)
        {
            var userAli = await db.Users.FirstOrDefaultAsync(u => u.Username == "ali_khan");
            var userJohn = await db.Users.FirstOrDefaultAsync(u => u.Username == "john_doe");
            if (userAli != null && !await db.RecipeSubmissions.AnyAsync(s => s.RecipeTitle == "Belgian Truffle Dream"))
            {
                db.RecipeSubmissions.Add(new RecipeSubmission
                {
                    UserId = userAli.UserId,
                    RecipeTitle = "Belgian Truffle Dream",
                    ImagePath = "/images/flavors/chocolate-truffle.jpg",
                    Description = "Rich 70% dark chocolate gelato swirled with handmade fudge ribbons and roasted hazelnut crunch.",
                    Ingredients = "2 cups heavy cream\n1 cup whole milk\n3/4 cup sugar\n200g Belgian dark chocolate\n1/3 cup toasted hazelnuts",
                    Procedure = "Melt chocolate into warm milk and cream.\nWhisk until glossy and chill for 6 hours.\nChurn in gelato maker, fold in crushed hazelnuts.\nFreeze 4 hours.",
                    Status = SubmissionStatus.Selected,
                    PrizeAmount = 400m,
                    ShowOnHome = true,
                    CertificateNumber = "SCP-CERT-2026-0002",
                    AdminRemarks = "Flawless velvety texture with sublime cocoa intensity!",
                    SubmittedAt = DateTime.UtcNow.AddDays(-14),
                    ReviewedAt = DateTime.UtcNow.AddDays(-10)
                });
            }
            if (userJohn != null && !await db.RecipeSubmissions.AnyAsync(s => s.RecipeTitle == "Salted Butterscotch Praline"))
            {
                db.RecipeSubmissions.Add(new RecipeSubmission
                {
                    UserId = userJohn.UserId,
                    RecipeTitle = "Salted Butterscotch Praline",
                    ImagePath = "/images/flavors/butterscotch.jpg",
                    Description = "Slow-caramelized brown butter custard rippled with golden butterscotch crunch and sea salt flakes.",
                    Ingredients = "2 cups cream\n1 cup whole milk\n1/2 cup brown sugar\n3 tbsp salted butter\n1/2 cup praline pecan crunch",
                    Procedure = "Brown the butter and whisk with dark brown sugar.\nSlowly incorporate warm cream.\nChill thoroughly and churn.\nRipple with praline bits and freeze.",
                    Status = SubmissionStatus.Selected,
                    PrizeAmount = 300m,
                    ShowOnHome = true,
                    CertificateNumber = "SCP-CERT-2026-0003",
                    AdminRemarks = "Irresistible crunch and comforting butterscotch depth!",
                    SubmittedAt = DateTime.UtcNow.AddDays(-20),
                    ReviewedAt = DateTime.UtcNow.AddDays(-16)
                });
            }
            await db.SaveChangesAsync();
        }

        if (await db.Admins.AnyAsync()) return;   // already seeded

        // ---------- Admin (username: admin / password: Admin@123) ----------
        db.Admins.Add(new Admin { Username = "admin", FullName = "Mr. A", Email = "admin@scooply.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123") });

        // ---------- Membership plans ----------
        var monthly = new MembershipPlan { Name = "Monthly", Price = 15.00m, DurationDays = 30 };
        var yearly  = new MembershipPlan { Name = "Yearly",  Price = 150.00m, DurationDays = 365 };
        db.MembershipPlans.AddRange(monthly, yearly);

        // ---------- 20 flavors with recipes ----------
        foreach (var f in FlavorData())
        {
            db.Flavors.Add(new Flavor
            {
                Name = f.Name, ShortDescription = f.Teaser, ImagePath = $"/images/flavors/{f.Slug}.jpg",
                IsMostFamous = f.Famous, IsFree = f.Free,
                Recipe = new Recipe
                {
                    Ingredients = string.Join("\n", f.Ingredients),
                    Procedure = string.Join("\n", f.Steps),
                    PrepTimeMinutes = f.Prep, Servings = f.Servings
                }
            });
        }

        // ---------- Books ----------
        var books = new[]
        {
            new Book { Title = "Scoop Secrets: 50 Classic Ice Creams", Author = "Mr. A", Price = 24.99m, Stock = 40, ImagePath = "/images/books/book1.svg",
                Description = "Fifty time-tested parlor recipes with tips for silky texture at home." },
            new Book { Title = "Chocolate Dreams", Author = "Mr. A", Price = 19.99m, Stock = 35, ImagePath = "/images/books/book2.svg",
                Description = "From truffle to almond fudge: every chocolate flavor we serve, explained." },
            new Book { Title = "Fruity Freeze", Author = "Mr. A", Price = 17.50m, Stock = 30, ImagePath = "/images/books/book3.svg",
                Description = "Seasonal fruit ice creams, sorbets and gelato with fresh-pulp techniques." },
            new Book { Title = "Kulfi and Beyond", Author = "Mr. A", Price = 15.00m, Stock = 25, ImagePath = "/images/books/book4.svg",
                Description = "Traditional frozen treats from around the world, reimagined." },
            new Book { Title = "Sundae School", Author = "Mr. A", Price = 12.99m, Stock = 50, ImagePath = "/images/books/book5.svg",
                Description = "Sauces, toppings, cones and sundae building for beginners." }
        };
        db.Books.AddRange(books);

        // ---------- Sample members (password for all: Member@123) ----------
        string memberHash = BCrypt.Net.BCrypt.HashPassword("Member@123");
        var ali  = new User { FullName = "Ali Khan",   Email = "ali@example.com",  Username = "ali_khan",  PasswordHash = memberHash, Phone = "+923001234567", Address = "12 Garden Road, Karachi" };
        var sara = new User { FullName = "Sara Ahmed", Email = "sara@example.com", Username = "sara_ahmed", PasswordHash = memberHash, Phone = "+923011234567", Address = "45 Park Avenue, Lahore" };
        var john = new User { FullName = "John Doe",   Email = "john@example.com", Username = "john_doe",  PasswordHash = memberHash, Phone = "+14155550123", Address = "78 Market Street, Austin" };
        db.Users.AddRange(ali, sara, john);

        // Membership payments (card number is fake; only last 4 stored)
        Payment MemPay(User u, MembershipPlan p, string holder, CardType t, string last4) => new()
        { UserId = null, Amount = p.Price, PaymentType = PaymentType.Membership, CardType = t,
          CardLast4 = last4, CardHolderName = holder, Status = PaymentStatus.Success, PaidAt = DateTime.UtcNow.AddDays(-10) };
        var payAli = MemPay(ali, yearly, "ALI KHAN", CardType.Credit, "1111");
        var paySara = MemPay(sara, monthly, "SARA AHMED", CardType.Debit, "4444");
        var payJohn = MemPay(john, yearly, "JOHN DOE", CardType.Credit, "1111");
        db.Payments.AddRange(payAli, paySara, payJohn);
        await db.SaveChangesAsync();   // need ids for UserId links

        payAli.UserId = ali.UserId; paySara.UserId = sara.UserId; payJohn.UserId = john.UserId;
        db.Memberships.AddRange(
            new Membership { User = ali,  Plan = yearly,  Payment = payAli,  StartDate = DateTime.UtcNow.AddDays(-10), EndDate = DateTime.UtcNow.AddDays(-10).AddDays(365) },
            new Membership { User = sara, Plan = monthly, Payment = paySara, StartDate = DateTime.UtcNow.AddDays(-10), EndDate = DateTime.UtcNow.AddDays(-10).AddDays(30) },
            new Membership { User = john, Plan = yearly,  Payment = payJohn, StartDate = DateTime.UtcNow.AddDays(-10), EndDate = DateTime.UtcNow.AddDays(-10).AddDays(365) });

        // ---------- Sample orders: one member, one guest ----------
        var ordPay1 = new Payment { UserId = ali.UserId, Amount = books[0].Price, PaymentType = PaymentType.BookOrder, CardType = CardType.Credit, CardLast4 = "1111", CardHolderName = "ALI KHAN", Status = PaymentStatus.Success, PaidAt = DateTime.UtcNow.AddDays(-5) };
        var ordPay2 = new Payment { UserId = null, Amount = books[1].Price * 2, PaymentType = PaymentType.BookOrder, CardType = CardType.Debit, CardLast4 = "4444", CardHolderName = "MARIA LEE", Status = PaymentStatus.Success, PaidAt = DateTime.UtcNow.AddDays(-3) };
        db.BookOrders.AddRange(
            new BookOrder { OrderNumber = "SCP-2026-000001", UserId = ali.UserId, CustomerName = "Ali Khan", Email = "ali@example.com", ContactNumber = "+923001234567",
                Address = "12 Garden Road, Karachi", Book = books[0], Quantity = 1, TotalCost = books[0].Price, Payment = ordPay1,
                Status = OrderStatus.Sent, OrderedAt = DateTime.UtcNow.AddDays(-5), StatusUpdatedAt = DateTime.UtcNow.AddDays(-2) },
            new BookOrder { OrderNumber = "SCP-2026-000002", UserId = null, CustomerName = "Maria Lee", Email = "maria@example.com", ContactNumber = "+442071234567",
                Address = "22 Baker Street, London", Book = books[1], Quantity = 2, TotalCost = books[1].Price * 2, Payment = ordPay2,
                Status = OrderStatus.Placed, OrderedAt = DateTime.UtcNow.AddDays(-3), StatusUpdatedAt = DateTime.UtcNow.AddDays(-3) });

        // ---------- Feedback ----------
        db.Feedbacks.AddRange(
            new Feedback { UserId = ali.UserId, Name = "Ali Khan", Email = "ali@example.com", Rating = 5, Subject = "Great recipes", IsFeatured = true,
                Message = "The membership paid for itself with the first recipe. My family loves the pistachio!" },
            new Feedback { Name = "Maria Lee", Email = "maria@example.com", Rating = 4, Subject = "Book quality", IsFeatured = true,
                Message = "Lovely book and quick checkout. Delivery tracking would be even better." },
            new Feedback { Name = "Guest Visitor", Email = "guest@example.com", Rating = 5, Subject = "Amazing taste", IsFeatured = false,
                Message = "Visited the main branch last week. Best butterscotch I have ever had." });

        // ---------- Contest submissions: one winner (shown on Home), one pending ----------
        db.RecipeSubmissions.AddRange(
            new RecipeSubmission { UserId = sara.UserId, RecipeTitle = "Rose Cardamom Kulfi Swirl", ImagePath = "/images/flavors/pistachio.svg",
                Description = "A fragrant kulfi-style ice cream with rose and cardamom.",
                Ingredients = "2 cups full-fat milk\n1 cup cream\n1/2 cup sugar\n1 tsp cardamom powder\n2 tbsp rose syrup\n1/4 cup chopped pistachios",
                Procedure = "Simmer milk and cream until reduced by a third.\nStir in sugar and cardamom.\nCool, add rose syrup and pistachios.\nFreeze in moulds for 8 hours.",
                Status = SubmissionStatus.Selected, PrizeAmount = 500m, ShowOnHome = true, CertificateNumber = "SCP-CERT-2026-0001",
                AdminRemarks = "Beautiful balance of flavors!", SubmittedAt = DateTime.UtcNow.AddDays(-8), ReviewedAt = DateTime.UtcNow.AddDays(-4) },
            new RecipeSubmission { UserId = john.UserId, RecipeTitle = "Maple Bacon Crunch", ImagePath = "/images/flavors/butterscotch.svg",
                Description = "Sweet and salty maple ice cream with candied bacon.",
                Ingredients = "2 cups cream\n1 cup milk\n1/2 cup maple syrup\n4 egg yolks\n1/2 cup candied bacon bits",
                Procedure = "Warm cream, milk and maple syrup.\nTemper egg yolks and cook to 80°C.\nChill, churn, fold in bacon bits.\nFreeze 4 hours.",
                Status = SubmissionStatus.Pending, SubmittedAt = DateTime.UtcNow.AddDays(-1) });

        // ---------- Contact, branches, site text ----------
        db.ContactMessages.Add(new ContactMessage { Name = "Hamza", Email = "hamza@example.com", Subject = "Franchise", Message = "Do you offer franchise opportunities?" });
        db.Branches.AddRange(
            new Branch { Name = "Main Branch - Clifton", Address = "Block 5, Clifton, Karachi", Phone = "+92 21 1234 5678" },
            new Branch { Name = "Gulshan Branch", Address = "Gulshan-e-Iqbal, Karachi", Phone = "+92 21 8765 4321" },
            new Branch { Name = "DHA Branch", Address = "Phase 6, DHA, Karachi", Phone = "+92 21 5555 0101" });
        db.SiteSettings.Add(new SiteSetting
        {
            ShopName = "Scooply", OwnerName = "Mr. A", Phone = "+92 21 1234 5678", Email = "hello@scooply.com",
            Address = "Block 5, Clifton, Karachi", WorkingHours = "Daily 11:00 AM - 12:00 AM",
            AboutText = "Scooply began as a single cart in 1998 and has grown into a beloved parlor with three branches. We are famous for small-batch ice cream made from real fruit, real cream and honest ingredients.",
            OwnerQuote = "Every scoop should taste like the first one I ever sold."
        });

        // ---------- FAQs ----------
        var faqs = new (string Cat, string Q, string A)[]
        {
            ("Membership", "How much does membership cost?", "Monthly membership is $15 and yearly is $150, saving you $30 compared to twelve monthly payments."),
            ("Membership", "How do I register?", "Choose a plan, enter your details and pay by credit or debit card. Your account is created only after the payment succeeds."),
            ("Membership", "What happens when my membership expires?", "You can still log in, but recipes stay locked until you renew from your dashboard."),
            ("Recipes", "How do I unlock recipes?", "Active members see the full ingredients and procedure for all 20 flavors. Free recipes are open to everyone."),
            ("Recipes", "Which recipes are free?", "Vanilla, Chocolate and Strawberry are free for all visitors. See the Free Recipe Available page."),
            ("Books", "Can I buy books without registering?", "Yes. Guests and members can both order books; just fill in the order form and pay by card."),
            ("Books", "How can I track my order?", "Use the Track Order page with your order number and email. Status moves from Placed to Processing to Sent to Completed."),
            ("Payments", "Is my card information safe?", "We never store your full card number or CVV. Only the last 4 digits are kept for your receipt."),
            ("Contest", "How do I submit my own recipe?", "Log in, open Adding Recipe, fill in the form with an image and submit. The admin reviews every entry."),
            ("Contest", "What do winners receive?", "Selected recipes earn prize money decided by the admin, a participation certificate, and a place under Top Recipe on the Home page.")
        };
        int order = 1;
        foreach (var f in faqs)
            db.Faqs.Add(new Faq { Category = f.Cat, Question = f.Q, Answer = f.A, DisplayOrder = order++ });

        await db.SaveChangesAsync();
    }

    /// <summary>All 20 flavors with complete ingredient lists and step-by-step procedures.</summary>
    private static List<FlavorSeed> FlavorData() => new()
    {
        new("Vanilla", "vanilla", "Classic creamy vanilla bean, the one every parlor is judged by.", false, true, 40, 8,
            new[]{"2 cups heavy cream","1 cup whole milk","3/4 cup sugar","1 vanilla bean (or 1 tbsp pure vanilla extract)","5 egg yolks","Pinch of salt"},
            new[]{"Heat milk, cream, half the sugar and scraped vanilla bean until steaming.","Whisk egg yolks with remaining sugar until pale.","Slowly stream hot milk into yolks while whisking.","Return to pan and cook on low until it coats a spoon (80°C).","Strain, chill for 4 hours.","Churn in an ice cream maker, then freeze 4 hours."}),
        new("Chocolate", "chocolate", "Deep, dark and silky chocolate made with real cocoa.", true, true, 45, 8,
            new[]{"2 cups heavy cream","1 cup whole milk","3/4 cup sugar","1/2 cup unsweetened cocoa powder","100 g dark chocolate, chopped","4 egg yolks","1 tsp vanilla extract"},
            new[]{"Whisk cocoa, sugar and a little milk into a paste in a saucepan.","Add remaining milk and cream, heat until steaming.","Temper the egg yolks with the hot mixture.","Cook gently to 80°C, then stir in chopped chocolate until melted.","Add vanilla, strain and chill 4 hours.","Churn and freeze until firm."}),
        new("Chocolate Chip", "chocolate-chip", "Vanilla ice cream loaded with crisp chocolate chips.", true, false, 40, 8,
            new[]{"2 cups heavy cream","1 cup whole milk","3/4 cup sugar","1 tbsp vanilla extract","4 egg yolks","3/4 cup mini chocolate chips"},
            new[]{"Make a vanilla custard: heat milk, cream and half the sugar.","Whisk yolks with remaining sugar and temper with hot milk.","Cook to 80°C, stir in vanilla and chill 4 hours.","Churn until soft-serve consistency.","Fold in chocolate chips.","Freeze 4 hours."}),
        new("Strawberry", "strawberry", "Fresh strawberries folded through sweet cream.", false, true, 35, 8,
            new[]{"2 cups fresh strawberries, hulled","3/4 cup sugar","2 cups heavy cream","1 cup whole milk","1 tbsp lemon juice","1 tsp vanilla extract"},
            new[]{"Slice strawberries, toss with 1/4 cup sugar and lemon juice, rest 30 minutes.","Mash roughly, leaving small chunks.","Whisk cream, milk, remaining sugar and vanilla until sugar dissolves.","Stir in strawberry mixture and chill 2 hours.","Churn in an ice cream maker.","Freeze 4 hours before serving."}),
        new("Mango", "mango", "Ripe, golden mango pulp for a tropical scoop.", true, false, 30, 8,
            new[]{"3 ripe mangoes (about 2 cups pulp)","1 cup heavy cream","1 cup condensed milk","1/2 cup whole milk","1 tbsp lime juice","Pinch of cardamom (optional)"},
            new[]{"Peel mangoes and blend to a smooth pulp.","Whisk condensed milk, milk and lime juice together.","Whip cream to soft peaks.","Fold mango pulp into the milk mixture, then fold in whipped cream.","Pour into a container and freeze 2 hours.","Stir to break crystals, freeze 4 more hours."}),
        new("Coffee", "coffee", "Bold espresso swirled into cream for coffee lovers.", true, false, 40, 8,
            new[]{"2 cups heavy cream","1 cup whole milk","3/4 cup sugar","3 tbsp instant espresso powder","4 egg yolks","1/2 tsp vanilla extract"},
            new[]{"Heat milk, cream and espresso powder until steaming and dissolved.","Whisk yolks and sugar until pale.","Temper yolks with hot coffee-milk.","Cook to 80°C, strain and add vanilla.","Chill 4 hours.","Churn and freeze 4 hours."}),
        new("Black Currant", "black-currant", "Tangy dark berries ripple through creamy ice cream.", false, false, 40, 8,
            new[]{"1 1/2 cups black currants (fresh or frozen)","3/4 cup sugar","2 cups heavy cream","1 cup whole milk","1 tbsp lemon juice"},
            new[]{"Simmer currants with 1/2 cup sugar and lemon juice for 10 minutes.","Blend and strain out the skins; cool the puree.","Whisk cream, milk and remaining sugar until dissolved.","Stir in two thirds of the puree and chill 2 hours.","Churn, layering the remaining puree as a ripple.","Freeze 4 hours."}),
        new("Cherry", "cherry", "Sweet cherries and cherry pieces in vanilla cream.", false, false, 40, 8,
            new[]{"2 cups pitted cherries","3/4 cup sugar","2 cups heavy cream","1 cup whole milk","1 tsp almond extract","1 tbsp lemon juice"},
            new[]{"Cook cherries with 1/4 cup sugar and lemon juice until soft.","Mash half, keep half in chunks, then cool.","Whisk cream, milk, remaining sugar and almond extract.","Chill 2 hours, then churn.","Fold in the cherry mixture.","Freeze 4 hours."}),
        new("Butterscotch", "butterscotch", "Buttery caramelised sugar with crunchy butterscotch bits.", true, false, 50, 8,
            new[]{"1 cup brown sugar","4 tbsp butter","2 cups heavy cream","1 cup whole milk","4 egg yolks","1 tsp vanilla extract","1/2 tsp salt","1/2 cup crushed butterscotch candy"},
            new[]{"Melt butter and brown sugar until bubbling, 3 minutes.","Carefully whisk in 1/2 cup cream and the salt to make the butterscotch sauce.","Heat milk and remaining cream; temper into yolks.","Combine with butterscotch sauce and cook to 80°C.","Add vanilla, chill 4 hours and churn.","Fold in crushed candy and freeze 4 hours."}),
        new("Walnut", "walnut", "Toasted walnuts in maple-kissed cream.", false, false, 40, 8,
            new[]{"1 cup walnuts","2 cups heavy cream","1 cup whole milk","3/4 cup sugar","4 egg yolks","2 tbsp maple syrup","1 tsp vanilla extract"},
            new[]{"Toast walnuts at 175°C for 8 minutes, cool and chop.","Heat milk, cream and half the sugar.","Temper yolks with remaining sugar and hot milk.","Cook to 80°C, add maple and vanilla, chill 4 hours.","Churn until thick.","Fold in walnuts and freeze 4 hours."}),
        new("Vanilla and Strawberry (Two in One)", "vanilla-strawberry", "Two classic scoops in one tub: vanilla and strawberry.", false, false, 60, 10,
            new[]{"Vanilla base: 1 cup cream, 1/2 cup milk, 1/3 cup sugar, 1 tsp vanilla","Strawberry base: 1 cup strawberry puree, 1 cup cream, 1/3 cup sugar, 1 tsp lemon juice"},
            new[]{"Prepare the vanilla base: whisk cream, milk, sugar and vanilla until smooth.","Prepare the strawberry base: whisk puree, cream, sugar and lemon juice.","Chill both bases 2 hours.","Churn each flavor separately.","Spoon alternating layers into a loaf pan and swirl once with a knife.","Freeze 5 hours until firm."}),
        new("Pistachio", "pistachio", "Rich roasted pistachio with a smooth nutty finish.", true, false, 50, 8,
            new[]{"1 cup shelled unsalted pistachios","2 cups heavy cream","1 cup whole milk","3/4 cup sugar","4 egg yolks","1/4 tsp almond extract","Pinch of salt"},
            new[]{"Blanch and peel pistachios; grind half to a fine paste with a little milk.","Heat milk, cream, sugar and pistachio paste.","Temper egg yolks into the hot mixture.","Cook to 80°C, strain, add almond extract and salt.","Chill 4 hours, then churn.","Fold in remaining chopped pistachios; freeze 4 hours."}),
        new("Banana", "banana", "Naturally sweet ripe bananas, creamy and smooth.", false, false, 25, 6,
            new[]{"3 very ripe bananas","1 cup heavy cream","1/2 cup condensed milk","1/2 cup whole milk","1 tsp vanilla extract","1 tbsp lemon juice"},
            new[]{"Mash bananas with lemon juice until smooth.","Whip cream to soft peaks.","Stir condensed milk, milk and vanilla into the bananas.","Fold in whipped cream gently.","Freeze 3 hours in a covered tub.","Stir once after 90 minutes for a smoother texture."}),
        new("Banana Chocolate Chip", "banana-chocolate-chip", "Banana ice cream studded with dark chocolate chips.", false, false, 30, 6,
            new[]{"3 very ripe bananas","1 cup heavy cream","1/2 cup condensed milk","1/2 cup whole milk","1 tsp vanilla extract","1/2 cup dark chocolate chips"},
            new[]{"Mash bananas smooth.","Whip cream to soft peaks.","Mix bananas with condensed milk, milk and vanilla.","Fold in the whipped cream.","Fold in chocolate chips and pour into a tub.","Freeze 4 hours."}),
        new("Chocolate Almond", "chocolate-almond", "Chocolate ice cream with roasted almond crunch.", false, false, 45, 8,
            new[]{"2 cups heavy cream","1 cup whole milk","3/4 cup sugar","1/2 cup cocoa powder","1 cup roasted almonds, chopped","4 egg yolks","1 tsp vanilla extract"},
            new[]{"Roast almonds at 175°C for 7 minutes; chop and set aside.","Heat milk, cream, sugar and cocoa until smooth.","Temper yolks with the hot chocolate mixture.","Cook to 80°C, add vanilla, chill 4 hours.","Churn until thick.","Fold in almonds and freeze 4 hours."}),
        new("Chocolate Truffle", "chocolate-truffle", "Intense ganache-style chocolate with truffle pieces.", true, false, 60, 8,
            new[]{"200 g dark chocolate (70%)","2 cups heavy cream","1 cup whole milk","1/2 cup sugar","4 egg yolks","2 tbsp cocoa powder","1/2 cup chocolate truffle pieces"},
            new[]{"Heat 1 cup cream and pour over chopped chocolate; stir into a smooth ganache.","Heat milk, remaining cream, sugar and cocoa.","Temper yolks and cook to 80°C.","Whisk the custard into the ganache until glossy.","Chill 5 hours, then churn.","Fold in truffle pieces and freeze 5 hours."}),
        new("Kiwi Fruit", "kiwi-fruit", "Zesty kiwi with a bright green, refreshing finish.", false, false, 30, 6,
            new[]{"6 ripe kiwis, peeled","3/4 cup sugar","1 cup heavy cream","1 cup whole milk","1 tbsp lime juice"},
            new[]{"Blend kiwis lightly, keeping the seeds intact.","Stir with sugar and lime juice until dissolved.","Whisk in milk and cream.","Chill 2 hours.","Churn until thick.","Freeze 4 hours."}),
        new("Pineapple", "pineapple", "Sweet and tangy pineapple pieces in cool cream.", false, false, 35, 8,
            new[]{"2 cups fresh pineapple, finely chopped","3/4 cup sugar","2 cups heavy cream","1 cup whole milk","1 tbsp lemon juice"},
            new[]{"Simmer pineapple with 1/4 cup sugar for 8 minutes; cool.","Blend half the pineapple to a puree, keep the rest chopped.","Whisk cream, milk and remaining sugar.","Stir in puree and lemon juice, chill 2 hours.","Churn the mixture.","Fold in chopped pineapple; freeze 4 hours."}),
        new("Fruit and Nut", "fruit-and-nut", "Mixed dried fruit and crunchy nuts in creamy vanilla.", false, false, 45, 8,
            new[]{"2 cups heavy cream","1 cup whole milk","3/4 cup sugar","4 egg yolks","1/4 cup chopped almonds","1/4 cup chopped cashews","1/4 cup raisins","1/4 cup tutti-frutti or dried fruit","1 tsp vanilla extract"},
            new[]{"Make a vanilla custard with milk, cream, sugar and yolks (80°C).","Add vanilla, chill 4 hours.","Lightly toast the nuts and soak the raisins in warm water for 10 minutes.","Churn the custard until thick.","Fold in nuts, raisins and dried fruit.","Freeze 4 hours."}),
        new("Cashew Caramel Crunch", "cashew-caramel-crunch", "Salted caramel ice cream with crunchy cashew brittle.", true, false, 70, 8,
            new[]{"3/4 cup sugar for caramel","2 cups heavy cream","1 cup whole milk","4 egg yolks","1/2 tsp sea salt","1 tsp vanilla extract","1 cup cashew pieces","1/2 cup sugar for brittle"},
            new[]{"Make caramel: melt 3/4 cup sugar until amber, whisk in 1 cup warm cream.","Heat milk and remaining cream, temper into yolks.","Combine with caramel, cook to 80°C, add salt and vanilla.","Chill 4 hours.","For brittle: melt 1/2 cup sugar, stir in cashews, spread on parchment, cool and crush.","Churn the custard, fold in brittle, freeze 5 hours."}),
    };
}
