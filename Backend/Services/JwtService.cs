using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Models;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public class JwtOptions
{
    public string Key { get; set; } = "TTCS_HOTEL_MANAGEMENT_SUPER_SECRET_KEY_2026_CHANGE_ME";
    public string Issuer { get; set; } = "HotelManager";
    public string Audience { get; set; } = "HotelManagerClient";
    public int ExpireHours { get; set; } = 12;
}

public class JwtService
{
    private readonly JwtOptions _options;

    public JwtService(JwtOptions options) => _options = options;

    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var expires = DateTime.Now.AddHours(_options.ExpireHours);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.GivenName, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public TokenValidationParameters ValidationParameters => new()
    {
        ValidateIssuer = true,
        ValidIssuer = _options.Issuer,
        ValidateAudience = true,
        ValidAudience = _options.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(2)
    };
}