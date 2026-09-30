import { useCallback, useEffect, useState } from 'react'
import { api, formatMoney } from '../services/api'
import { EmptyState, ErrorBox, Loading } from '../components/Feedback'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY = { name: '', pricePerNight: '', capacity: 2, description: '' }

function RoomTypes() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [dialog, setDialog] = useState(null) // { mode: 'create' | 'edit', item }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTypes(await api.getRoomTypes())
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

  function openCreate() {
    setDialog({ mode: 'create' })
    setForm(EMPTY)
    setFormError('')
  }

  function openEdit(item) {
    setDialog({ mode: 'edit', item })
    setForm({
      name: item.name,
      pricePerNight: item.pricePerNight,
      capacity: item.capacity,
      description: item.description || '',
    })
    setFormError('')
  }

  function closeDialog() {
    setDialog(null)
    setForm(EMPTY)
    setFormError('')
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    // Kiểm tra hợp lệ của HTML5 (ví dụ giá âm) và báo rõ cho người dùng
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

    if (!form.name.trim()) {
      setFormError('Vui lòng nhập tên thể loại.')
      return
    }
    if (Number(form.pricePerNight) <= 0) {
      setFormError('Giá thuê phải lớn hơn 0.')
      return
    }

    const payload = {
      name: form.name.trim(),
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity) || 2,
      description: form.description.trim() || null,
    }

    setSaving(true)
    try {
      if (dialog.mode === 'create') {
        await api.createRoomType(payload)
        setToast({ type: 'success', message: `Đã thêm thể loại "${payload.name}".` })
      } else {
        await api.updateRoomType(dialog.item.id, payload)
        setToast({ type: 'success', message: `Đã cập nhật thể loại "${payload.name}".` })
      }
      closeDialog()
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
      await api.deleteRoomType(deleting.id)
      setToast({ type: 'success', message: `Đã xoá thể loại "${deleting.name}".` })
      setDeleting(null)
      await load()
    } catch (err) {
      setToast({ type: 'error', message: err.message })
      setDeleting(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải thể loại phòng..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Thể loại phòng</h1>
          <p>Quản lý loại phòng và giá thuê áp dụng cho từng phòng</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={openCreate}>
            ➕ Thêm thể loại
          </button>
        </div>
      </div>

      {types.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="Chưa có thể loại phòng"
          description="Tạo thể loại phòng trước khi thêm phòng vào hệ thống."
          action={
            <button type="button" className="btn" onClick={openCreate}>
              ➕ Thêm thể loại đầu tiên
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên thể loại</th>
                <th className="text-right">Giá/ngày</th>
                <th className="text-center">Sức chứa</th>
                <th className="text-center">Số phòng</th>
                <th>Mô tả</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                  </td>
                  <td className="text-right money">{formatMoney(t.pricePerNight)}</td>
                  <td className="text-center">{t.capacity} người</td>
                  <td className="text-center">{t.roomCount}</td>
                  <td>{t.description || <span className="text-muted">—</span>}</td>
                  <td className="actions">
                    <button type="button" className="btn-icon" title="Sửa" onClick={() => openEdit(t)}>
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      title="Xoá"
                      onClick={() => setDeleting(t)}
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

      {dialog && (
        <Modal
          title={dialog.mode === 'create' ? 'Thêm thể loại phòng' : `Sửa "${dialog.item.name}"`}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                Huỷ
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </>
          }
        >
          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>
                Tên thể loại <span className="required">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Standard, Deluxe, Suite..."
              />
            </div>

            <div className="form-group">
              <label>
                Giá thuê/ngày (VND) <span className="required">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.pricePerNight}
                onChange={(e) => update('pricePerNight', e.target.value)}
                placeholder="350000"
              />
            </div>

            <div className="form-group">
              <label>Sức chứa (số người)</label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => update('capacity', e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label>Mô tả</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xác nhận xoá thể loại"
          size="sm"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Đang xoá...' : 'Xoá'}
              </button>
            </>
          }
        >
          <p>
            Bạn có chắc muốn xoá thể loại <strong>{deleting.name}</strong>?
            {deleting.roomCount > 0 && (
              <>
                <br />
                Thể loại này đang được <strong>{deleting.roomCount}</strong> phòng sử dụng nên sẽ không
                xoá được.
              </>
            )}
          </p>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default RoomTypes