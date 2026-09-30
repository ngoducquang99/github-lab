import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatDate, formatMoney } from '../services/api'
import { EmptyState, ErrorBox, Loading, StatusBadge } from '../components/Feedback'

function Home() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.getDashboard())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Loading text="Đang tải sơ đồ phòng..." />

  if (error) return <ErrorBox message={error} onRetry={load} />

  if (!data) return null

  const floors = [...new Set(data.rooms.map((r) => r.floor))].sort((a, b) => a - b)
  const visibleRooms = (list) => (filter === 'all' ? list : list.filter((r) => r.status === filter))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sơ đồ phòng</h1>
          <p>Tình trạng toàn bộ {data.totalRooms} phòng của khách sạn</p>
        </div>
        <div className="page-actions">
          <Link to="/rent-room" className="btn">
            🔑 Cho thuê phòng
          </Link>
          <Link to="/checkout" className="btn btn-ghost">
            ↩️ Trả phòng
          </Link>
        </div>
      </div>

      {/* ===== THẺ SỐ LIỆU ===== */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon">🏨</div>
          <div>
            <p className="stat-label">Tổng số phòng</p>
            <p className="stat-value">{data.totalRooms}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">🟢</div>
          <div>
            <p className="stat-label">Phòng trống</p>
            <p className="stat-value">{data.availableRooms}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">🔴</div>
          <div>
            <p className="stat-label">Đang có khách</p>
            <p className="stat-value">{data.occupiedRooms}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">🟡</div>
          <div>
            <p className="stat-label">Phòng bảo trì</p>
            <p className="stat-value">{data.maintenanceRooms}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">👥</div>
          <div>
            <p className="stat-label">Khách hàng</p>
            <p className="stat-value">{data.totalCustomers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div>
            <p className="stat-label">Lượt thuê đang hoạt động</p>
            <p className="stat-value">{data.activeBookings}</p>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon teal">💵</div>
          <div>
            <p className="stat-label">Doanh thu hôm nay</p>
            <p className="stat-value">{formatMoney(data.revenueToday)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">📅</div>
          <div>
            <p className="stat-label">Doanh thu tháng này</p>
            <p className="stat-value">{formatMoney(data.revenueThisMonth)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">🏦</div>
          <div>
            <p className="stat-label">Tổng doanh thu</p>
            <p className="stat-value">{formatMoney(data.revenueTotal)}</p>
          </div>
        </div>
      </div>

      {/* ===== BỘ LỌC ===== */}
      <div className="card">
        <div className="card-title">
          <span>Sơ đồ phòng theo tầng</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="Available">Chỉ phòng trống</option>
            <option value="Occupied">Chỉ phòng đang thuê</option>
            <option value="Reserved">Chỉ phòng đã đặt</option>
            <option value="Maintenance">Chỉ phòng bảo trì</option>
          </select>
        </div>

        <div className="legend">
          <span>
            <i className="dot-available" /> Trống
          </span>
          <span>
            <i className="dot-occupied" /> Đang thuê
          </span>
          <span>
            <i className="dot-reserved" /> Đã đặt
          </span>
          <span>
            <i className="dot-maintenance" /> Bảo trì
          </span>
        </div>

        {floors.length === 0 && <EmptyState icon="🏨" title="Chưa có phòng nào" />}

        {floors.map((floor) => {
          const rooms = visibleRooms(data.rooms.filter((r) => r.floor === floor))
          if (rooms.length === 0) return null

          return (
            <div className="floor-block" key={floor}>
              <h3 className="floor-title">
                Tầng {floor} <span className="text-muted">({rooms.length} phòng)</span>
              </h3>

              <div className="room-grid">
                {rooms.map((room) => (
                  <button
                    type="button"
                    key={room.id}
                    className={`room-card status-${room.status.toLowerCase()}`}
                    onClick={() =>
                      room.status === 'Occupied' && room.currentBookingId
                        ? navigate(`/checkout?bookingId=${room.currentBookingId}`)
                        : navigate(`/rent-room?roomId=${room.id}`)
                    }
                    title={
                      room.status === 'Occupied'
                        ? `Khách: ${room.currentCustomerName || '—'} — bấm để trả phòng`
                        : 'Bấm để cho thuê phòng này'
                    }
                  >
                    <span className="room-number">{room.roomNumber}</span>
                    <span className="room-type">{room.roomTypeName}</span>
                    <span className="room-price">{formatMoney(room.pricePerNight)}/ngày</span>
                    <StatusBadge status={room.status} text={room.statusText} />
                    {room.status === 'Occupied' && (
                      <span className="room-guest">👤 {room.currentCustomerName || 'Khách'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ===== LƯỢT THUÊ GẦN ĐÂY ===== */}
      <div className="card">
        <div className="card-title">
          <span>Lượt thuê gần đây</span>
          <Link to="/bookings" className="btn btn-ghost btn-sm">
            Xem tất cả
          </Link>
        </div>

        {data.recentBookings.length === 0 ? (
          <EmptyState icon="📋" title="Chưa có lượt thuê nào" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Phòng</th>
                  <th>Khách hàng</th>
                  <th>Nhận phòng</th>
                  <th>Số ngày</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Tạm tính</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.code}</td>
                    <td>
                      <strong>{b.roomNumber}</strong>
                      <div className="text-muted">{b.roomTypeName}</div>
                    </td>
                    <td>
                      {b.customerName}
                      <div className="text-muted">{b.customerPhone}</div>
                    </td>
                    <td>{formatDate(b.checkInDate)}</td>
                    <td>{b.nights}</td>
                    <td>
                      <StatusBadge status={b.status} text={b.statusText} />
                    </td>
                    <td className="text-right money">
                      {formatMoney(b.roomAmount + b.serviceAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home