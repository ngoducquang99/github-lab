import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatMoney } from '../services/api'
import { ErrorBox, Loading } from '../components/Feedback'
import Toast from '../components/Toast'

const EMPTY = { roomNumber: '', floor: 1, roomTypeId: '', status: 'Available', note: '' }

function AddRoom() {
  const navigate = useNavigate()

  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  // Cho phép thêm nhanh nhiều phòng liên tiếp
  const [bulk, setBulk] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setTypes(await api.getRoomTypes())
      } catch (err) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.roomNumber.trim()) {
      setError('Vui lòng nhập số phòng.')
      return
    }
    if (!form.roomTypeId) {
      setError('Vui lòng chọn thể loại phòng.')
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
      const created = await api.createRoom(payload)

      if (bulk) {
        setToast({ type: 'success', message: `Đã thêm phòng ${created.roomNumber}.` })
        setForm((prev) => ({ ...prev, roomNumber: '', note: '' }))
      } else {
        // Chuyển về danh sách kèm thông báo (state sống sót qua điều hướng)
        navigate('/rooms', {
          state: { toast: { type: 'success', message: `Đã thêm phòng ${created.roomNumber}.` } },
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải thể loại phòng..." />
  if (loadError) return <ErrorBox message={loadError} />

  const selectedType = types.find((t) => String(t.id) === String(form.roomTypeId))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Thêm mới phòng</h1>
          <p>Khai báo phòng mới vào hệ thống quản lý</p>
        </div>
        <div className="page-actions">
          <Link to="/rooms" className="btn btn-ghost">
            ← Về danh sách phòng
          </Link>
        </div>
      </div>

      {types.length === 0 && (
        <div className="alert alert-info">
          Chưa có thể loại phòng nào.{' '}
          <Link to="/room-types">
            <strong>Tạo thể loại phòng</strong>
          </Link>{' '}
          trước khi thêm phòng.
        </div>
      )}

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>
                Số phòng <span className="required">*</span>
              </label>
              <input
                value={form.roomNumber}
                onChange={(e) => update('roomNumber', e.target.value)}
                placeholder="Ví dụ: 101, A203"
              />
              <span className="form-hint">Không được trùng với phòng đã có.</span>
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
                    {t.name} — {formatMoney(t.pricePerNight)}/ngày
                  </option>
                ))}
              </select>
              {selectedType && (
                <span className="form-hint">
                  Sức chứa tối đa {selectedType.capacity} người · Giá {formatMoney(selectedType.pricePerNight)}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Trạng thái ban đầu</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="Available">Trống — sẵn sàng cho thuê</option>
                <option value="Maintenance">Bảo trì — chưa cho thuê</option>
                <option value="Reserved">Đã đặt trước</option>
              </select>
            </div>

            <div className="form-group full">
              <label>Ghi chú</label>
              <textarea
                value={form.note}
                onChange={(e) => update('note', e.target.value)}
                placeholder="Ví dụ: phòng view biển, cần thay điều hoà..."
              />
            </div>
          </div>

          <label className="form-hint" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input
              type="checkbox"
              checked={bulk}
              onChange={(e) => setBulk(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Thêm liên tiếp nhiều phòng (giữ lại tầng &amp; thể loại sau khi lưu)
          </label>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={saving || types.length === 0}>
              {saving ? 'Đang lưu...' : '💾 Lưu phòng'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setForm(EMPTY)
                setError('')
              }}
            >
              ↺ Nhập lại
            </button>
          </div>
        </form>
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default AddRoom