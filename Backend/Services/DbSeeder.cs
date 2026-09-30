using Backend.Data;
using Backend.Models;

namespace Backend.Services;

/// <summary>Nạp dữ liệu mẫu để website chạy được ngay sau khi khởi động.</summary>
public static class DbSeeder
{
    public static void Seed(HotelDbContext db)
    {
        if (db.Users.Any()) return; // đã có dữ liệu thì bỏ qua

        // ===== TÀI KHOẢN =====
        var (adminHash, adminSalt) = PasswordHasher.Hash("admin123");
        var (staffHash, staffSalt) = PasswordHasher.Hash("staff123");
        var (accHash, accSalt) = PasswordHasher.Hash("ketoan123");

        db.Users.AddRange(
            new User
            {
                Username = "admin",
                FullName = "Quản trị viên",
                Email = "admin@hotel.local",
                Phone = "0900000001",
                Role = UserRole.Admin,
                PasswordHash = adminHash,
                PasswordSalt = adminSalt
            },
            new User
            {
                Username = "letan",
                FullName = "Nguyễn Thị Lễ Tân",
                Email = "letan@hotel.local",
                Phone = "0900000002",
                Role = UserRole.Receptionist,
                PasswordHash = staffHash,
                PasswordSalt = staffSalt
            },
            new User
            {
                Username = "ketoan",
                FullName = "Trần Văn Kế Toán",
                Email = "ketoan@hotel.local",
                Phone = "0900000003",
                Role = UserRole.Accountant,
                PasswordHash = accHash,
                PasswordSalt = accSalt
            });

        // ===== THỂ LOẠI PHÒNG =====
        var standard = new RoomType { Name = "Standard", PricePerNight = 350_000, Capacity = 2, Description = "Phòng tiêu chuẩn, 1 giường đôi, có điều hoà." };
        var superior = new RoomType { Name = "Superior", PricePerNight = 500_000, Capacity = 2, Description = "Phòng cao cấp hơn, view thành phố." };
        var deluxe = new RoomType { Name = "Deluxe", PricePerNight = 750_000, Capacity = 3, Description = "Phòng rộng, có ban công, minibar." };
        var suite = new RoomType { Name = "Suite", PricePerNight = 1_200_000, Capacity = 4, Description = "Phòng hạng sang, có phòng khách riêng." };
        var dorm = new RoomType { Name = "Dorm", PricePerNight = 150_000, Capacity = 1, Description = "Giường trong phòng tập thể, phù hợp khách thuê dài hạn." };

        db.RoomTypes.AddRange(standard, superior, deluxe, suite, dorm);
        db.SaveChanges();

        // ===== PHÒNG =====
        var rooms = new List<Room>();
        for (var floor = 1; floor <= 4; floor++)
        {
            for (var i = 1; i <= 6; i++)
            {
                var type = (floor, i) switch
                {
                    (1, _) => standard,
                    (2, _) => superior,
                    (3, _) => deluxe,
                    _ => i <= 4 ? suite : dorm
                };

                rooms.Add(new Room
                {
                    RoomNumber = $"{floor}{i:00}",
                    Floor = floor,
                    RoomType = type,
                    Status = RoomStatus.Available
                });
            }
        }

        // vài phòng bảo trì
        rooms.First(r => r.RoomNumber == "406").Status = RoomStatus.Maintenance;
        rooms.First(r => r.RoomNumber == "206").Status = RoomStatus.Maintenance;

        db.Rooms.AddRange(rooms);
        db.SaveChanges();

        // ===== KHÁCH HÀNG =====
        var customers = new List<Customer>
        {
            new() { FullName = "Nguyễn Văn An", Phone = "0912345678", Email = "an.nguyen@example.com", IdCard = "012345678901", Address = "Hà Nội" },
            new() { FullName = "Trần Thị Bình", Phone = "0923456789", Email = "binh.tran@example.com", IdCard = "012345678902", Address = "Đà Nẵng" },
            new() { FullName = "Lê Minh Cường", Phone = "0934567890", Email = "cuong.le@example.com", IdCard = "012345678903", Address = "TP. Hồ Chí Minh" },
            new() { FullName = "Phạm Thu Dung", Phone = "0945678901", Email = "dung.pham@example.com", IdCard = "012345678904", Address = "Huế" },
            new() { FullName = "Hoàng Quốc Đạt", Phone = "0956789012", Email = "dat.hoang@example.com", IdCard = "012345678905", Address = "Cần Thơ" },
            new() { FullName = "Đỗ Khánh Linh", Phone = "0967890123", Email = "linh.do@example.com", IdCard = "012345678906", Address = "Hải Phòng" }
        };
        db.Customers.AddRange(customers);
        db.SaveChanges();

        // ===== LƯỢT THUÊ ĐANG HOẠT ĐỘNG =====
        var activeBookings = new[]
        {
            (Room: "101", Customer: 0, Nights: 3, Guests: 2),
            (Room: "203", Customer: 1, Nights: 5, Guests: 2),
            (Room: "302", Customer: 2, Nights: 2, Guests: 3),
            (Room: "401", Customer: 3, Nights: 7, Guests: 4)
        };

        var code = 1000;
        foreach (var (roomNumber, customerIndex, nights, guests) in activeBookings)
        {
            var room = rooms.First(r => r.RoomNumber == roomNumber);
            room.Status = RoomStatus.Occupied;
            var checkIn = DateTime.Today.AddDays(-Math.Max(1, nights - 2));

            var booking = new Booking
            {
                Code = $"BK{++code}",
                RoomId = room.Id,
                CustomerId = customers[customerIndex].Id,
                GuestCount = guests,
                CheckInDate = checkIn,
                ExpectedCheckOutDate = checkIn.AddDays(nights),
                PricePerNight = room.RoomType!.PricePerNight,
                Status = BookingStatus.CheckedIn,
                Note = "Khách đang lưu trú"
            };

            if (roomNumber == "101")
            {
                booking.Services.Add(new BookingService { Name = "Giặt ủi", Price = 60_000, Quantity = 2 });
                booking.Services.Add(new BookingService { Name = "Nước suối", Price = 15_000, Quantity = 4 });
            }

            db.Bookings.Add(booking);
        }

        // ===== LƯỢT THUÊ ĐÃ TRẢ PHÒNG (để có dữ liệu thu nhập) =====
        var history = new[]
        {
            (Room: "102", Customer: 4, Nights: 2, DaysAgo: 20),
            (Room: "103", Customer: 5, Nights: 1, DaysAgo: 15),
            (Room: "201", Customer: 0, Nights: 4, DaysAgo: 12),
            (Room: "204", Customer: 1, Nights: 3, DaysAgo: 8),
            (Room: "303", Customer: 2, Nights: 2, DaysAgo: 5),
            (Room: "402", Customer: 3, Nights: 6, DaysAgo: 3),
            (Room: "104", Customer: 4, Nights: 1, DaysAgo: 1)
        };

        foreach (var (roomNumber, customerIndex, nights, daysAgo) in history)
        {
            var room = rooms.First(r => r.RoomNumber == roomNumber);
            var checkOut = DateTime.Today.AddDays(-daysAgo);
            var checkIn = checkOut.AddDays(-nights);
            var price = room.RoomType!.PricePerNight;

            var booking = new Booking
            {
                Code = $"BK{++code}",
                RoomId = room.Id,
                CustomerId = customers[customerIndex].Id,
                GuestCount = 2,
                CheckInDate = checkIn,
                ExpectedCheckOutDate = checkOut,
                ActualCheckOutDate = checkOut,
                PricePerNight = price,
                Status = BookingStatus.CheckedOut,
                Note = "Đã thanh toán"
            };

            booking.Services.Add(new BookingService { Name = "Ăn sáng", Price = 50_000, Quantity = nights * 2, UsedAt = checkOut });

            var roomAmount = price * nights;
            var serviceAmount = booking.Services.Sum(s => s.Price * s.Quantity);

            db.Bookings.Add(booking);
            db.Invoices.Add(new Invoice
            {
                Code = $"HD{code}",
                Booking = booking,
                RoomAmount = roomAmount,
                ServiceAmount = serviceAmount,
                Discount = 0,
                TotalAmount = roomAmount + serviceAmount,
                CreatedAt = checkOut,
                CreatedBy = "admin"
            });
        }

        db.SaveChanges();
    }
}