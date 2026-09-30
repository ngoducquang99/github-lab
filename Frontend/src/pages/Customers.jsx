import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatDate } from '../services/api'
import { EmptyState, ErrorBox, Loading } from '../components/Feedback'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ExportButton from '../components/ExportButton'

const EMPTY = { fullName: '', phone: '', email: '', idCard: '', address: '' }

function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')

  const [dialog, setDialog] = useState(null) // { mode, item }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCustomers(await api.getCustomers())
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
    if (!key) return customers
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(key) ||
        c.phone.includes(key) ||
        (c.email || '').toLowerCase().includes(key) ||
        (c.idCard || '').includes(key)
    )
  }, [customers, search])

  function openCreate() {
    setDialog({ mode: 'create' })
    setForm(EMPTY)
    setFormError('')
  }

  function openEdit(item) {
    setDialog({ mode: 'edit', item })
    setForm({
      fullName: item.fullName,
      phone: item.phone,
      email: item.email || '',
      idCard: item.idCard || '',
      address: item.address || '',
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

    // Kiểm tra hợp lệ của HTML5 (ví dụ số âm) và báo rõ cho người dùng
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

    if (!form.fullName.trim() || !form.phone.trim()) {
      setFormError('Họ tên và số điện thoại là bắt buộc.')
      return
    }

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      idCard: form.idCard.trim() || null,
      address: form.address.trim() || null,
    }

    setSaving(true)
    try {
      if (dialog.mode === 'create') {
        await api.createCustomer(payload)
        setToast({ type: 'success', message: `Đã thêm khách hàng ${payload.fullName}.` })
      } else {
        await api.updateCustomer(dialog.item.id, payload)
        setToast({ type: 'success', message: `Đã cập nhật khách hàng ${payload.fullName}.` })
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
      await api.deleteCustomer(deleting.id)
      setToast({ type: 'success', message: `Đã xoá khách hàng ${deleting.fullName}.` })
      setDeleting(null)
      await load()
    } catch (err) {
      setToast({ type: 'error', message: err.message })
      setDeleting(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải danh sách khách hàng..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Khách hàng</h1>
          <p>
            Tổng {customers.length} khách hàng — đang hiển thị {filtered.length}
          </p>
        </div>
        <div className="page-actions">
          <ExportButton
            filename="danh-sach-khach-hang"
            headers={['Họ tên', 'Số điện thoại', 'Email', 'CMND/CCCD', 'Địa chỉ', 'Số lượt thuê', 'Ngày tạo']}
            rows={filtered.map((c) => [
              c.fullName,
              c.phone,
              c.email || '',
              c.idCard || '',
              c.address || '',
              c.bookingCount,
              formatDate(c.createdAt),
            ])}
          />
          <button type="button" className="btn" onClick={openCreate}>
            ➕ Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Tìm theo tên, SĐT, email hoặc CMND..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
            ✕ Xoá tìm kiếm
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Chưa có khách hàng nào"
          description="Khách hàng sẽ tự động được tạo khi bạn cho thuê phòng, hoặc thêm thủ công tại đây."
          action={
            <button type="button" className="btn" onClick={openCreate}>
              ➕ Thêm khách hàng
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>CMND/CCCD</th>
                <th>Địa chỉ</th>
                <th className="text-center">Lượt thuê</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.fullName}</strong>
                    <div className="text-muted">Tạo ngày {formatDate(c.createdAt)}</div>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.email || <span className="text-muted">—</span>}</td>
                  <td>{c.idCard || <span className="text-muted">—</span>}</td>
                  <td>{c.address || <span className="text-muted">—</span>}</td>
                  <td className="text-center">{c.bookingCount}</td>
                  <td className="actions">
                    <button type="button" className="btn-icon" title="Sửa" onClick={() => openEdit(c)}>
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      title="Xoá"
                      onClick={() => setDeleting(c)}
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
          title={dialog.mode === 'create' ? 'Thêm khách hàng' : `Sửa "${dialog.item.fullName}"`}
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
                Họ tên <span className="required">*</span>
              </label>
              <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
            </div>

            <div className="form-group">
              <label>
                Số điện thoại <span className="required">*</span>
              </label>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>

            <div className="form-group">
              <label>CMND / CCCD</label>
              <input value={form.idCard} onChange={(e) => update('idCard', e.target.value)} />
            </div>

            <div className="form-group full">
              <label>Địa chỉ</label>
              <input value={form.address} onChange={(e) => update('address', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Xác nhận xoá khách hàng"
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
            Bạn có chắc muốn xoá khách hàng <strong>{deleting.fullName}</strong>?
            {deleting.bookingCount > 0 && (
              <>
                <br />
                Khách này đã có <strong>{deleting.bookingCount}</strong> lượt thuê nên sẽ không xoá được.
              </>
            )}
          </p>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default Customers