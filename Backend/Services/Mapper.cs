using Backend.Dtos;
using Backend.Models;

namespace Backend.Services;

/// <summary>Chuyển đổi thực thể sang DTO trả về cho client.</summary>
public static class Mapper
{
    public static string StatusText(RoomStatus status) => status switch
    {
        RoomStatus.Available => "Trống",
        RoomStatus.Occupied => "Đang thuê",
        RoomStatus.Maintenance => "Bảo trì",
        RoomStatus.Reserved => "Đã đặt",
        _ => status.ToString()
    };

    public static string StatusText(BookingStatus status) => status switch
    {
        BookingStatus.Booked => "Đã đặt",
        BookingStatus.CheckedIn => "Đang ở",
        BookingStatus.CheckedOut => "Đã trả phòng",
        BookingStatus.Cancelled => "Đã huỷ",
        _ => status.ToString()
    };

    public static UserDto ToDto(User u) => new(
        u.Id, u.Username, u.FullName, u.Email, u.Phone,
        u.Role.ToString(), u.IsActive, u.CreatedAt, u.LastLoginAt);

    public static RoomTypeDto ToDto(RoomType t, int roomCount = 0) => new(
        t.Id, t.Name, t.PricePerNight, t.Capacity, t.Description, roomCount);

    public static RoomDto ToDto(Room r, Booking? currentBooking = null) => new(
        r.Id,
        r.RoomNumber,
        r.Floor,
        r.RoomTypeId,
        r.RoomType?.Name ?? "",
        r.RoomType?.PricePerNight ?? 0,
        r.Status.ToString(),
        StatusText(r.Status),
        r.Note,
        currentBooking?.Id,
        currentBooking?.Customer?.FullName);

    public static CustomerDto ToDto(Customer c, int bookingCount = 0) => new(
        c.Id, c.FullName, c.Phone, c.Email, c.IdCard, c.Address, c.CreatedAt, bookingCount);

    public static ServiceLineDto ToDto(BookingService s) => new(
        s.Id, s.Name, s.Price, s.Quantity, s.UsedAt);

    public static InvoiceDto ToDto(Invoice i) => new(
        i.Id,
        i.Code,
        i.BookingId,
        i.Booking?.Room?.RoomNumber ?? "",
        i.Booking?.Customer?.FullName ?? "",
        i.Booking?.Nights ?? 0,
        i.RoomAmount,
        i.ServiceAmount,
        i.Discount,
        i.TotalAmount,
        i.CreatedAt);

    public static BookingDto ToDto(Booking b)
    {
        var invoice = b.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault();
        var roomAmount = b.Status == BookingStatus.CheckedOut ? b.SubTotal : b.AccruedRoomAmount;
        return new BookingDto(
            b.Id,
            b.Code,
            b.RoomId,
            b.Room?.RoomNumber ?? "",
            b.Room?.RoomType?.Name ?? "",
            b.CustomerId,
            b.Customer?.FullName ?? "",
            b.Customer?.Phone ?? "",
            b.GuestCount,
            b.CheckInDate,
            b.ExpectedCheckOutDate,
            b.ActualCheckOutDate,
            b.PricePerNight,
            b.Nights,
            b.Status.ToString(),
            StatusText(b.Status),
            b.Note,
            roomAmount,
            b.ServiceTotal,
            invoice?.TotalAmount ?? roomAmount + b.ServiceTotal,
            b.Services.OrderBy(s => s.Id).Select(ToDto).ToList(),
            invoice is null ? null : ToDto(invoice));
    }
}