namespace Backend.Models;

/// <summary>Khách hàng / khách thuê phòng lưu trú dài hạn.</summary>
public class Customer
{
    public int Id { get; set; }

    public string FullName { get; set; } = "";

    public string Phone { get; set; } = "";

    public string? Email { get; set; }

    /// <summary>Số CMND / CCCD / Hộ chiếu.</summary>
    public string? IdCard { get; set; }

    public string? Address { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public List<Booking> Bookings { get; set; } = new();
}