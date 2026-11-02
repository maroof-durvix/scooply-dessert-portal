using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
namespace Scooply.Api.Services;

/// <summary>Creates signed JWT access tokens carrying user id, name and role.</summary>
public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Create(int id, string name, string role, bool remember);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _cfg;
    public TokenService(IConfiguration cfg) => _cfg = cfg;

    public (string Token, DateTime ExpiresAt) Create(int id, string name, string role, bool remember)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // "Remember me" gets a long-lived token; otherwise a short session token.
        var lifetime = remember
            ? TimeSpan.FromDays(int.Parse(_cfg["Jwt:RememberDays"] ?? "30"))
            : TimeSpan.FromMinutes(int.Parse(_cfg["Jwt:ExpiryMinutes"] ?? "120"));
        var expires = DateTime.UtcNow.Add(lifetime);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim(ClaimTypes.Name, name),
            new Claim(ClaimTypes.Role, role)
        };
        var jwt = new JwtSecurityToken(_cfg["Jwt:Issuer"], _cfg["Jwt:Audience"], claims,
            expires: expires, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}
