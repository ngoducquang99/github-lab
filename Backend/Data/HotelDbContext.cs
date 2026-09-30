using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class HotelDbContext : DbContext
{
    public HotelDbContext(DbContextOptions<HotelDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingService> BookingServices => Set<BookingService>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
        modelBuilder.Entity<Room>().HasIndex(r => r.RoomNumber).IsUnique();

        modelBuilder.Entity<Room>()
            .HasOne(r => r.RoomType)
            .WithMany(t => t.Rooms)
            .HasForeignKey(r => r.RoomTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Room)
            .WithMany()
            .HasForeignKey(b => b.RoomId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Customer)
            .WithMany(c => c.Bookings)
            .HasForeignKey(b => b.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BookingService>()
            .HasOne(s => s.Booking)
            .WithMany(b => b.Services)
            .HasForeignKey(s => s.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Booking)
            .WithMany(b => b.Invoices)
            .HasForeignKey(i => i.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RoomType>().Property(t => t.PricePerNight).HasPrecision(18, 2);
        modelBuilder.Entity<Booking>().Property(b => b.PricePerNight).HasPrecision(18, 2);
        modelBuilder.Entity<BookingService>().Property(s => s.Price).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.RoomAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.ServiceAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.Discount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.TotalAmount).HasPrecision(18, 2);
    }
}