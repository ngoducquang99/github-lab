namespace Backend.Models;

public enum UserRole
{
    /// <summary>Quản trị viên - toàn quyền.</summary>
    Admin = 0,

    /// <summary>Lễ tân - nghiệp vụ thuê/trả phòng.</summary>
    Receptionist = 1,

    /// <summary>Nhân viên kế toán - xem thu nhập.</summary>
    Accountant = 2
}

public class User
{
    public int Id { get; set; }

    public string Username { get; set; } = "";

    /// <summary>Mật khẩu đã băm (SHA-256 + salt).</summary>
    public string PasswordHash { get; set; } = "";

    public string PasswordSalt { get; set; } = "";

    public string FullName { get; set; } = "";

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public UserRole Role { get; set; } = UserRole.Receptionist;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public DateTime? LastLoginAt { get; set; }
}