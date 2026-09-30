namespace Backend.Models;

/// <summary>Dịch vụ phát sinh khi khách đang ở (giặt ủi, nước uống, ăn sáng...).</summary>
public class BookingService
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string Name { get; set; } = "";

    public decimal Price { get; set; }

    public int Quantity { get; set; } = 1;

    public DateTime UsedAt { get; set; } = DateTime.Now;
}