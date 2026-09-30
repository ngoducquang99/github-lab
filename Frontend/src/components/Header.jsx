import { useLocation } from 'react-router-dom'
import { ROLE_LABEL, useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/': ['Sơ đồ phòng', 'Tình trạng phòng theo tầng'],
  '/rooms': ['Danh sách phòng', 'Toàn bộ phòng của khách sạn'],
  '/rooms/add': ['Thêm phòng', 'Khai báo phòng mới vào hệ thống'],
  '/room-types': ['Thể loại phòng', 'Quản lý loại phòng và giá thuê'],
  '/customers': ['Khách hàng', 'Thông tin khách thuê phòng'],
  '/rent-room': ['Cho thuê phòng', 'Lập phiếu thuê cho khách'],
  '/checkout': ['Trả phòng', 'Thanh toán và trả phòng cho khách'],
  '/bookings': ['Lịch sử thuê', 'Tất cả lượt thuê phòng'],
  '/statistics': ['Trạng thái phòng', 'Thống kê công suất sử dụng phòng'],
  '/income': ['Thu nhập', 'Báo cáo doanh thu theo thời gian'],
  '/profile': ['Thông tin cá nhân', 'Tài khoản đang đăng nhập'],
  '/change-password': ['Đổi mật khẩu', 'Bảo mật tài khoản'],
  '/users': ['Quản lý nhân viên', 'Tài khoản và phân quyền'],
}

function Header() {
  const { user } = useAuth()
  const location = useLocation()

  const [title, subtitle] = PAGE_TITLES[location.pathname] || [
    'Hệ thống quản lý khách sạn',
    'Quản lý phòng cho thuê',
  ]

  const initial = (user?.fullName || user?.username || 'A').charAt(0).toUpperCase()

  return (
    <header className="topbar">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      <div className="user-box">
        <div className="avatar">{initial}</div>
        <div>
          <strong>{user?.fullName || 'Khách'}</strong>
          <span>{ROLE_LABEL[user?.role] || 'Người dùng'}</span>
        </div>
      </div>
    </header>
  )
}

export default Header