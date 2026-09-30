using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class RoomTypeEndpoints
{
    public static void MapRoomTypeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/room-types").WithTags("Thể loại phòng").RequireAuthorization();

        // GET /api/room-types
        group.MapGet("/", async (HotelDbContext db) =>
        {
            var types = await db.RoomTypes
                .OrderBy(t => t.PricePerNight)
                .Select(t => new { Type = t, Count = t.Rooms.Count })
                .ToListAsync();

            return Results.Ok(types.Select(x => Mapper.ToDto(x.Type, x.Count)));
        })
        .WithSummary("Danh sách thể loại phòng");

        // GET /api/room-types/{id}
        group.MapGet("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var type = await db.RoomTypes.Include(t => t.Rooms).FirstOrDefaultAsync(t => t.Id == id);
            return type is null ? Results.NotFound() : Results.Ok(Mapper.ToDto(type, type.Rooms.Count));
        });

        // POST /api/room-types
        group.MapPost("/", async (RoomTypeRequest req, HotelDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { message = "Tên thể loại không được để trống." });

            if (req.PricePerNight <= 0)
                return Results.BadRequest(new { message = "Giá thuê phải lớn hơn 0." });

            var type = new RoomType
            {
                Name = req.Name.Trim(),
                PricePerNight = req.PricePerNight,
                Capacity = req.Capacity <= 0 ? 2 : req.Capacity,
                Description = req.Description?.Trim()
            };

            db.RoomTypes.Add(type);
            await db.SaveChangesAsync();
            return Results.Created($"/api/room-types/{type.Id}", Mapper.ToDto(type));
        })
        .WithSummary("Thêm thể loại phòng");

        // PUT /api/room-types/{id}
        group.MapPut("/{id:int}", async (int id, RoomTypeRequest req, HotelDbContext db) =>
        {
            var type = await db.RoomTypes.FindAsync(id);
            if (type is null) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { message = "Tên thể loại không được để trống." });

            type.Name = req.Name.Trim();
            type.PricePerNight = req.PricePerNight;
            type.Capacity = req.Capacity <= 0 ? 2 : req.Capacity;
            type.Description = req.Description?.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(Mapper.ToDto(type));
        })
        .WithSummary("Cập nhật thể loại phòng");

        // DELETE /api/room-types/{id}
        group.MapDelete("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var type = await db.RoomTypes.FindAsync(id);
            if (type is null) return Results.NotFound();

            var inUse = await db.Rooms.AnyAsync(r => r.RoomTypeId == id);
            if (inUse)
                return Results.BadRequest(new { message = "Không thể xoá: thể loại đang được phòng sử dụng." });

            db.RoomTypes.Remove(type);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã xoá thể loại phòng." });
        })
        .WithSummary("Xoá thể loại phòng");
    }
}