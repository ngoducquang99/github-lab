using System.Security.Claims;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class BookingEndpoints
{
    public static void MapBookingEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/bookings").WithTags("Thuê phòng / Trả phòng").RequireAuthorization();

        // GET /api/bookings?status=
        group.MapGet("/", async (string? status, HotelDbContext db) =>
        {
            var query = db.Bookings
                .Include(b => b.Room).ThenInclude(r => r!.RoomType)
                .Include(b => b.Customer)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BookingStatus>(status, true, out var st))
                query = query.Where(b => b.Status == st);

            var bookings = await query
                .OrderByDescending(b => b.CheckInDate)
                .ThenByDescending(b => b.Id)
                .ToListAsync();

            return Results.Ok(bookings.Select(Mapper.ToDto));
        })
        .WithSummary("Danh sách lượt thuê phòng");

        // GET /api/bookings/active  -> danh sách khách đang ở (dùng cho trang Trả phòng)
        group.MapGet("/active", async (HotelDbContext db) =>
        {
            var bookings = await db.Bookings
                .Include(b => b.Room).ThenInclude(r => r!.RoomType)
                .Include(b => b.Customer)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .Where(b => b.Status == BookingStatus.CheckedIn)
                .OrderBy(b => b.Room!.RoomNumber)
                .ToListAsync();

            return Results.Ok(bookings.Select(Mapper.ToDto));
        })
        .WithSummary("Danh sách khách đang lưu trú");

        // GET /api/bookings/{id}
        group.MapGet("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var booking = await db.Bookings
                .Include(b => b.Room).ThenInclude(r => r!.RoomType)
                .Include(b => b.Customer)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .FirstOrDefaultAsync(b => b.Id == id);

            return booking is null ? Results.NotFound() : Results.Ok(Mapper.ToDto(booking));
        });

        // POST /api/bookings  -> cho thuê phòng
        group.MapPost("/", async (RentalRequest req, ClaimsPrincipal principal, HotelDbContext db) =>
        {
            var room = await db.Rooms
                .Include(r => r.RoomType)
                .FirstOrDefaultAsync(r => r.Id == req.RoomId);

            if (room is null)
                return Results.BadRequest(new { message = "Phòng không tồn tại." });

            if (room.Status != RoomStatus.Available)
                return Results.BadRequest(new { message = $"Phòng {room.RoomNumber} hiện không trống ({Mapper.StatusText(room.Status)})." });

            if (string.IsNullOrWhiteSpace(req.CustomerName) || string.IsNullOrWhiteSpace(req.CustomerPhone))
                return Results.BadRequest(new { message = "Tên và số điện thoại khách hàng là bắt buộc." });

            if (req.ExpectedCheckOutDate.HasValue && req.ExpectedCheckOutDate.Value.Date < req.CheckInDate.Date)
                return Results.BadRequest(new { message = "Ngày trả phòng phải sau ngày nhận phòng." });

            // Tìm khách cũ theo id hoặc số điện thoại, nếu chưa có thì tạo mới
            Customer? customer = null;
            if (req.CustomerId is > 0)
                customer = await db.Customers.FindAsync(req.CustomerId.Value);

            customer ??= await db.Customers.FirstOrDefaultAsync(c => c.Phone == req.CustomerPhone.Trim());

            if (customer is null)
            {
                customer = new Customer
                {
                    FullName = req.CustomerName.Trim(),
                    Phone = req.CustomerPhone.Trim(),
                    Email = req.CustomerEmail?.Trim(),
                    IdCard = req.CustomerIdCard?.Trim(),
                    Address = req.CustomerAddress?.Trim()
                };
                db.Customers.Add(customer);
                await db.SaveChangesAsync();
            }

            var nextCode = await db.Bookings.CountAsync() + 1001;

            var booking = new Booking
            {
                Code = $"BK{nextCode}",
                RoomId = room.Id,
                CustomerId = customer.Id,
                GuestCount = req.GuestCount <= 0 ? 1 : req.GuestCount,
                CheckInDate = req.CheckInDate == default ? DateTime.Today : req.CheckInDate.Date,
                ExpectedCheckOutDate = req.ExpectedCheckOutDate?.Date,
                PricePerNight = room.RoomType?.PricePerNight ?? 0,
                Status = BookingStatus.CheckedIn,
                Note = req.Note?.Trim()
            };

            room.Status = RoomStatus.Occupied;

            db.Bookings.Add(booking);
            await db.SaveChangesAsync();

            booking = await db.Bookings
                .Include(b => b.Room).ThenInclude(r => r!.RoomType)
                .Include(b => b.Customer)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .FirstAsync(b => b.Id == booking.Id);

            return Results.Created($"/api/bookings/{booking.Id}", Mapper.ToDto(booking));
        })
        .WithSummary("Cho thuê phòng (tạo lượt thuê, đưa phòng sang trạng thái đang thuê)");

        // POST /api/bookings/{id}/services -> thêm dịch vụ phát sinh
        group.MapPost("/{id:int}/services", async (int id, AddServiceRequest req, HotelDbContext db) =>
        {
            var booking = await db.Bookings
                .Include(b => b.Services)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking is null) return Results.NotFound();

            if (booking.Status != BookingStatus.CheckedIn)
                return Results.BadRequest(new { message = "Chỉ thêm dịch vụ cho lượt thuê đang hoạt động." });

            if (string.IsNullOrWhiteSpace(req.Name) || req.Price < 0 || req.Quantity <= 0)
                return Results.BadRequest(new { message = "Thông tin dịch vụ không hợp lệ." });

            booking.Services.Add(new BookingService
            {
                Name = req.Name.Trim(),
                Price = req.Price,
                Quantity = req.Quantity,
                UsedAt = DateTime.Now
            });

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã thêm dịch vụ." });
        })
        .WithSummary("Thêm dịch vụ phát sinh cho lượt thuê");

        // DELETE /api/bookings/services/{serviceId}
        group.MapDelete("/services/{serviceId:int}", async (int serviceId, HotelDbContext db) =>
        {
            var service = await db.BookingServices.FindAsync(serviceId);
            if (service is null) return Results.NotFound();

            db.BookingServices.Remove(service);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã xoá dịch vụ." });
        })
        .WithSummary("Xoá dịch vụ phát sinh");

        // POST /api/bookings/{id}/checkout -> trả phòng + lập hoá đơn
        group.MapPost("/{id:int}/checkout", async (int id, CheckoutRequest req, ClaimsPrincipal principal, HotelDbContext db) =>
        {
            var booking = await db.Bookings
                .Include(b => b.Room)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking is null) return Results.NotFound();

            if (booking.Status != BookingStatus.CheckedIn)
                return Results.BadRequest(new { message = "Lượt thuê này không ở trạng thái đang ở." });

            booking.ActualCheckOutDate = DateTime.Today;
            booking.Status = BookingStatus.CheckedOut;

            if (booking.Room is not null)
                booking.Room.Status = RoomStatus.Available;

            var roomAmount = booking.SubTotal;
            var serviceAmount = booking.ServiceTotal;
            var discount = req.Discount < 0 ? 0 : req.Discount;
            var total = roomAmount + serviceAmount - discount;
            if (total < 0) total = 0;

            var nextInvoice = await db.Invoices.CountAsync() + 1;

            var invoice = new Invoice
            {
                Code = $"HD{nextInvoice:0000}",
                BookingId = booking.Id,
                RoomAmount = roomAmount,
                ServiceAmount = serviceAmount,
                Discount = discount,
                TotalAmount = total,
                CreatedAt = DateTime.Now,
                CreatedBy = principal.GetUsername()
            };

            db.Invoices.Add(invoice);
            await db.SaveChangesAsync();

            var full = await db.Bookings
                .Include(b => b.Room).ThenInclude(r => r!.RoomType)
                .Include(b => b.Customer)
                .Include(b => b.Services)
                .Include(b => b.Invoices)
                .FirstAsync(b => b.Id == booking.Id);

            return Results.Ok(Mapper.ToDto(full));
        })
        .WithSummary("Trả phòng và lập hoá đơn thanh toán");

        // DELETE /api/bookings/{id} -> huỷ lượt thuê chưa phát sinh
        group.MapDelete("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var booking = await db.Bookings.Include(b => b.Room).FirstOrDefaultAsync(b => b.Id == id);
            if (booking is null) return Results.NotFound();

            if (booking.Status == BookingStatus.CheckedOut)
                return Results.BadRequest(new { message = "Không thể xoá lượt thuê đã trả phòng (đã có hoá đơn)." });

            if (booking.Room is not null && booking.Status == BookingStatus.CheckedIn)
                booking.Room.Status = RoomStatus.Available;

            booking.Status = BookingStatus.Cancelled;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Đã huỷ lượt thuê." });
        })
        .WithSummary("Huỷ lượt thuê");
    }
}