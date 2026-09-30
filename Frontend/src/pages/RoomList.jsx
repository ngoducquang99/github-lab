import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, formatMoney } from '../services/api'
import { EmptyState, ErrorBox, Loading, StatusBadge } from '../components/Feedback'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ExportButton from '../components/ExportButton'

const EMPTY_FORM = { roomNumber: '', floor: 1, roomTypeId: '', status: 'Available', note: '' }

function RoomList() {
  const navigate = useNavigate()
  const location = useLocation()

  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [floorFilter, setFloorFilter] = useState('')

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [roomData, typeData] = await Promise.all([api.getRooms(), api.getRoomTypes()])
      setRooms(roomData)
      setTypes(typeData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Hiển thị thông báo được chuyển từ trang khác (ví dụ sau khi thêm phòng thành công)
  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast)
      // Xoá state để thông báo không hiện lại khi tải lại trang
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  // Sau khi xoá phòng, tải lại danh sách để chắc chắn dữ liệu khớp với máy chủ
  const reloadAfterDelete = useCallback(async () => {
    const fresh = await api.getRooms()
    setRooms(fresh)
    return fresh
  }, [])

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b),
    [rooms]
  )

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase()
    return rooms.filter((r) => {
      if (key && !r.roomNumber.toLowerCase().includes(key)) return false
      if (statusFilter && r.status !== statusFilter) return false
      if (floorFilter && String(r.floor) !== String(floorFilter)) return false
      return true
    })
  }, [rooms, search, statusFilter, floorFilter])

  function openEdit(room) {
    setEditing(room)
    setForm({
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomTypeId: room.roomTypeId,
      status: room.status,
      note: room.note || '',
    })
    setFormError('')
  }

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    // Kiểm tra hợp lệ của HTML5 (ví dụ số tầng âm) và báo rõ cho người dùng
    const formEl = event.currentTarget
    if (formEl && typeof formEl.checkValidity === 'function' && !formEl.checkValidity()) {
      const invalid = formEl.querySelector(':invalid')
      setFormError(
        invalid?.validationMessage
          ? `Dữ liệu chưa hợp lệ: ${invalid.validationMessage}`
          : 'Vui lòng kiểm tra lại các ô nhập liệu.'
      )
      return
    }

    if (!form.roomNumber.trim()) {
      setFormError('Vui lòng nhập số phòng.')
      return
    }
    if (!form.roomTypeId) {
      setFormError('Vui lòng chọn thể loại phòng.')
      return
    }

    const payload = {
      roomNumber: form.roomNumber.trim(),
      floor: Number(form.floor) || 1,
      roomTypeId: Number(form.roomTypeId),
      status: form.status,
      note: form.note.trim() || null,
    }

    setSaving(true)
    try {
      await api.updateRoom(editing.id, payload)
      setToast({ type: 'success', message: `Đã cập nhật phòng ${payload.roomNumber}.` })
      closeForm()
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.deleteRoom(deleting.id)
      const removedNumber = deleting.roomNumber
      setDeleting(null)
      await reloadAfterDelete()
      setToast({ type: 'success', message: `Đã xoá phòng ${removedNumber}.` })
    } catch (err) {
      setToast({ type: 'error', message: err.message })
      setDeleting(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải danh sách phòng..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Danh sách phòng</h1>
          <p>
            Tổng {rooms.length} phòng — đang hiển thị {filtered.length} phòng
          </p>
        </div>
        <div className="page-actions">
          <ExportButton
            filename="danh-sach-phong"
            headers={['Số phòng', 'Tầng', 'Thể loại', 'Giá/ngày', 'Trạng thái', 'Khách đang ở', 'Ghi chú']}
            rows={filtered.map((r) => [
              r.roomNumber,
              r.floor,
              r.roomTypeName,
              r.pricePerNight,
              r.statusText,
              r.currentCustomerName || '',
              r.note || '',
            ])}
          />
          <Link to="/rooms/add" className="btn">
            ➕ Thêm phòng
          </Link>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Tìm theo số phòng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="Available">Trống</option>
          <option value="Occupied">Đang thuê</option>
          <option value="Reserved">Đã đặt</option>
          <option value="Maintenance">Bảo trì</option>
        </select>

        <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
          <option value="">Tất cả tầng</option>
          {floors.map((f) => (
            <option key={f} value={f}>
              Tầng {f}
            </option>
          ))}
        </select>

        {(search || statusFilter || floorFilter) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setFloorFilter('')
            }}
          >
            ✕ Xoá lọc
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🛏️"
          title="Không tìm thấy phòng nào"
          description="Thử đổi điều kiện lọc hoặc thêm phòng mới."
          action={
            <Link to="/rooms/add" className="btn">
              ➕ Thêm phòng
            </Link>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Số phòng</th>
                <th>Tầng</th>
                <th>Thể loại</th>
                <th className="text-right">Giá/ngày</th>
                <th>Trạng thái</th>
                <th>Khách đang ở</th>
                <th>Ghi chú</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((room) => (
                <tr key={room.id}>
                  <td>
                    <strong>{room.roomNumber}</strong>
                  </td>
                  <td>{room.floor}</td>
                  <td>{room.roomTypeName}</td>
                  <td className="text-right money">{formatMoney(room.pricePerNight)}</td>
                  <td>
                    <StatusBadge status={room.status} text={room.statusText} />
                  </td>
                  <td>{room.currentCustomerName || <span className="text-muted">—</span>}</td>
                  <td>{room.note || <span className="text-muted">—</span>}</td>
                  <td className="actions">
                    {room.status === 'Occupied' ? (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Trả phòng"
                        onClick={() => navigate(`/checkout?bookingId=${room.currentBookingId}`)}
                      >
                        ↩️
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Cho thuê phòng này"
                        onClick={() => navigate(`/rent-room?roomId=${room.id}`)}
                      >
                        🔑
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-icon"
                      title="Sửa phòng"
                      onClick={() => openEdit(room)}
                    >
                      ✏️
                    </button>

                    <button
                      type="button"
                      className="btn-icon danger"
                      title="Xoá phòng"
                      onClick={() => setDeleting(room)}
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

      {/* ===== HỘP THOẠI SỬA ===== */}
      {editing && (
        <Modal
          title={`Sửa phòng ${editing.roomNumber}`}
          onClose={closeForm}
          onSubmit={handleSubmit}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                Huỷ
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          }
        >
          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>
                Số phòng <span className="required">*</span>
              </label>
              <input value={form.roomNumber} onChange={(e) => update('roomNumber', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Tầng</label>
              <input
                type="number"
                min="1"
                value={form.floor}
                onChange={(e) => update('floor', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>
                Thể loại phòng <span className="required">*</span>
              </label>
              <select value={form.roomTypeId} onChange={(e) => update('roomTypeId', e.target.value)}>
                <option value="">-- Chọn thể loại --</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {formatMoney(t.pricePerNight)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Trạng thái</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="Available">Trống</option>
                <option value="Reserved">Đã đặt</option>
                <option value="Maintenance">Bảo trì</option>
                {editing.status === 'Occupied' && <option value="Occupied">Đang thuê</option>}
              </select>
              {editing.status === 'Occupied' && (
                <span className="form-hint">Phòng đang có khách — hãy trả phòng trước khi đổi trạng thái.</span>
              )}
            </div>

            <div className="form-group full">
              <label>Ghi chú</label>
              <textarea value={form.note} onChange={(e) => update('note', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* ===== HỘP THOẠI XOÁ ===== */}
      {deleting && (
        <Modal
          title="Xác nhận xoá phòng"
          size="sm"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Đang xoá...' : 'Xoá phòng'}
              </button>
            </>
          }
        >
          <p>
            Bạn có chắc muốn xoá phòng <strong>{deleting.roomNumber}</strong>? Hành động này không thể
            hoàn tác.
          </p>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default RoomList