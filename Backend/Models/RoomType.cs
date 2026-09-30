namespace Backend.Models;

/// <summary>Thể loại phòng (Standard, Deluxe, Suite...).</summary>
public class RoomType
{
    public int Id { get; set; }

    public string Name { get; set; } = "";

    /// <summary>Giá thuê theo đêm (VND).</summary>
    public decimal PricePerNight { get; set; }

    /// <summary>Số người tối đa cho phép.</summary>
    public int Capacity { get; set; } = 2;

    public string? Description { get; set; }

    public List<Room> Rooms { get; set; } = new();
}