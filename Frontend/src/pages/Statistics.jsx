import { useCallback, useEffect, useState } from 'react'
import { api, formatMoney } from '../services/api'
import { EmptyState, ErrorBox, Loading, StatusBadge } from '../components/Feedback'
import ExportButton from '../components/ExportButton'

function Statistics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.getRoomStatus())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Loading text="Đang tổng hợp trạng thái phòng..." />
  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!data) return null

  const countsByStatus = Object.fromEntries(data.counts.map((c) => [c.status, c.count]))
  const maxFloorTotal = Math.max(...data.byFloor.map((f) => f.total), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trạng thái phòng</h1>
          <p>Thống kê công suất sử dụng phòng của khách sạn</p>
        </div>
        <div className="page-actions">
          <ExportButton
            filename="trang-thai-phong"
            headers={['Số phòng', 'Tầng', 'Thể loại', 'Trạng thái', 'Giá/ngày', 'Khách đang ở']}
            rows={data.rooms.map((r) => [
              r.roomNumber,
              r.floor,
              r.roomTypeName,
              r.statusText,
              r.pricePerNight,
              r.currentCustomerName || '',
            ])}
          />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon">🏨</div>
          <div>
            <p className="stat-label">Tổng số phòng</p>
            <p className="stat-value">{data.totalRooms}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon teal">📈</div>
          <div>
            <p className="stat-label">Tỷ lệ lấp phòng</p>
            <p className="stat-value">{data.occupancyRate}%</p>
            <div className="progress teal">
              <span style={{ width: `${data.occupancyRate}%` }} />
            </div>
          </div>
        </div>

        {data.counts.map((c) => (
          <div className="stat-card" key={c.status}>
            <div
              className={`stat-icon ${c.status === 'Available'
                  ? 'green'
                  : c.status === 'Occupied'
                    ? 'red'
                    : c.status === 'Maintenance'
                      ? 'amber'
                      : ''
                }`}
            >
              {c.status === 'Available'
                ? '🟢'
                : c.status === 'Occupied'
                  ? '🔴'
                  : c.status === 'Maintenance'
                    ? '🟡'
                    : '🔵'}
            </div>
            <div>
              <p className="stat-label">{c.label}</p>
              <p className="stat-value">{c.count}</p>
              <p className="stat-sub">
                {data.totalRooms ? Math.round((c.count * 100) / data.totalRooms) : 0}% tổng số phòng
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== BIỂU ĐỒ THEO TẦNG ===== */}
      <div className="card">
        <h2 className="card-title">Phân bố phòng theo tầng</h2>

        {data.byFloor.length === 0 ? (
          <EmptyState icon="📊" title="Chưa có dữ liệu tầng" />
        ) : (
          <>
            <div className="bar-chart">
              {data.byFloor.map((f) => (
                <div className="bar-item" key={f.floor}>
                  <span className="bar-value">
                    {f.occupied}/{f.total}
                  </span>
                  <div
                    className="bar"
                    style={{ height: `${Math.max(4, (f.total / maxFloorTotal) * 130)}px` }}
                    title={`Tầng ${f.floor}: ${f.occupied} đang thuê / ${f.total} phòng`}
                  />
                  <span className="bar-label">Tầng {f.floor}</span>
                </div>
              ))}
            </div>

            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tầng</th>
                    <th className="text-center">Tổng phòng</th>
                    <th className="text-center">Trống</th>
                    <th className="text-center">Đang thuê</th>
                    <th className="text-center">Đã đặt</th>
                    <th className="text-center">Bảo trì</th>
                    <th className="text-center">Tỷ lệ lấp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byFloor.map((f) => {
                    const rate = f.total ? Math.round((f.occupied * 100) / f.total) : 0
                    return (
                      <tr key={f.floor}>
                        <td>
                          <strong>Tầng {f.floor}</strong>
                        </td>
                        <td className="text-center">{f.total}</td>
                        <td className="text-center">{f.available}</td>
                        <td className="text-center">{f.occupied}</td>
                        <td className="text-center">{f.reserved}</td>
                        <td className="text-center">{f.maintenance}</td>
                        <td className="text-center">
                          {rate}%
                          <div className="progress">
                            <span style={{ width: `${rate}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ===== DANH SÁCH PHÒNG ĐANG THUÊ ===== */}
      <div className="card">
        <h2 className="card-title">
          Phòng đang có khách ({countsByStatus.Occupied || 0})
        </h2>

        {data.rooms.filter((r) => r.status === 'Occupied').length === 0 ? (
          <EmptyState icon="🛏️" title="Hiện không có phòng nào đang thuê" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Tầng</th>
                  <th>Thể loại</th>
                  <th>Khách đang ở</th>
                  <th className="text-right">Giá/ngày</th>
                  <th className="text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms
                  .filter((r) => r.status === 'Occupied')
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.roomNumber}</strong>
                      </td>
                      <td>{r.floor}</td>
                      <td>{r.roomTypeName}</td>
                      <td>{r.currentCustomerName || <span className="text-muted">—</span>}</td>
                      <td className="text-right money">{formatMoney(r.pricePerNight)}</td>
                      <td className="text-center">
                        <StatusBadge status={r.status} text={r.statusText} />
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

export default Statistics