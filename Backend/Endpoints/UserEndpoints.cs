using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Người dùng")
            .RequireAuthorization(policy => policy.RequireRole(nameof(UserRole.Admin)));

        // GET /api/users
        group.MapGet("/", async (HotelDbContext db) =>
        {
            var users = await db.Users.OrderBy(u => u.Id).ToListAsync();
            return Results.Ok(users.Select(Mapper.ToDto));
        })
        .WithSummary("Danh sách tài khoản (chỉ Admin)");

        // POST /api/users
        group.MapPost("/", async (CreateUserRequest req, HotelDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { message = "Tên đăng nhập và mật khẩu là bắt buộc." });

            if (req.Password.Length < 6)
                return Results.BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự." });

            if (await db.Users.AnyAsync(u => u.Username == req.Username.Trim()))
                return Results.BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            var role = UserRole.Receptionist;
            if (!string.IsNullOrWhiteSpace(req.Role) && Enum.TryParse<UserRole>(req.Role, true, out var parsed))
                role = parsed;

            var (hash, salt) = PasswordHasher.Hash(req.Password);

            var user = new User
            {
                Username = req.Username.Trim(),
                FullName = string.IsNullOrWhiteSpace(req.FullName) ? req.Username.Trim() : req.FullName.Trim(),
                Email = req.Email?.Trim(),
                Phone = req.Phone?.Trim(),
                Role = role,
                PasswordHash = hash,
                PasswordSalt = salt
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();
            return Results.Created($"/api/users/{user.Id}", Mapper.ToDto(user));
        })
        .WithSummary("Tạo tài khoản nhân viên");

        // PUT /api/users/{id}/toggle -> khoá / mở khoá
        group.MapPut("/{id:int}/toggle", async (int id, HotelDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            if (user.Username == "admin")
                return Results.BadRequest(new { message = "Không thể khoá tài khoản admin mặc định." });

            user.IsActive = !user.IsActive;
            await db.SaveChangesAsync();
            return Results.Ok(Mapper.ToDto(user));
        })
        .WithSummary("Khoá / mở khoá tài khoản");

        // PUT /api/users/{id}/reset-password
        group.MapPut("/{id:int}/reset-password", async (int id, ChangePasswordRequest req, HotelDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            if (req.NewPassword.Length < 6)
                return Results.BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự." });

            var (hash, salt) = PasswordHasher.Hash(req.NewPassword);
            user.PasswordHash = hash;
            user.PasswordSalt = salt;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã đặt lại mật khẩu." });
        })
        .WithSummary("Đặt lại mật khẩu nhân viên");
    }
}