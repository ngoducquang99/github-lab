import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatDate, formatMoney } from '../services/api'
import { EmptyState, ErrorBox, Loading, StatusBadge } from '../components/Feedback'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const SERVICE_PRESETS = [
  { name: 'Ăn sáng', price: 50000 },
  { name: 'Giặt ủi', price: 60000 },
  { name: 'Nước suối', price: 15000 },
  { name: 'Đồ uống minibar', price: 25000 },
  { name: 'Thuê xe máy', price: 150000 },
]

function Checkout() {
  const [searchParams] = useSearchParams()
  const presetBookingId = searchParams.get('bookingId')

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [checkoutNote, setCheckoutNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [serviceForm, setServiceForm] = useState({ name: '', price: '', quantity: 1 })
  const [serviceError, setServiceError] = useState('')

  const [confirmCheckout, setConfirmCheckout] = useState(false)
  const [invoice, setInvoice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getActiveBookings()
      setBookings(data)

      if (data.length === 0) {
        setSelectedId(null)
      } else if (presetBookingId && data.some((b) => String(b.id) === String(presetBookingId))) {
        setSelectedId(Number(presetBookingId))
      } else {
        setSelectedId((prev) => (data.some((b) => b.id === prev) ? prev : data[0].id))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [presetBookingId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedId) || null,
    [bookings, selectedId]
  )

  const totals = useMemo(() => {
    if (!selected) return { room: 0, service: 0, discount: 0, total: 0 }
    const room = Number(selected.roomAmount)
    const service = Number(selected.serviceAmount)
    const disc = Math.max(0, Number(discount) || 0)
    return { room, service, discount: disc, total: Math.max(0, room + service - disc) }
  }, [selected, discount])

  async function handleAddService(event) {
    event.preventDefault()
    setServiceError('')

    if (!selected) return
    if (!serviceForm.name.trim()) {
      setServiceError('Vui lòng nhập tên dịch vụ.')
      return
    }
    if (Number(serviceForm.price) < 0 || !serviceForm.price) {
      setServiceError('Đơn giá không hợp lệ.')
      return
    }
    if (Number(serviceForm.quantity) <= 0) {
      setServiceError('Số lượng phải lớn hơn 0.')
      return
    }

    setSaving(true)
    try {
      await api.addService(selected.id, {
        name: serviceForm.name.trim(),
        price: Number(serviceForm.price),
        quantity: Number(serviceForm.quantity),
      })
      setServiceForm({ name: '', price: '', quantity: 1 })
      setToast({ type: 'success', message: 'Đã thêm dịch vụ phát sinh.' })
      await load()
    } catch (err) {
      setServiceError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveService(serviceId) {
    setSaving(true)
    try {
      await api.removeService(serviceId)
      setToast({ type: 'success', message: 'Đã xoá dịch vụ.' })
      await load()
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleCheckout() {
    if (!selected) return

    setSaving(true)
    try {
      const result = await api.checkout(selected.id, {
        discount: Number(discount) || 0,
        note: checkoutNote.trim() || null,
      })
      setInvoice(result.invoice || null)
      setConfirmCheckout(false)
      setDiscount(0)
      setCheckoutNote('')
      setToast({ type: 'success', message: `Đã trả phòng ${result.roomNumber} và lập hoá đơn.` })
      await load()
    } catch (err) {
      setToast({ type: 'error', message: err.message })
      setConfirmCheckout(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải danh sách khách đang ở..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trả phòng</h1>
          <p>Thanh toán, thêm dịch vụ phát sinh và trả phòng cho khách</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon="🛏️"
          title="Hiện không có khách nào đang lưu trú"
          description="Khi bạn cho thuê phòng, khách sẽ xuất hiện ở đây để trả phòng."
        />
      ) : (
        <div className="grid-2">
          {/* ===== DANH SÁCH KHÁCH ĐANG Ở ===== */}
          <div className="card">
            <h2 className="card-title">Khách đang lưu trú ({bookings.length})</h2>

            <div className="table-wrap">
              <table className="data-table" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th>Phòng</th>
                    <th>Khách hàng</th>
                    <th>Nhận phòng</th>
                    <th className="text-right">Tạm tính</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{
                        cursor: 'pointer',
                        background: b.id === selectedId ? '#eff6ff' : undefined,
                      }}
                    >
                      <td>
                        <strong>{b.roomNumber}</strong>
                        <div className="text-muted">{b.roomTypeName}</div>
                      </td>
                      <td>
                        {b.customerName}
                        <div className="text-muted">{b.customerPhone}</div>
                      </td>
                      <td>
                        {formatDate(b.checkInDate)}
                        <div className="text-muted">{b.nights} ngày</div>
                      </td>
                      <td className="text-right money">
                        {formatMoney(b.roomAmount + b.serviceAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== CHI TIẾT THANH TOÁN ===== */}
          {selected && (
            <div className="card">
              <h2 className="card-title">
                <span>
                  Phiếu thuê {selected.code} — phòng {selected.roomNumber}
                </span>
                <StatusBadge status={selected.status} text={selected.statusText} />
              </h2>

              <div className="detail-grid">
                <div className="detail-item">
                  <div className="label">Khách hàng</div>
                  <div className="value">{selected.customerName}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Số điện thoại</div>
                  <div className="value">{selected.customerPhone}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Ngày nhận phòng</div>
                  <div className="value">{formatDate(selected.checkInDate)}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Số ngày đã ở</div>
                  <div className="value">{selected.nights} ngày</div>
                </div>
                <div className="detail-item">
                  <div className="label">Giá thuê</div>
                  <div className="value">{formatMoney(selected.pricePerNight)}/ngày</div>
                </div>
                <div className="detail-item">
                  <div className="label">Tiền phòng</div>
                  <div className="value">{formatMoney(selected.roomAmount)}</div>
                </div>
              </div>

              {/* ===== DỊCH VỤ PHÁT SINH ===== */}
              <h3 className="card-title" style={{ marginTop: 8 }}>
                Dịch vụ phát sinh
              </h3>

              {selected.services.length === 0 ? (
                <p className="text-muted">Chưa có dịch vụ nào.</p>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 14 }}>
                  <table className="data-table" style={{ minWidth: 360 }}>
                    <thead>
                      <tr>
                        <th>Dịch vụ</th>
                        <th className="text-right">Đơn giá</th>
                        <th className="text-center">SL</th>
                        <th className="text-right">Thành tiền</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {selected.services.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td className="text-right">{formatMoney(s.price)}</td>
                          <td className="text-center">{s.quantity}</td>
                          <td className="text-right money">{formatMoney(s.amount)}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="btn-icon danger"
                              title="Xoá dịch vụ"
                              onClick={() => handleRemoveService(s.id)}
                              disabled={saving}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {serviceError && <div className="alert alert-error">{serviceError}</div>}

              <form onSubmit={handleAddService}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Dịch vụ</label>
                    <input
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Tên dịch vụ"
                      list="service-presets"
                    />
                    <datalist id="service-presets">
                      {SERVICE_PRESETS.map((s) => (
                        <option key={s.name} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="form-group">
                    <label>Đơn giá</label>
                    <input
                      type="number"
                      min="0"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      value={serviceForm.quantity}
                      onChange={(e) => setServiceForm((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label>&nbsp;</label>
                    <button type="submit" className="btn btn-ghost" disabled={saving}>
                      ➕ Thêm dịch vụ
                    </button>
                  </div>
                </div>

                <div className="page-actions" style={{ marginTop: 10 }}>
                  {SERVICE_PRESETS.map((s) => (
                    <button
                      type="button"
                      key={s.name}
                      className="btn btn-ghost btn-sm"
                      onClick={() => setServiceForm({ name: s.name, price: String(s.price), quantity: 1 })}
                    >
                      {s.name} · {formatMoney(s.price)}
                    </button>
                  ))}
                </div>
              </form>

              {/* ===== TỔNG KẾT ===== */}
              <div className="summary-box">
                <div className="summary-row">
                  <span>Tiền phòng ({selected.nights} ngày)</span>
                  <strong>{formatMoney(totals.room)}</strong>
                </div>
                <div className="summary-row">
                  <span>Tiền dịch vụ</span>
                  <strong>{formatMoney(totals.service)}</strong>
                </div>

                <div className="summary-row">
                  <span>Giảm giá</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    style={{ maxWidth: 160, textAlign: 'right' }}
                  />
                </div>

                <div className="summary-row grand">
                  <span>Khách phải trả</span>
                  <span>{formatMoney(totals.total)}</span>
                </div>
              </div>

              <div className="form-group full" style={{ marginTop: 14 }}>
                <label>Ghi chú thanh toán</label>
                <input
                  value={checkoutNote}
                  onChange={(e) => setCheckoutNote(e.target.value)}
                  placeholder="Ví dụ: khách thanh toán tiền mặt"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setConfirmCheckout(true)}
                  disabled={saving}
                >
                  ↩️ Xác nhận trả phòng &amp; thanh toán
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== XÁC NHẬN TRẢ PHÒNG ===== */}
      {confirmCheckout && selected && (
        <Modal
          title="Xác nhận trả phòng"
          size="sm"
          onClose={() => setConfirmCheckout(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmCheckout(false)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-success" onClick={handleCheckout} disabled={saving}>
                {saving ? 'Đang xử lý...' : 'Trả phòng & lập hoá đơn'}
              </button>
            </>
          }
        >
          <p>
            Trả phòng <strong>{selected.roomNumber}</strong> cho khách{' '}
            <strong>{selected.customerName}</strong>?
          </p>
          <div className="summary-box">
            <div className="summary-row">
              <span>Tiền phòng</span>
              <strong>{formatMoney(totals.room)}</strong>
            </div>
            <div className="summary-row">
              <span>Tiền dịch vụ</span>
              <strong>{formatMoney(totals.service)}</strong>
            </div>
            <div className="summary-row">
              <span>Giảm giá</span>
              <strong>-{formatMoney(totals.discount)}</strong>
            </div>
            <div className="summary-row grand">
              <span>Tổng thanh toán</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
          </div>
          <p className="text-muted">Sau khi trả phòng, phòng sẽ trở về trạng thái Trống.</p>
        </Modal>
      )}

      {/* ===== HOÁ ĐƠN VỪA LẬP ===== */}
      {invoice && (
        <Modal
          title="Hoá đơn thanh toán"
          onClose={() => setInvoice(null)}
          footer={
            <button type="button" className="btn" onClick={() => setInvoice(null)}>
              Đóng
            </button>
          }
        >
          <div className="detail-grid">
            <div className="detail-item">
              <div className="label">Mã hoá đơn</div>
              <div className="value">{invoice.code}</div>
            </div>
            <div className="detail-item">
              <div className="label">Phòng</div>
              <div className="value">{invoice.roomNumber}</div>
            </div>
            <div className="detail-item">
              <div className="label">Khách hàng</div>
              <div className="value">{invoice.customerName}</div>
            </div>
            <div className="detail-item">
              <div className="label">Thời điểm lập</div>
              <div className="value">{formatDate(invoice.createdAt)}</div>
            </div>
          </div>

          <div className="summary-box">
            <div className="summary-row">
              <span>Tiền phòng ({invoice.nights} ngày)</span>
              <strong>{formatMoney(invoice.roomAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Tiền dịch vụ</span>
              <strong>{formatMoney(invoice.serviceAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Giảm giá</span>
              <strong>-{formatMoney(invoice.discount)}</strong>
            </div>
            <div className="summary-row grand">
              <span>Tổng thanh toán</span>
              <span>{formatMoney(invoice.totalAmount)}</span>
            </div>
          </div>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default Checkout