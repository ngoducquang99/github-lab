# Hệ thống quản lý khách sạn (Hotel Management)

Website quản lý phòng cho thuê — **Fullstack**: Backend ASP.NET Core (.NET 10) + Frontend React 19 (Vite).

Sau khi chạy, mở trình duyệt tại: **http://localhost:5097**

---

## 1. Chạy nhanh (khuyến nghị)

Chỉ cần **.NET SDK 10** — không cần cài Node, không cần SQL Server.
Giao diện React đã được build sẵn trong thư mục `Backend/wwwroot`, backend phục vụ luôn cả API và giao diện.

```powershell
cd Backend
dotnet run --launch-profile http
```

Mở **http://localhost:5097**

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `admin123` | Quản trị viên (toàn quyền, quản lý nhân viên) |
| `letan` | `staff123` | Lễ tân |
| `ketoan` | `ketoan123` | Kế toán |

> Không có `dotnet` trong PATH? Dùng đường dẫn đầy đủ: `& "C:\Program Files\dotnet\dotnet.exe" run --launch-profile http`

---

## 2. Chạy trên máy khác

### Bước 1 — Cài .NET SDK 10 trên máy đó

Tải và cài: https://dotnet.microsoft.com/download/dotnet/10.0
(Chọn **SDK x64** cho Windows, không phải Runtime)

Kiểm tra sau khi cài (mở **PowerShell mới**):
```powershell
dotnet --version      # phải in ra 10.x.x
dotnet --list-sdks    # phải thấy dòng 10.0.401
```

> Nếu báo `dotnet is not recognized` → chưa cài, hoặc chưa mở PowerShell mới.

### Bước 2 — Copy mã nguồn sang

**Cách A — qua file ZIP (khuyến nghị):**
Copy file `ttcs-hotel-management.zip` sang máy kia, chuột phải → **Extract All**.

**Cách B — qua USB / mạng nội bộ:**
Copy nguyên thư mục dự án, nhưng **bỏ qua** 4 thư mục sau (nặng và tự sinh lại được):
`Frontend/node_modules`, `Frontend/dist`, `Backend/bin`, `Backend/obj`

> ⚠️ **Bắt buộc giữ** thư mục `Backend/wwwroot` — đây là giao diện đã build sẵn,
> thiếu nó thì mở trang sẽ trắng. Thư mục này chỉ ~200 KB.

**Cách C — qua Git (nếu đã đẩy lên GitHub):**
```powershell
git clone <đường-dẫn-repo>
cd ttcs-hotel-management
```
> Nếu dùng cách này, cần build lại giao diện vào `Backend/wwwroot` (xem mục 3),
> vì `.gitignore` đang bỏ qua thư mục đó.

### Bước 3 — Chạy

Mở PowerShell tại thư mục gốc dự án (nơi có file `README.md`):
```powershell
cd Backend
dotnet run --launch-profile http
```

> **Lần chạy đầu tiên sẽ mất 1–3 phút** vì .NET phải tải các gói NuGet về máy.
> Các lần sau chỉ mất vài giây.

Khi thấy dòng như sau là đã chạy được:
```
Now listening on: http://localhost:5097
Application started. Press Ctrl+C to shut down.
```

Mở trình duyệt: **http://localhost:5097** → đăng nhập `admin` / `admin123`

Dừng server: nhấn **Ctrl + C** trong PowerShell.

### Bước 4 — Kiểm tra nhanh (nếu trang không hiện)

Mở thêm PowerShell và chạy:
```powershell
Invoke-RestMethod http://localhost:5097/api/health
```
- In ra `status  ok` → backend tốt, lỗi nằm ở phía trình duyệt (thử Ctrl+F5 để xoá cache).
- Báo lỗi kết nối → backend chưa chạy, xem lại Bước 3.

### Lưu ý khi mang sang máy khác

| Điều cần biết | Chi tiết |
|---|---|
| **Máy khác vẫn là localhost** | Địa chỉ `localhost:5097` là của **chính máy đang chạy**. Muốn máy khác trong cùng mạng LAN vào được thì phải đổi cấu hình — xem mục 9 |
| **Không cần Node.js** | Chỉ cần nếu bạn muốn sửa giao diện, xem mục 3 |
| **Không cần SQL Server** | Mặc định dùng CSDL trong bộ nhớ |
| **Dữ liệu không giữ lại** | Tắt backend là dữ liệu về mặc định (InMemory) |
| **Cổng 5097 bị chiếm** | Sửa `Backend/Properties/launchSettings.json`, đổi `applicationUrl` thành cổng khác |

---

## 3. Chế độ phát triển (có hot-reload)

Cần **Node.js 20+**. Chạy **2 terminal**:

**Terminal 1 — Backend:**
```powershell
cd Backend
dotnet run --launch-profile http       # http://localhost:5097
```

**Terminal 2 — Frontend:**
```powershell
cd Frontend
npm install
npm run dev                            # http://localhost:5173
```

Mở **http://localhost:5173**. Frontend tự gọi API sang cổng 5097 (đã cấu hình CORS).

Các lệnh khác:
```powershell
npm run build    # build giao diện vào Frontend/dist
npm run lint     # kiểm tra code
```

Sau khi `npm run build`, copy giao diện vào backend để chạy chung một cổng:
```powershell
Remove-Item ..\Backend\wwwroot -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item dist\* ..\Backend\wwwroot -Recurse -Force
```

---

## 4. Chức năng

### Nghiệp vụ chính
- **Sơ đồ phòng** (trang chủ): tình trạng phòng theo tầng, thống kê nhanh, lượt thuê gần đây. Bấm vào phòng để thuê / trả phòng.
- **Quản lý phòng**: danh sách, tìm kiếm, lọc theo trạng thái & tầng, thêm / sửa / xoá phòng.
- **Thể loại phòng**: loại phòng và giá thuê theo ngày.
- **Khách hàng**: hồ sơ khách thuê, tự động tạo khi cho thuê phòng.
- **Cho thuê phòng**: chọn phòng trống, chọn khách cũ hoặc nhập khách mới, tính trước tiền phòng.
- **Trả phòng**: thêm dịch vụ phát sinh, áp giảm giá, lập hoá đơn, phòng về trạng thái trống.
- **Lịch sử thuê**: mọi lượt thuê, xem chi tiết, huỷ lượt thuê.
- **Trạng thái phòng**: tỷ lệ lấp phòng theo tầng, biểu đồ.
- **Thu nhập**: báo cáo doanh thu theo khoảng thời gian (tiền phòng / dịch vụ), biểu đồ ngày & tháng.
- **Tài khoản**: thông tin cá nhân, đổi mật khẩu.
- **Quản lý nhân viên** (chỉ Admin): tạo tài khoản, phân quyền, khoá/mở khoá, đặt lại mật khẩu.

### Tiện ích
- Đăng nhập JWT, phân quyền theo vai trò, tự đăng xuất khi hết phiên.
- Xuất CSV (mở bằng Excel, hiển thị đúng tiếng Việt) ở các trang danh sách.
- Định dạng tiền tệ VND, ngày tháng kiểu Việt Nam.

---

## 5. Cấu trúc dự án

```
ttcs-hotel-management/
├─ Backend/                     # ASP.NET Core Minimal API (.NET 10)
│  ├─ Program.cs                # Cấu hình DI, JWT, CORS, pipeline
│  ├─ Models/                   # Room, RoomType, Booking, Customer, Invoice, User...
│  ├─ Dtos/                     # Hợp đồng dữ liệu vào/ra API
│  ├─ Data/HotelDbContext.cs    # EF Core DbContext
│  ├─ Endpoints/                # Auth, Rooms, RoomTypes, Customers, Bookings,
│  │                            # Invoices, Statistics, Users
│  ├─ Services/                 # JWT, băm mật khẩu, dữ liệu mẫu, mapper
│  └─ wwwroot/                  # Giao diện đã build (được phục vụ tại /)
│
└─ Frontend/                    # React 19 + Vite
   └─ src/
      ├─ services/api.js        # Gọi API, quản lý token, format tiền/ngày
      ├─ context/AuthContext.jsx
      ├─ components/            # Sidebar, Header, Modal, Toast, ExportButton...
      ├─ layouts/MainLayout.jsx
      └─ pages/                 # 14 trang tương ứng menu
```

---

## 6. API

Xem danh sách API đầy đủ tại **http://localhost:5097/openapi/v1.json** (chỉ ở môi trường Development).

| Nhóm | Đường dẫn | Ghi chú |
|---|---|---|
| Xác thực | `/api/auth/login`, `/me`, `/profile`, `/change-password` | Trả về JWT |
| Phòng | `/api/rooms`, `/available` | CRUD, lọc `?status=&floor=&search=` |
| Thể loại phòng | `/api/room-types` | CRUD |
| Khách hàng | `/api/customers` | CRUD, tìm `?search=` |
| Thuê/Trả phòng | `/api/bookings`, `/active`, `/{id}/checkout`, `/services` | Nghiệp vụ chính |
| Hoá đơn | `/api/invoices` | Danh sách, chi tiết |
| Thống kê | `/api/statistics/dashboard`, `/status`, `/revenue` | |
| Người dùng | `/api/users` | Chỉ Admin |

Mọi API (trừ `/api`, `/api/health`, `/api/auth/login`) đều yêu cầu header:
`Authorization: Bearer <token>`

---

## 7. Cơ sở dữ liệu

Mặc định dùng **EF Core InMemory** — chạy được ngay, không cần cài đặt gì.
Dữ liệu mẫu được nạp tự động khi khởi động (24 phòng, 5 thể loại, 6 khách hàng, các lượt thuê và hoá đơn).

> ⚠️ Dữ liệu InMemory **mất khi tắt backend**. Đây là lựa chọn phù hợp cho demo và báo cáo.

### Chuyển sang SQL Server

1. Sửa `Backend/appsettings.json`:
   ```json
   "Database": { "Provider": "SqlServer" },
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=HotelManagementDb;Trusted_Connection=True;TrustServerCertificate=True"
   }
   ```
2. Tạo migration và cập nhật CSDL:
   ```powershell
   cd Backend
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

---

## 8. Công nghệ

**Backend:** .NET 10, ASP.NET Core Minimal API, Entity Framework Core 9, JWT Bearer, OpenAPI
**Frontend:** React 19, React Router 7, Vite 8, CSS thuần
**Bảo mật:** mật khẩu băm SHA-256 + salt ngẫu nhiên, không lưu mật khẩu thô

---

## 9. Cho máy khác trong cùng mạng LAN truy cập

Mặc định chỉ máy đang chạy mở được `http://localhost:5097`. Muốn máy khác (điện thoại, laptop
khác) trong cùng mạng WiFi vào được, làm 3 việc sau:

**1. Cho backend lắng nghe mọi địa chỉ mạng** — sửa `Backend/Properties/launchSettings.json`:
```json
"applicationUrl": "http://0.0.0.0:5097"
```

**2. Mở cổng trên Windows Firewall** (chạy PowerShell với quyền **Administrator**):
```powershell
New-NetFirewallRule -DisplayName "Hotel Manager 5097" -Direction Inbound -LocalPort 5097 -Protocol TCP -Action Allow
```

**3. Lấy IP máy chủ** để máy khác gõ vào:
```powershell
ipconfig | Select-String "IPv4"
```
Giả sử in ra `192.168.1.10`, máy khác mở: **http://192.168.1.10:5097**

> Nhớ chuột phải → Extract All, rồi **bỏ chặn** file ZIP (Properties → Unblock) nếu Windows cảnh báo.

---

## 10. Xử lý sự cố

| Vấn đề | Cách xử lý |
|---|---|
| `dotnet is not recognized` | Chưa cài .NET SDK 10, hoặc chưa mở PowerShell mới sau khi cài |
| Lần đầu chạy rất lâu | Đang tải gói NuGet về máy — chờ 1–3 phút, chỉ xảy ra lần đầu |
| Cổng 5097 đang bị chiếm | `Get-Process dotnet \| Stop-Process -Force` rồi chạy lại |
| Trang trắng, không hiện gì | Thiếu thư mục `Backend/wwwroot` — copy lại hoặc build lại giao diện (mục 3) |
| "Không kết nối được máy chủ" | Backend chưa chạy, hoặc sai cổng |
| Máy khác trong LAN không vào được | Xem mục 9 — cần đổi `applicationUrl` và mở firewall |
| Bị đăng xuất liên tục | Token hết hạn (mặc định 12 giờ) — đăng nhập lại |
| Muốn xoá dữ liệu test | Tắt và chạy lại backend (InMemory tự nạp lại dữ liệu mẫu) |
| Đã copy sang máy khác mà lỗi lạ | Xoá `Backend/bin`, `Backend/obj` rồi chạy lại (`dotnet run` sẽ tự tạo mới) |