namespace Backend.Models;

public enum RoomStatus
{
    /// <summary>Phòng trống, sẵn sàng cho thuê.</summary>
    Available = 0,

    /// <summary>Đang có khách thuê.</summary>
    Occupied = 1,

    /// <summary>Phòng đang sửa chữa / không dùng.</summary>
    Maintenance = 2,

    /// <summary>Đã đặt trước, chờ khách nhận phòng.</summary>
    Reserved = 3
}

public class Room
{
    public int Id { get; set; }

    /// <summary>Số phòng hiển thị, ví dụ "101", "A203".</summary>
    public string RoomNumber { get; set; } = "";

    /// <summary>Tầng.</summary>
    public int Floor { get; set; } = 1;

    public int RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public RoomStatus Status { get; set; } = RoomStatus.Available;

    public string? Note { get; set; }
}