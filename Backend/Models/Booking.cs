namespace Backend.Models;

public enum BookingStatus
{
    /// <summary>Đã đặt, chưa nhận phòng.</summary>
    Booked = 0,

    /// <summary>Khách đang ở.</summary>
    CheckedIn = 1,

    /// <summary>Đã trả phòng.</summary>
    CheckedOut = 2,

    /// <summary>Đã huỷ.</summary>
    Cancelled = 3
}

/// <summary>Một lượt thuê phòng (booking) của khách.</summary>
public class Booking
{
    public int Id { get; set; }

    public string Code { get; set; } = "";

    public int RoomId { get; set; }
    public Room? Room { get; set; }

    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }

    /// <summary>Số người ở.</summary>
    public int GuestCount { get; set; } = 1;

    public DateTime CheckInDate { get; set; } = DateTime.Today;

    /// <summary>Ngày trả phòng dự kiến (ẩn với khách thuê theo ngày).</summary>
    public DateTime? ExpectedCheckOutDate { get; set; }

    public DateTime? ActualCheckOutDate { get; set; }

    public decimal PricePerNight { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Booked;

    public string? Note { get; set; }

    public List<BookingService> Services { get; set; } = new();

    public List<Invoice> Invoices { get; set; } = new();

    /// <summary>Số đêm lưu trú (đã chốt nếu đã trả phòng).</summary>
    public int Nights
    {
        get
        {
            var end = ActualCheckOutDate ?? ExpectedCheckOutDate ?? DateTime.Now;
            var nights = (end.Date - CheckInDate.Date).Days;
            return nights <= 0 ? 1 : nights;
        }
    }

    public decimal SubTotal => Nights * PricePerNight;

    public decimal ServiceTotal => Services.Sum(s => s.Price * s.Quantity);

    /// <summary>
    /// Tiền phòng tạm tính cho khách đang ở (tính theo số ngày thực tế đã lưu trú,
    /// khách ở ngày nào tính tiền ngày đó).
    /// </summary>
    public decimal AccruedRoomAmount
    {
        get
        {
            if (Status == BookingStatus.CheckedOut)
                return SubTotal;

            var days = (DateTime.Now.Date - CheckInDate.Date).Days + 1;
            if (days <= 0) days = 1;
            return days * PricePerNight;
        }
    }
}