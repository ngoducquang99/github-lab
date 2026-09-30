using System.Text.Json.Serialization;
using Backend.Data;
using Backend.Endpoints;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ===================== CORS cho frontend Vite (http://localhost:5173) =====================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ===================== CƠ SỞ DỮ LIỆU =====================
// Mặc định dùng EF Core InMemory để chạy được ngay không cần SQL Server.
// Muốn dùng SQL Server thật: đổi "Provider" thành "SqlServer" trong appsettings.json
var databaseProvider = builder.Configuration.GetValue<string>("Database:Provider") ?? "InMemory";
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<HotelDbContext>(options =>
{
    if (string.Equals(databaseProvider, "SqlServer", StringComparison.OrdinalIgnoreCase)
        && !string.IsNullOrWhiteSpace(connectionString))
    {
        options.UseSqlServer(connectionString);
    }
    else
    {
        options.UseInMemoryDatabase("HotelManagementDb");
    }
});

// ===================== JWT =====================
var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddSingleton(jwtOptions);

var jwtService = new JwtService(jwtOptions);
builder.Services.AddSingleton(jwtService);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = jwtService.ValidationParameters;
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Cho phép truyền token qua query string khi cần (ví dụ tải file)
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/api"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ===================== OPENAPI =====================
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

// ===================== TẠO DB + NẠP DỮ LIỆU MẪU =====================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HotelDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }

    DbSeeder.Seed(db);
}

// ===================== PIPELINE =====================
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// ===================== API GỐC =====================
app.MapGet("/api", () => Results.Ok(new
{
    name = "Hotel Management API",
    version = "1.0.0",
    time = DateTime.Now,
    docs = "/openapi/v1.json"
}))
.AllowAnonymous()
.WithTags("Hệ thống");

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.Now }))
   .AllowAnonymous()
   .WithTags("Hệ thống");

// ===================== CÁC NHÓM API =====================
app.MapAuthEndpoints();
app.MapRoomEndpoints();
app.MapRoomTypeEndpoints();
app.MapCustomerEndpoints();
app.MapBookingEndpoints();
app.MapInvoiceEndpoints();
app.MapStatisticsEndpoints();
app.MapUserEndpoints();

// ===================== FALLBACK CHO SPA =====================
// Mọi đường dẫn không phải API đều trả index.html (phục vụ giao diện đã build trong wwwroot).
// Riêng các đường dẫn /api/* không có endpoint thì trả 404 JSON thay vì trả index.html.
app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsJsonAsync(new
        {
            message = $"Không tìm thấy API: {context.Request.Method} {context.Request.Path}"
        });
        return;
    }

    var indexPath = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html");
    if (File.Exists(indexPath))
    {
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.SendFileAsync(indexPath);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsync("Không tìm thấy trang. Hãy build giao diện vào thư mục Backend/wwwroot.");
    }
});

app.Run();
