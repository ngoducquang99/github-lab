using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Endpoints;

public static class InvoiceEndpoints
{
    public static void MapInvoiceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/invoices").WithTags("Hoá đơn").RequireAuthorization();

        // GET /api/invoices
        group.MapGet("/", async (HotelDbContext db) =>
        {
            var invoices = await db.Invoices
                .Include(i => i.Booking).ThenInclude(b => b!.Room)
                .Include(i => i.Booking).ThenInclude(b => b!.Customer)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            return Results.Ok(invoices.Select(Mapper.ToDto));
        })
        .WithSummary("Danh sách hoá đơn");

        // GET /api/invoices/{id}
        group.MapGet("/{id:int}", async (int id, HotelDbContext db) =>
        {
            var invoice = await db.Invoices
                .Include(i => i.Booking).ThenInclude(b => b!.Room)
                .Include(i => i.Booking).ThenInclude(b => b!.Customer)
                .FirstOrDefaultAsync(i => i.Id == id);

            return invoice is null ? Results.NotFound() : Results.Ok(Mapper.ToDto(invoice));
        });
    }
}