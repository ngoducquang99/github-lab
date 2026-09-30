import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatDate, formatMoney } from '../services/api'
import { EmptyState, ErrorBox, Loading, StatusBadge } from '../components/Feedback'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ExportButton from '../components/ExportButton'

function BookingHistory() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBookings(await api.getBookings())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false
      if (!key) return true
      return (
        b.code.toLowerCase().includes(key) ||
        b.roomNumber.toLowerCase().includes(key) ||
        b.customerName.toLowerCase().includes(key) ||
        b.customerPhone.includes(key)
      )
    })
  }, [bookings, statusFilter, search])

  const summary = useMemo(() => {
    const total = filtered.reduce((sum, b) => sum + Number(b.roomAmount) + Number(b.serviceAmount), 0)
    return { count: filtered.length, total }
  }, [filtered])

  async function handleCancel() {
    setSaving(true)
    try {
      await api.cancelBooking(cancelling.id)
      setToast({ type: 'success', message: `Đã huỷ phiếu thuê ${cancelling.code}.` })
      setCancelling(null)
      await load()
    } catch (err) {
      setToast({ type: 'error', message: err.message })
      setCancelling(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải lịch sử thuê phòng..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lịch sử thuê phòng</h1>
          <p>
            {summary.count} phiếu thuê · tổng giá trị {formatMoney(summary.total)}
          </p>
        </div>
        <div className="page-actions">
          <ExportButton
            filename="lich-su-thue-phong"
            headers={['Mã', 'Phòng', 'Khách hàng', 'SĐT', 'Nhận phòng', 'Trả phòng', 'Số ngày', 'Trạng thái', 'Tiền phòng', 'Tiền dịch vụ', 'Tổng']}
            rows={filtered.map((b) => [
              b.code,
              b.roomNumber,
              b.customerName,
              b.customerPhone,
              formatDate(b.checkInDate),
              formatDate(b.actualCheckOutDate),
              b.nights,
              b.statusText,
              b.roomAmount,
              b.serviceAmount,
              Number(b.roomAmount) + Number(b.serviceAmount),
            ])}
          />
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Tìm theo mã, phòng, tên khách hoặc SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="CheckedIn">Đang ở</option>
          <option value="CheckedOut">Đã trả phòng</option>
          <option value="Booked">Đã đặt</option>
          <option value="Cancelled">Đã huỷ</option>
        </select>

        {(search || statusFilter) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearch('')
              setStatusFilter('')
            }}
          >
            ✕ Xoá lọc
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="Không có phiếu thuê nào" description="Thử đổi điều kiện lọc." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Phòng</th>
                <th>Khách hàng</th>
                <th>Nhận phòng</th>
                <th>Trả phòng</th>
                <th className="text-center">Số ngày</th>
                <th>Trạng thái</th>
                <th className="text-right">Tổng tiền</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.code}</strong>
                  </td>
                  <td>
                    {b.roomNumber}
                    <div className="text-muted">{b.roomTypeName}</div>
                  </td>
                  <td>
                    {b.customerName}
                    <div className="text-muted">{b.customerPhone}</div>
                  </td>
                  <td>{formatDate(b.checkInDate)}</td>
                  <td>{formatDate(b.actualCheckOutDate || b.expectedCheckOutDate)}</td>
                  <td className="text-center">{b.nights}</td>
                  <td>
                    <StatusBadge status={b.status} text={b.statusText} />
                  </td>
                  <td className="text-right money">
                    {formatMoney(Number(b.roomAmount) + Number(b.serviceAmount))}
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title="Xem chi tiết"
                      onClick={() => setDetail(b)}
                    >
                      👁️
                    </button>
                    {b.status !== 'CheckedOut' && (
                      <button
                        type="button"
                        className="btn-icon danger"
                        title="Huỷ phiếu thuê"
                        onClick={() => setCancelling(b)}
                      >
                        🚫
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== CHI TIẾT ===== */}
      {detail && (
        <Modal
          title={`Chi tiết phiếu thuê ${detail.code}`}
          size="lg"
          onClose={() => setDetail(null)}
          footer={
            <button type="button" className="btn" onClick={() => setDetail(null)}>
              Đóng
            </button>
          }
        >
          <div className="detail-grid">
            <div className="detail-item">
              <div className="label">Phòng</div>
              <div className="value">
                {detail.roomNumber} — {detail.roomTypeName}
              </div>
            </div>
            <div className="detail-item">
              <div className="label">Khách hàng</div>
              <div className="value">{detail.customerName}</div>
            </div>
            <div className="detail-item">
              <div className="label">Số điện thoại</div>
              <div className="value">{detail.customerPhone}</div>
            </div>
            <div className="detail-item">
              <div className="label">Số người</div>
              <div className="value">{detail.guestCount}</div>
            </div>
            <div className="detail-item">
              <div className="label">Nhận phòng</div>
              <div className="value">{formatDate(detail.checkInDate)}</div>
            </div>
            <div className="detail-item">
              <div className="label">Trả phòng</div>
              <div className="value">{formatDate(detail.actualCheckOutDate || detail.expectedCheckOutDate)}</div>
            </div>
            <div className="detail-item">
              <div className="label">Trạng thái</div>
              <div className="value">
                <StatusBadge status={detail.status} text={detail.statusText} />
              </div>
            </div>
            <div className="detail-item">
              <div className="label">Số ngày</div>
              <div className="value">{detail.nights}</div>
            </div>
          </div>

          {detail.note && <p className="text-muted">Ghi chú: {detail.note}</p>}

          <h3 className="card-title">Dịch vụ đã dùng</h3>
          {detail.services.length === 0 ? (
            <p className="text-muted">Không có dịch vụ phát sinh.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table" style={{ minWidth: 380 }}>
                <thead>
                  <tr>
                    <th>Dịch vụ</th>
                    <th className="text-right">Đơn giá</th>
                    <th className="text-center">SL</th>
                    <th className="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.services.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td className="text-right">{formatMoney(s.price)}</td>
                      <td className="text-center">{s.quantity}</td>
                      <td className="text-right money">{formatMoney(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="summary-box">
            <div className="summary-row">
              <span>Tiền phòng</span>
              <strong>{formatMoney(detail.roomAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Tiền dịch vụ</span>
              <strong>{formatMoney(detail.serviceAmount)}</strong>
            </div>
            {detail.invoice && (
              <>
                <div className="summary-row">
                  <span>Giảm giá</span>
                  <strong>-{formatMoney(detail.invoice.discount)}</strong>
                </div>
                <div className="summary-row">
                  <span>Mã hoá đơn</span>
                  <strong>{detail.invoice.code}</strong>
                </div>
              </>
            )}
            <div className="summary-row grand">
              <span>{detail.invoice ? 'Đã thanh toán' : 'Tạm tính'}</span>
              <span>
                {formatMoney(
                  detail.invoice
                    ? detail.invoice.totalAmount
                    : Number(detail.roomAmount) + Number(detail.serviceAmount)
                )}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== HUỶ PHIẾU ===== */}
      {cancelling && (
        <Modal
          title="Xác nhận huỷ phiếu thuê"
          size="sm"
          onClose={() => setCancelling(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setCancelling(null)}>
                Không huỷ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={saving}>
                {saving ? 'Đang xử lý...' : 'Huỷ phiếu thuê'}
              </button>
            </>
          }
        >
          <p>
            Bạn có chắc muốn huỷ phiếu thuê <strong>{cancelling.code}</strong> của khách{' '}
            <strong>{cancelling.customerName}</strong>?
          </p>
          {cancelling.status === 'CheckedIn' && (
            <p className="text-muted">Phòng {cancelling.roomNumber} sẽ được trả về trạng thái Trống.</p>
          )}
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default BookingHistory