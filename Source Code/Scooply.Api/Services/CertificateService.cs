using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>Builds the Participation Certificate PDF for a selected contest recipe.</summary>
public class CertificateService
{
    public byte[] Generate(RecipeSubmission s, SiteSetting site)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var date = (s.ReviewedAt ?? DateTime.UtcNow).ToString("dd MMMM yyyy");

        return Document.Create(doc => doc.Page(p =>
        {
            p.Size(PageSizes.A4.Landscape());
            p.Margin(36);
            p.PageColor(Colors.White);
            p.DefaultTextStyle(t => t.FontSize(14).FontColor(Colors.Grey.Darken4));

            // Decorative double border + centred text block
            p.Content().Border(6).BorderColor("#FF5C8A").Padding(28).Column(col =>
            {
                col.Spacing(14);
                col.Item().AlignCenter().Text($"{site.ShopName}").FontSize(36).Bold().FontColor("#6C4AB6");
                col.Item().AlignCenter().Text("Certificate of Participation").FontSize(26).SemiBold();
                col.Item().AlignCenter().Text("This certificate is proudly presented to");
                col.Item().AlignCenter().Text(s.User?.FullName ?? "").FontSize(32).Bold().FontColor("#FF5C8A");
                col.Item().AlignCenter().Text($"for the selected recipe \"{s.RecipeTitle}\" in the {site.ShopName} Recipe Contest.");
                col.Item().AlignCenter().Text($"Prize Money Awarded: ${(s.PrizeAmount ?? 0):0.00}").FontSize(18).SemiBold();

                // Footer: date + certificate number on the left, owner signature on the right
                col.Item().PaddingTop(24).Row(r =>
                {
                    r.RelativeItem().Column(c =>
                    {
                        c.Item().Text($"Date: {date}");
                        c.Item().Text($"Certificate No: {s.CertificateNumber}");
                    });
                    r.RelativeItem().AlignRight().Column(c =>
                    {
                        c.Item().Width(200).LineHorizontal(1);
                        c.Item().Text(site.OwnerName).Bold();
                        c.Item().Text($"Owner, {site.ShopName}");
                    });
                });
            });
        })).GeneratePdf();
    }
}
