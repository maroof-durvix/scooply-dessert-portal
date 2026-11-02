using Microsoft.AspNetCore.Mvc;
using Scooply.Api.Data;
using Scooply.Api.DTOs;
using Scooply.Api.Models;
using Scooply.Api.Services;
namespace Scooply.Api.Controllers;

/// <summary>Feedback form for guests and members.</summary>
[ApiController]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private readonly AppDbContext _db;
    public FeedbackController(AppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Post(FeedbackRequest r)
    {
        _db.Feedbacks.Add(new Feedback { UserId = User.MemberId(), Name = r.Name.Trim(), Email = r.Email.Trim(),
            Rating = r.Rating, Subject = r.Subject.Trim(), Message = r.Message.Trim() });
        await _db.SaveChangesAsync();
        return Ok(new { message = "Thank you for your feedback!" });
    }
}
