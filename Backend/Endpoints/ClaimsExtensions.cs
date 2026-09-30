using System.Security.Claims;
using Backend.Models;

namespace Backend.Endpoints;

public static class ClaimsExtensions
{
    public static int GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : 0;
    }

    public static string GetUsername(this ClaimsPrincipal principal)
        => principal.FindFirstValue(ClaimTypes.Name) ?? "system";
}