import { useCallback, useEffect, useState } from 'react'
import { api, formatDateTime } from '../services/api'
import { ROLE_LABEL, useAuth } from '../context/AuthContext'
import { EmptyState, ErrorBox, Loading } from '../components/Feedback'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  role: 'Receptionist',
}

function Users() {
  const { isAdmin } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [resetting, setResetting] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await api.getUsers())
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

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    setFormError('')

    // Kiểm tra hợp lệ của HTML5 (ví dụ email sai định dạng) và báo rõ cho người dùng
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

    if (!form.username.trim() || !form.password) {
      setFormError('Tên đăng nhập và mật khẩu là bắt buộc.')
      return
    }
    if (form.password.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    setSaving(true)
    try {
      await api.createUser({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim() || form.username.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
      })
      setToast({ type: 'success', message: `Đã tạo tài khoản ${form.username}.` })
      setCreating(false)
      setForm(EMPTY)
      await load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(user) {
    setSaving(true)
    try {
      const updated = await api.toggleUser(user.id)
      setToast({
        type: 'success',
        message: `${updated.isActive ? 'Đã mở khoá' : 'Đã khoá'} tài khoản ${updated.username}.`,
      })
      await load()
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 6) {
      setToast({ type: 'error', message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
      return
    }

    setSaving(true)
    try {
      await api.resetPassword(resetting.id, newPassword)
      setToast({ type: 'success', message: `Đã đặt lại mật khẩu cho ${resetting.username}.` })
      setResetting(null)
      setNewPassword('')
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="alert alert-error">
        ⚠️ Chỉ quản trị viên mới có quyền truy cập chức năng quản lý nhân viên.
      </div>
    )
  }

  if (loading) return <Loading text="Đang tải danh sách tài khoản..." />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Quản lý nhân viên</h1>
          <p>{users.length} tài khoản trong hệ thống</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setCreating(true)
              setForm(EMPTY)
              setFormError('')
            }}
          >
            ➕ Thêm nhân viên
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState icon="🧑‍💼" title="Chưa có tài khoản nào" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Họ tên</th>
                <th>Liên hệ</th>
                <th>Vai trò</th>
                <th>Đăng nhập gần nhất</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.username}</strong>
                  </td>
                  <td>{u.fullName}</td>
                  <td>
                    {u.email || <span className="text-muted">—</span>}
                    <div className="text-muted">{u.phone || ''}</div>
                  </td>
                  <td>{ROLE_LABEL[u.role] || u.role}</td>
                  <td>{formatDateTime(u.lastLoginAt)}</td>
                  <td className="text-center">
                    <span className={`badge ${u.isActive ? 'badge-available' : 'badge-cancelled'}`}>
                      {u.isActive ? 'Hoạt động' : 'Đã khoá'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title="Đặt lại mật khẩu"
                      onClick={() => {
                        setResetting(u)
                        setNewPassword('')
                      }}
                    >
                      🔑
                    </button>
                    <button
                      type="button"
                      className={`btn-icon ${u.isActive ? 'danger' : ''}`}
                      title={u.isActive ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                      onClick={() => handleToggle(u)}
                      disabled={saving || u.username === 'admin'}
                    >
                      {u.isActive ? '🚫' : '✅'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== TẠO TÀI KHOẢN ===== */}
      {creating && (
        <Modal
          title="Thêm nhân viên"
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                Huỷ
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Tạo tài khoản'}
              </button>
            </>
          }
        >
          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>
                Tên đăng nhập <span className="required">*</span>
              </label>
              <input value={form.username} onChange={(e) => update('username', e.target.value)} />
            </div>

            <div className="form-group">
              <label>
                Mật khẩu <span className="required">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
              />
              <span className="form-hint">Tối thiểu 6 ký tự.</span>
            </div>

            <div className="form-group">
              <label>Họ tên</label>
              <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Vai trò</label>
              <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                <option value="Receptionist">Lễ tân</option>
                <option value="Accountant">Kế toán</option>
                <option value="Admin">Quản trị viên</option>
              </select>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* ===== ĐẶT LẠI MẬT KHẨU ===== */}
      {resetting && (
        <Modal
          title={`Đặt lại mật khẩu cho ${resetting.username}`}
          size="sm"
          onClose={() => setResetting(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setResetting(null)}>
                Huỷ
              </button>
              <button type="button" className="btn" onClick={handleResetPassword} disabled={saving}>
                {saving ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>
              Mật khẩu mới <span className="required">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default Users