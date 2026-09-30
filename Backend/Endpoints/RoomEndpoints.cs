using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class RoomEndpoints
{
    public static void MapRoomEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/rooms").WithTags("Phòng").RequireAuthorization();

        // GET /api/rooms?status=&floor=&search=
        group.MapGet("/", async (string? status, int? floor, string? search, HotelDbContext db) =>
        {
            var query = db.Rooms
                .Include(r => r.RoomType)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(r => r.RoomNumber.Contains(search));

            if (floor is > 0)
                query = query.Where(r => r.Floor == floor);

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RoomStatus>(status, true, out var st))
                query = query.Where(r => r.Status == st);

            var rooms = await query.OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber).ToListAsync();

            var roomIds = rooms.Select(r => r.Id).ToList();
            var active = await db.Bookings
                .Include(b => b.Customer)
                .Where(b => roomIds.Contains(b.RoomId) && b.Status == BookingStatus.CheckedIn)
                .ToListAsync();

            var result = rooms.Select(r =>
                Mapper.ToDto(r, active.FirstOrDefault(b => b.RoomId == r.Id))).ToList();

            return Results.Ok(result);
        })
        .WithSummary("Danh sách phòng (lọc theo trạng thái / tầng / số phòng)");

        // GET /api/rooms/{id}
        group.MapGet("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var room = await db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.Id == id);
            if (room is null) return Results.NotFound();

            var active = await db.Bookings
                .Include(b => b.Customer)
                .FirstOrDefaultAsync(b => b.RoomId == id && b.Status == BookingStatus.CheckedIn);

            return Results.Ok(Mapper.ToDto(room, active));
        });

        // GET /api/rooms/available
        group.MapGet("/available", async (HotelDbContext db) =>
        {
            var rooms = await db.Rooms
                .Include(r => r.RoomType)
                .Where(r => r.Status == RoomStatus.Available)
                .OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber)
                .ToListAsync();

            return Results.Ok(rooms.Select(r => Mapper.ToDto(r)));
        })
        .WithSummary("Danh sách phòng đang trống");

        // POST /api/rooms
        group.MapPost("/", async (RoomRequest req, HotelDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.RoomNumber))
                return Results.BadRequest(new { message = "Số phòng không được để trống." });

            if (!await db.RoomTypes.AnyAsync(t => t.Id == req.RoomTypeId))
                return Results.BadRequest(new { message = "Thể loại phòng không tồn tại." });

            if (await db.Rooms.AnyAsync(r => r.RoomNumber == req.RoomNumber.Trim()))
                return Results.BadRequest(new { message = $"Số phòng {req.RoomNumber} đã tồn tại." });

            var status = RoomStatus.Available;
            if (!string.IsNullOrWhiteSpace(req.Status) && Enum.TryParse<RoomStatus>(req.Status, true, out var parsed))
                status = parsed;

            var room = new Room
            {
                RoomNumber = req.RoomNumber.Trim(),
                Floor = req.Floor <= 0 ? 1 : req.Floor,
                RoomTypeId = req.RoomTypeId,
                Status = status,
                Note = req.Note?.Trim()
            };

            db.Rooms.Add(room);
            await db.SaveChangesAsync();

            room = await db.Rooms.Include(r => r.RoomType).FirstAsync(r => r.Id == room.Id);
            return Results.Created($"/api/rooms/{room.Id}", Mapper.ToDto(room));
        })
        .WithSummary("Thêm phòng mới");

        // PUT /api/rooms/{id}
        group.MapPut("/{id:int}", async (int id, RoomRequest req, HotelDbContext db) =>
        {
            var room = await db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.Id == id);
            if (room is null) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(req.RoomNumber))
                return Results.BadRequest(new { message = "Số phòng không được để trống." });

            if (await db.Rooms.AnyAsync(r => r.Id != id && r.RoomNumber == req.RoomNumber.Trim()))
                return Results.BadRequest(new { message = $"Số phòng {req.RoomNumber} đã tồn tại." });

            if (!await db.RoomTypes.AnyAsync(t => t.Id == req.RoomTypeId))
                return Results.BadRequest(new { message = "Thể loại phòng không tồn tại." });

            var isOccupied = await db.Bookings.AnyAsync(b => b.RoomId == id && b.Status == BookingStatus.CheckedIn);

            room.RoomNumber = req.RoomNumber.Trim();
            room.Floor = req.Floor <= 0 ? 1 : req.Floor;
            room.RoomTypeId = req.RoomTypeId;
            room.Note = req.Note?.Trim();

            if (!string.IsNullOrWhiteSpace(req.Status) && Enum.TryParse<RoomStatus>(req.Status, true, out var parsed))
            {
                if (isOccupied && parsed != RoomStatus.Occupied)
                    return Results.BadRequest(new { message = "Phòng đang có khách, không thể đổi trạng thái. Hãy trả phòng trước." });

                room.Status = isOccupied ? RoomStatus.Occupied : parsed;
            }

            await db.SaveChangesAsync();

            room = await db.Rooms.Include(r => r.RoomType).FirstAsync(r => r.Id == id);
            return Results.Ok(Mapper.ToDto(room));
        })
        .WithSummary("Cập nhật phòng");

        // DELETE /api/rooms/{id}
        group.MapDelete("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var room = await db.Rooms.FindAsync(id);
            if (room is null) return Results.NotFound();

            if (await db.Bookings.AnyAsync(b => b.RoomId == id && b.Status == BookingStatus.CheckedIn))
                return Results.BadRequest(new { message = "Phòng đang có khách, không thể xoá." });

            if (await db.Bookings.AnyAsync(b => b.RoomId == id))
                return Results.BadRequest(new { message = "Phòng đã có lịch sử thuê, không thể xoá." });

            db.Rooms.Remove(room);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã xoá phòng." });
        })
        .WithSummary("Xoá phòng");
    }
}