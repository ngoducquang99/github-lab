using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class StatisticsEndpoints
{
    public static void MapStatisticsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/statistics").WithTags("Thống kê").RequireAuthorization();

        // GET /api/statistics/dashboard -> trang Sơ đồ phòng / Trang chủ
        group.MapGet("/dashboard", async (HotelDbContext db) =>
        {
            var rooms = await db.Rooms
                .Include(r => r.RoomType)
                .OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber)
                .ToListAsync();

            var activeBookings = await db.Bookings
                .Include(b => b.Customer)
                .Where(b => b.Status == BookingStatus.CheckedIn)
                .ToListAsync();

            var recent = await db.Bookings
                .Include(b => b.Room).ThenInclude(r => r!.RoomType)
                .Include(b => b.Customer)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .OrderByDescending(b => b.Id)
                .Take(6)
                .ToListAsync();

            var today = DateTime.Today;
            var monthStart = new DateTime(today.Year, today.Month, 1);

            var revenueToday = await db.Invoices
                .Where(i => i.CreatedAt >= today)
                .SumAsync(i => (decimal?)i.TotalAmount) ?? 0;

            var revenueMonth = await db.Invoices
                .Where(i => i.CreatedAt >= monthStart)
                .SumAsync(i => (decimal?)i.TotalAmount) ?? 0;

            var revenueTotal = await db.Invoices
                .SumAsync(i => (decimal?)i.TotalAmount) ?? 0;

            var dto = new DashboardDto(
                rooms.Count,
                rooms.Count(r => r.Status == RoomStatus.Available),
                rooms.Count(r => r.Status == RoomStatus.Occupied),
                rooms.Count(r => r.Status == RoomStatus.Maintenance),
                rooms.Count(r => r.Status == RoomStatus.Reserved),
                await db.Customers.CountAsync(),
                activeBookings.Count,
                revenueToday,
                revenueMonth,
                revenueTotal,
                rooms.Select(r => Mapper.ToDto(r, activeBookings.FirstOrDefault(b => b.RoomId == r.Id))).ToList(),
                recent.Select(Mapper.ToDto).ToList());

            return Results.Ok(dto);
        })
        .WithSummary("Số liệu tổng quan + sơ đồ phòng");

        // GET /api/statistics/status -> trang Trạng thái phòng
        group.MapGet("/status", async (HotelDbContext db) =>
        {
            var rooms = await db.Rooms.Include(r => r.RoomType).ToListAsync();
            var active = await db.Bookings
                .Include(b => b.Customer)
                .Where(b => b.Status == BookingStatus.CheckedIn)
                .ToListAsync();

            var counts = new List<StatusCountDto>
            {
                new(nameof(RoomStatus.Available), Mapper.StatusText(RoomStatus.Available), rooms.Count(r => r.Status == RoomStatus.Available)),
                new(nameof(RoomStatus.Occupied), Mapper.StatusText(RoomStatus.Occupied), rooms.Count(r => r.Status == RoomStatus.Occupied)),
                new(nameof(RoomStatus.Reserved), Mapper.StatusText(RoomStatus.Reserved), rooms.Count(r => r.Status == RoomStatus.Reserved)),
                new(nameof(RoomStatus.Maintenance), Mapper.StatusText(RoomStatus.Maintenance), rooms.Count(r => r.Status == RoomStatus.Maintenance))
            };

            var total = rooms.Count;
            var occupancyRate = total == 0 ? 0 : Math.Round(rooms.Count(r => r.Status == RoomStatus.Occupied) * 100.0 / total, 1);

            var byFloor = rooms
                .GroupBy(r => r.Floor)
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    Floor = g.Key,
                    Total = g.Count(),
                    Available = g.Count(r => r.Status == RoomStatus.Available),
                    Occupied = g.Count(r => r.Status == RoomStatus.Occupied),
                    Maintenance = g.Count(r => r.Status == RoomStatus.Maintenance),
                    Reserved = g.Count(r => r.Status == RoomStatus.Reserved)
                })
                .ToList();

            return Results.Ok(new
            {
                TotalRooms = total,
                OccupancyRate = occupancyRate,
                Counts = counts,
                ByFloor = byFloor,
                Rooms = rooms.OrderBy(r => r.Floor).ThenBy(r => r.RoomNumber)
                    .Select(r => Mapper.ToDto(r, active.FirstOrDefault(b => b.RoomId == r.Id)))
            });
        })
        .WithSummary("Thống kê trạng thái phòng theo tầng");

        // GET /api/statistics/revenue?from=&to=
        group.MapGet("/revenue", async (DateTime? from, DateTime? to, HotelDbContext db) =>
        {
            var start = (from ?? DateTime.Today.AddDays(-29)).Date;
            var end = (to ?? DateTime.Today).Date;

            if (end < start) (start, end) = (end, start);
            var endExclusive = end.AddDays(1);

            var invoices = await db.Invoices
                .Include(i => i.Booking).ThenInclude(b => b!.Room)
                .Include(i => i.Booking).ThenInclude(b => b!.Customer)
                .Where(i => i.CreatedAt >= start && i.CreatedAt < endExclusive)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var total = invoices.Sum(i => i.TotalAmount);
            var roomRevenue = invoices.Sum(i => i.RoomAmount);
            var serviceRevenue = invoices.Sum(i => i.ServiceAmount);

            var byDay = invoices
                .GroupBy(i => i.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new RevenuePointDto(g.Key.ToString("dd/MM/yyyy"), g.Sum(i => i.TotalAmount), g.Count()))
                .ToList();

            var byMonth = invoices
                .GroupBy(i => new { i.CreatedAt.Year, i.CreatedAt.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new RevenuePointDto($"Tháng {g.Key.Month}/{g.Key.Year}", g.Sum(i => i.TotalAmount), g.Count()))
                .ToList();

            return Results.Ok(new RevenueReportDto(
                start,
                end,
                total,
                invoices.Count,
                roomRevenue,
                serviceRevenue,
                invoices.Count == 0 ? 0 : Math.Round(total / invoices.Count, 0),
                byDay,
                byMonth,
                invoices.Select(Mapper.ToDto).ToList()));
        })
        .WithSummary("Báo cáo thu nhập theo khoảng thời gian");
    }
}