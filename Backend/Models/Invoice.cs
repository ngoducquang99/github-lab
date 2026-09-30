namespace Backend.Models;

/// <summary>Hoá đơn thanh toán khi trả phòng.</summary>
public class Invoice
{
    public int Id { get; set; }

    public string Code { get; set; } = "";

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public decimal RoomAmount { get; set; }

    public decimal ServiceAmount { get; set; }

    /// <summary>Giảm giá (VND).</summary>
    public decimal Discount { get; set; }

    public decimal TotalAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    /// <summary>Nhân viên lập hoá đơn.</summary>
    public string CreatedBy { get; set; } = "system";
}