namespace Backend.Dtos;

// ============ AUTH ============
public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, DateTime ExpiresAt, UserDto User);

public record UserDto(
    int Id,
    string Username,
    string FullName,
    string? Email,
    string? Phone,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastLoginAt);

public record CreateUserRequest(
    string Username,
    string Password,
    string FullName,
    string? Email,
    string? Phone,
    string? Role);

public record UpdateProfileRequest(string FullName, string? Email, string? Phone);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// ============ ROOM TYPE ============
public record RoomTypeDto(int Id, string Name, decimal PricePerNight, int Capacity, string? Description, int RoomCount);

public record RoomTypeRequest(string Name, decimal PricePerNight, int Capacity, string? Description);

// ============ ROOM ============
public record RoomDto(
    int Id,
    string RoomNumber,
    int Floor,
    int RoomTypeId,
    string RoomTypeName,
    decimal PricePerNight,
    string Status,
    string StatusText,
    string? Note,
    int? CurrentBookingId,
    string? CurrentCustomerName);

public record RoomRequest(string RoomNumber, int Floor, int RoomTypeId, string? Status, string? Note);

// ============ CUSTOMER ============
public record CustomerDto(
    int Id,
    string FullName,
    string Phone,
    string? Email,
    string? IdCard,
    string? Address,
    DateTime CreatedAt,
    int BookingCount);

public record CustomerRequest(string FullName, string Phone, string? Email, string? IdCard, string? Address);

// ============ BOOKING / RENTAL ============
public record ServiceLineDto(int? Id, string Name, decimal Price, int Quantity, DateTime? UsedAt)
{
    public decimal Amount => Price * Quantity;
}

public record BookingDto(
    int Id,
    string Code,
    int RoomId,
    string RoomNumber,
    string RoomTypeName,
    int CustomerId,
    string CustomerName,
    string CustomerPhone,
    int GuestCount,
    DateTime CheckInDate,
    DateTime? ExpectedCheckOutDate,
    DateTime? ActualCheckOutDate,
    decimal PricePerNight,
    int Nights,
    string Status,
    string StatusText,
    string? Note,
    decimal RoomAmount,
    decimal ServiceAmount,
    decimal TotalAmount,
    List<ServiceLineDto> Services,
    InvoiceDto? Invoice);

public record RentalRequest(
    int RoomId,
    int? CustomerId,
    string CustomerName,
    string CustomerPhone,
    string? CustomerEmail,
    string? CustomerIdCard,
    string? CustomerAddress,
    int GuestCount,
    DateTime CheckInDate,
    DateTime? ExpectedCheckOutDate,
    string? Note);

public record AddServiceRequest(string Name, decimal Price, int Quantity);

public record CheckoutRequest(decimal Discount, string? Note);

public record InvoiceDto(
    int Id,
    string Code,
    int BookingId,
    string RoomNumber,
    string CustomerName,
    int Nights,
    decimal RoomAmount,
    decimal ServiceAmount,
    decimal Discount,
    decimal TotalAmount,
    DateTime CreatedAt);

// ============ STATISTICS ============
public record StatusCountDto(string Status, string Label, int Count);

public record DashboardDto(
    int TotalRooms,
    int AvailableRooms,
    int OccupiedRooms,
    int MaintenanceRooms,
    int ReservedRooms,
    int TotalCustomers,
    int ActiveBookings,
    decimal RevenueToday,
    decimal RevenueThisMonth,
    decimal RevenueTotal,
    List<RoomDto> Rooms,
    List<BookingDto> RecentBookings);

public record RevenuePointDto(string Period, decimal Revenue, int Invoices);

public record RevenueReportDto(
    DateTime From,
    DateTime To,
    decimal TotalRevenue,
    int TotalInvoices,
    decimal RoomRevenue,
    decimal ServiceRevenue,
    decimal AveragePerInvoice,
    List<RevenuePointDto> ByDay,
    List<RevenuePointDto> ByMonth,
    List<InvoiceDto> Invoices);