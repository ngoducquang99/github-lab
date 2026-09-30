import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Toast from '../components/Toast'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

function ChangePassword() {
  const { logout } = useAuth()

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

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

    if (!form.currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại.')
      return
    }
    if (form.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }
    if (form.newPassword === form.currentPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại.')
      return
    }

    setSaving(true)
    try {
      await api.changePassword(form.currentPassword, form.newPassword)
      setForm(EMPTY)
      setToast({ type: 'success', message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' })
      setTimeout(() => logout(), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Đổi mật khẩu</h1>
          <p>Nên đổi mật khẩu định kỳ để bảo vệ tài khoản</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>
              Mật khẩu hiện tại <span className="required">*</span>
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => update('currentPassword', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>
              Mật khẩu mới <span className="required">*</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => update('newPassword', e.target.value)}
            />
            <span className="form-hint">Tối thiểu 6 ký tự.</span>
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label>
              Xác nhận mật khẩu mới <span className="required">*</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Đang xử lý...' : '🔒 Đổi mật khẩu'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(EMPTY)}>
              ↺ Nhập lại
            </button>
          </div>
        </form>
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default ChangePassword