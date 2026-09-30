import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'

function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)

  function handleLogout() {
    logout()
    setConfirmLogout(false)
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">H</div>
        <div>
          <h2>HOTEL MANAGER</h2>
          <span>Quản lý khách sạn</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-title">QUẢN LÝ PHÒNG</div>

        <NavLink to="/" end className="menu-item">
          🏠 <span>Sơ đồ phòng</span>
        </NavLink>

        <NavLink to="/rooms" className="menu-item">
          🛏️ <span>Danh sách phòng</span>
        </NavLink>

        <NavLink to="/rooms/add" className="menu-item">
          ➕ <span>Thêm phòng</span>
        </NavLink>

        <div className="menu-title">DANH MỤC</div>

        <NavLink to="/room-types" className="menu-item">
          🏷️ <span>Thể loại phòng</span>
        </NavLink>

        <NavLink to="/customers" className="menu-item">
          👥 <span>Khách hàng</span>
        </NavLink>

        <div className="menu-title">THUÊ PHÒNG</div>

        <NavLink to="/rent-room" className="menu-item">
          🔑 <span>Cho thuê phòng</span>
        </NavLink>

        <NavLink to="/checkout" className="menu-item">
          ↩️ <span>Trả phòng</span>
        </NavLink>

        <NavLink to="/bookings" className="menu-item">
          📋 <span>Lịch sử thuê</span>
        </NavLink>

        <div className="menu-title">THỐNG KÊ</div>

        <NavLink to="/statistics" className="menu-item">
          📊 <span>Trạng thái phòng</span>
        </NavLink>

        <NavLink to="/income" className="menu-item">
          💰 <span>Thu nhập</span>
        </NavLink>

        <div className="menu-title">TÀI KHOẢN</div>

        <NavLink to="/profile" className="menu-item">
          👤 <span>Thông tin cá nhân</span>
        </NavLink>

        <NavLink to="/change-password" className="menu-item">
          🔒 <span>Đổi mật khẩu</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/users" className="menu-item">
            🧑‍💼 <span>Quản lý nhân viên</span>
          </NavLink>
        )}

        <button type="button" className="logout-menu" onClick={() => setConfirmLogout(true)}>
          🚪 <span>Đăng xuất</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        {user ? `Đăng nhập: ${user.username}` : 'Chưa đăng nhập'}
      </div>

      {confirmLogout && (
        <Modal
          title="Xác nhận đăng xuất"
          size="sm"
          onClose={() => setConfirmLogout(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmLogout(false)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          }
        >
          <p>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
        </Modal>
      )}
    </aside>
  )
}

export default Sidebar