using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class CustomerEndpoints
{
    public static void MapCustomerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/customers").WithTags("Khách hàng").RequireAuthorization();

        // GET /api/customers?search=
        group.MapGet("/", async (string? search, HotelDbContext db) =>
        {
            var query = db.Customers.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var key = search.Trim();
                query = query.Where(c =>
                    c.FullName.Contains(key) ||
                    c.Phone.Contains(key) ||
                    (c.IdCard != null && c.IdCard.Contains(key)));
            }

            var customers = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new { Customer = c, Count = c.Bookings.Count })
                .ToListAsync();

            return Results.Ok(customers.Select(x => Mapper.ToDto(x.Customer, x.Count)));
        })
        .WithSummary("Danh sách khách hàng");

        // GET /api/customers/{id}
        group.MapGet("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var customer = await db.Customers.Include(c => c.Bookings).FirstOrDefaultAsync(c => c.Id == id);
            return customer is null
                ? Results.NotFound()
                : Results.Ok(Mapper.ToDto(customer, customer.Bookings.Count));
        });

        // POST /api/customers
        group.MapPost("/", async (CustomerRequest req, HotelDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.Phone))
                return Results.BadRequest(new { message = "Họ tên và số điện thoại là bắt buộc." });

            var customer = new Customer
            {
                FullName = req.FullName.Trim(),
                Phone = req.Phone.Trim(),
                Email = req.Email?.Trim(),
                IdCard = req.IdCard?.Trim(),
                Address = req.Address?.Trim()
            };

            db.Customers.Add(customer);
            await db.SaveChangesAsync();
            return Results.Created($"/api/customers/{customer.Id}", Mapper.ToDto(customer));
        })
        .WithSummary("Thêm khách hàng");

        // PUT /api/customers/{id}
        group.MapPut("/{id:int}", async (int id, CustomerRequest req, HotelDbContext db) =>
        {
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.Phone))
                return Results.BadRequest(new { message = "Họ tên và số điện thoại là bắt buộc." });

            customer.FullName = req.FullName.Trim();
            customer.Phone = req.Phone.Trim();
            customer.Email = req.Email?.Trim();
            customer.IdCard = req.IdCard?.Trim();
            customer.Address = req.Address?.Trim();
            await db.SaveChangesAsync();

            return Results.Ok(Mapper.ToDto(customer));
        })
        .WithSummary("Cập nhật khách hàng");

        // DELETE /api/customers/{id}
        group.MapDelete("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();

            if (await db.Bookings.AnyAsync(b => b.CustomerId == id))
                return Results.BadRequest(new { message = "Khách hàng đã có lịch sử thuê, không thể xoá." });

            db.Customers.Remove(customer);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Đã xoá khách hàng." });
        })
        .WithSummary("Xoá khách hàng");
    }
}