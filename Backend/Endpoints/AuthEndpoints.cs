using System.Security.Claims;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Xác thực");

        // POST /api/auth/login
        group.MapPost("/login", async (LoginRequest req, HotelDbContext db, JwtService jwt) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
            if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash, user.PasswordSalt))
                return Results.Unauthorized();

            if (!user.IsActive)
                return Results.BadRequest(new { message = "Tài khoản đã bị khoá." });

            user.LastLoginAt = DateTime.Now;
            await db.SaveChangesAsync();

            var (token, expires) = jwt.CreateToken(user);
            return Results.Ok(new LoginResponse(token, expires, Mapper.ToDto(user)));
        })
        .AllowAnonymous()
        .WithSummary("Đăng nhập và nhận JWT");

        // GET /api/auth/me
        group.MapGet("/me", async (ClaimsPrincipal principal, HotelDbContext db) =>
        {
            var id = principal.GetUserId();
            var user = await db.Users.FindAsync(id);
            return user is null ? Results.NotFound() : Results.Ok(Mapper.ToDto(user));
        })
        .RequireAuthorization()
        .WithSummary("Lấy thông tin tài khoản đang đăng nhập");

        // PUT /api/auth/profile
        group.MapPut("/profile", async (UpdateProfileRequest req, ClaimsPrincipal principal, HotelDbContext db) =>
        {
            var user = await db.Users.FindAsync(principal.GetUserId());
            if (user is null) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(req.FullName))
                return Results.BadRequest(new { message = "Họ tên không được để trống." });

            user.FullName = req.FullName.Trim();
            user.Email = req.Email?.Trim();
            user.Phone = req.Phone?.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(Mapper.ToDto(user));
        })
        .RequireAuthorization()
        .WithSummary("Cập nhật thông tin cá nhân");

        // POST /api/auth/change-password
        group.MapPost("/change-password", async (ChangePasswordRequest req, ClaimsPrincipal principal, HotelDbContext db) =>
        {
            var user = await db.Users.FindAsync(principal.GetUserId());
            if (user is null) return Results.NotFound();

            if (!PasswordHasher.Verify(req.CurrentPassword, user.PasswordHash, user.PasswordSalt))
                return Results.BadRequest(new { message = "Mật khẩu hiện tại không đúng." });

            if (req.NewPassword.Length < 6)
                return Results.BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự." });

            var (hash, salt) = PasswordHasher.Hash(req.NewPassword);
            user.PasswordHash = hash;
            user.PasswordSalt = salt;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đổi mật khẩu thành công." });
        })
        .RequireAuthorization()
        .WithSummary("Đổi mật khẩu");
    }
}