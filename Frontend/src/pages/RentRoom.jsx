import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatMoney, toInputDate } from '../services/api'
import { EmptyState, ErrorBox, Loading } from '../components/Feedback'
import Toast from '../components/Toast'

const EMPTY = {
  roomId: '',
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerIdCard: '',
  customerAddress: '',
  guestCount: 1,
  checkInDate: toInputDate(new Date()),
  expectedCheckOutDate: '',
  note: '',
}

function RentRoom() {
  const [searchParams] = useSearchParams()
  const presetRoomId = searchParams.get('roomId')

  const [rooms, setRooms] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState(null)

  const [customerSearch, setCustomerSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [availableRooms, customerList] = await Promise.all([
        api.getAvailableRooms(),
        api.getCustomers(),
      ])
      setRooms(availableRooms)
      setCustomers(customerList)

      if (presetRoomId && availableRooms.some((r) => String(r.id) === String(presetRoomId))) {
        setForm((prev) => ({ ...prev, roomId: String(presetRoomId) }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [presetRoomId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const selectedRoom = useMemo(
    () => rooms.find((r) => String(r.id) === String(form.roomId)),
    [rooms, form.roomId]
  )

  const matchedCustomers = useMemo(() => {
    const key = customerSearch.trim().toLowerCase()
    if (!key) return customers.slice(0, 6)
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(key) ||
          c.phone.includes(key) ||
          (c.idCard || '').includes(key)
      )
      .slice(0, 6)
  }, [customers, customerSearch])

  // Tạm tính tiền phòng theo số ngày dự kiến
  const estimate = useMemo(() => {
    if (!selectedRoom || !form.checkInDate) return null
    const start = new Date(form.checkInDate)
    const end = form.expectedCheckOutDate ? new Date(form.expectedCheckOutDate) : start
    let days = Math.round((end - start) / 86400000)
    if (Number.isNaN(days) || days <= 0) days = 1
    return { days, total: days * selectedRoom.pricePerNight }
  }, [selectedRoom, form.checkInDate, form.expectedCheckOutDate])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function pickCustomer(customer) {
    setForm((prev) => ({
      ...prev,
      customerId: String(customer.id),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      customerIdCard: customer.idCard || '',
      customerAddress: customer.address || '',
    }))
    setCustomerSearch('')
    setFormError('')
  }

  function clearCustomer() {
    setForm((prev) => ({
      ...prev,
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerIdCard: '',
      customerAddress: '',
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!form.roomId) {
      setFormError('Vui lòng chọn phòng cho thuê.')
      return
    }
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setFormError('Vui lòng nhập tên và số điện thoại khách hàng.')
      return
    }
    if (form.expectedCheckOutDate && new Date(form.expectedCheckOutDate) < new Date(form.checkInDate)) {
      setFormError('Ngày trả phòng dự kiến phải sau ngày nhận phòng.')
      return
    }

    const payload = {
      roomId: Number(form.roomId),
      customerId: form.customerId ? Number(form.customerId) : null,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerEmail: form.customerEmail.trim() || null,
      customerIdCard: form.customerIdCard.trim() || null,
      customerAddress: form.customerAddress.trim() || null,
      guestCount: Number(form.guestCount) || 1,
      checkInDate: form.checkInDate,
      expectedCheckOutDate: form.expectedCheckOutDate || null,
      note: form.note.trim() || null,
    }

    setSaving(true)
    try {
      const booking = await api.rentRoom(payload)
      setCreated(booking)
      setToast({ type: 'success', message: `Đã cho thuê phòng ${booking.roomNumber}.` })
      setForm({ ...EMPTY, checkInDate: toInputDate(new Date()) })
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải phòng trống..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Cho thuê phòng</h1>
          <p>Lập phiếu thuê cho khách — hiện có {rooms.length} phòng trống</p>
        </div>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          icon="🚫"
          title="Hiện không còn phòng trống"
          description="Hãy trả phòng cho khách hoặc chuyển phòng bảo trì về trạng thái trống."
        />
      ) : (
        <div className="grid-2">
          {/* ===== CỘT TRÁI: CHỌN PHÒNG & KHÁCH ===== */}
          <div className="card">
            <h2 className="card-title">1. Chọn phòng</h2>

            <div className="room-grid">
              {rooms.map((room) => (
                <button
                  type="button"
                  key={room.id}
                  className={`room-card status-available ${String(room.id) === String(form.roomId) ? 'selected' : ''
                    }`}
                  onClick={() => update('roomId', String(room.id))}
                  style={
                    String(room.id) === String(form.roomId)
                      ? { outline: '2px solid #2563eb', outlineOffset: 1 }
                      : undefined
                  }
                >
                  <span className="room-number">{room.roomNumber}</span>
                  <span className="room-type">
                    Tầng {room.floor} · {room.roomTypeName}
                  </span>
                  <span className="room-price">{formatMoney(room.pricePerNight)}/ngày</span>
                </button>
              ))}
            </div>

            <h2 className="card-title" style={{ marginTop: 24 }}>
              2. Khách hàng
            </h2>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Tìm khách hàng cũ</label>
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="🔍 Nhập tên, số điện thoại hoặc CMND..."
              />
              <span className="form-hint">
                Bỏ trống nếu đây là khách mới — hệ thống sẽ tự tạo hồ sơ khách hàng.
              </span>
            </div>

            {customerSearch && (
              <div className="table-wrap" style={{ marginBottom: 12 }}>
                <table className="data-table" style={{ minWidth: 320 }}>
                  <tbody>
                    {matchedCustomers.length === 0 && (
                      <tr>
                        <td className="text-muted">Không tìm thấy khách hàng phù hợp.</td>
                      </tr>
                    )}
                    {matchedCustomers.map((c) => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => pickCustomer(c)}>
                        <td>
                          <strong>{c.fullName}</strong>
                          <div className="text-muted">
                            {c.phone} {c.idCard ? `· CMND ${c.idCard}` : ''}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="btn btn-ghost btn-sm">Chọn</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {form.customerId && (
              <div className="alert alert-info">
                Đang dùng hồ sơ khách cũ: <strong>{form.customerName}</strong> ({form.customerPhone})
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearCustomer}>
                  Đổi sang khách mới
                </button>
              </div>
            )}
          </div>

          {/* ===== CỘT PHẢI: THÔNG TIN PHIẾU THUÊ ===== */}
          <div className="card">
            <h2 className="card-title">3. Thông tin thuê phòng</h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Tên khách hàng <span className="required">*</span>
                  </label>
                  <input
                    value={form.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    disabled={Boolean(form.customerId)}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Số điện thoại <span className="required">*</span>
                  </label>
                  <input
                    value={form.customerPhone}
                    onChange={(e) => update('customerPhone', e.target.value)}
                    placeholder="0912345678"
                    disabled={Boolean(form.customerId)}
                  />
                </div>

                <div className="form-group">
                  <label>CMND / CCCD</label>
                  <input
                    value={form.customerIdCard}
                    onChange={(e) => update('customerIdCard', e.target.value)}
                    disabled={Boolean(form.customerId)}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => update('customerEmail', e.target.value)}
                    disabled={Boolean(form.customerId)}
                  />
                </div>

                <div className="form-group full">
                  <label>Địa chỉ</label>
                  <input
                    value={form.customerAddress}
                    onChange={(e) => update('customerAddress', e.target.value)}
                    disabled={Boolean(form.customerId)}
                  />
                </div>

                <div className="form-group">
                  <label>Ngày nhận phòng</label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={(e) => update('checkInDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Ngày trả phòng dự kiến</label>
                  <input
                    type="date"
                    value={form.expectedCheckOutDate}
                    onChange={(e) => update('expectedCheckOutDate', e.target.value)}
                  />
                  <span className="form-hint">Có thể để trống nếu khách thuê theo ngày.</span>
                </div>

                <div className="form-group">
                  <label>Số người ở</label>
                  <input
                    type="number"
                    min="1"
                    value={form.guestCount}
                    onChange={(e) => update('guestCount', e.target.value)}
                  />
                </div>

                <div className="form-group full">
                  <label>Ghi chú</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => update('note', e.target.value)}
                    placeholder="Yêu cầu đặc biệt của khách..."
                  />
                </div>
              </div>

              {selectedRoom && (
                <div className="summary-box">
                  <div className="summary-row">
                    <span>Phòng chọn thuê</span>
                    <strong>
                      {selectedRoom.roomNumber} — {selectedRoom.roomTypeName}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Giá thuê</span>
                    <strong>{formatMoney(selectedRoom.pricePerNight)}/ngày</strong>
                  </div>
                  {estimate && (
                    <>
                      <div className="summary-row">
                        <span>Số ngày dự kiến</span>
                        <strong>{estimate.days} ngày</strong>
                      </div>
                      <div className="summary-row grand">
                        <span>Tạm tính tiền phòng</span>
                        <span>{formatMoney(estimate.total)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? 'Đang lưu...' : '🔑 Xác nhận cho thuê'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setForm({ ...EMPTY, checkInDate: toInputDate(new Date()) })
                    setFormError('')
                  }}
                >
                  ↺ Nhập lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== KẾT QUẢ VỪA TẠO ===== */}
      {created && (
        <div className="card">
          <h2 className="card-title">Phiếu thuê vừa tạo</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="label">Mã phiếu</div>
              <div className="value">{created.code}</div>
            </div>
            <div className="detail-item">
              <div className="label">Phòng</div>
              <div className="value">
                {created.roomNumber} — {created.roomTypeName}
              </div>
            </div>
            <div className="detail-item">
              <div className="label">Khách hàng</div>
              <div className="value">{created.customerName}</div>
            </div>
            <div className="detail-item">
              <div className="label">Số điện thoại</div>
              <div className="value">{created.customerPhone}</div>
            </div>
            <div className="detail-item">
              <div className="label">Số ngày</div>
              <div className="value">{created.nights}</div>
            </div>
            <div className="detail-item">
              <div className="label">Tiền phòng tạm tính</div>
              <div className="value">{formatMoney(created.roomAmount)}</div>
            </div>
          </div>
          <p className="text-muted">
            Khách đã được ghi nhận vào phòng. Khi khách trả phòng, vào mục <strong>Trả phòng</strong> để
            thanh toán.
          </p>
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default RentRoom