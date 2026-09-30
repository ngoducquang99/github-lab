import { useEffect, useState } from 'react'
import { api, formatDateTime } from '../services/api'
import { ROLE_LABEL, useAuth } from '../context/AuthContext'
import { ErrorBox, Loading } from '../components/Feedback'
import Toast from '../components/Toast'

function Profile() {
  const { user, setUser } = useAuth()

  const [form, setForm] = useState({ fullName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(!user)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const me = await api.me()
        if (!active) return
        setUser(me)
        setForm({ fullName: me.fullName, email: me.email || '', phone: me.phone || '' })
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [setUser])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!form.fullName.trim()) {
      setFormError('Họ tên không được để trống.')
      return
    }

    setSaving(true)
    try {
      const updated = await api.updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      })
      setUser(updated)
      setToast({ type: 'success', message: 'Đã cập nhật thông tin cá nhân.' })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Đang tải thông tin tài khoản..." />
  if (error) return <ErrorBox message={error} />

  const initial = (user?.fullName || 'A').charAt(0).toUpperCase()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Thông tin cá nhân</h1>
          <p>Tài khoản đang đăng nhập vào hệ thống</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="profile-head">
            <div className="avatar">{initial}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>{user.fullName}</h2>
              <span className="text-muted">@{user.username}</span>
            </div>
          </div>

          <div className="info-list">
            <div className="info-item">
              <div className="label">Vai trò</div>
              <div className="value">{ROLE_LABEL[user.role] || user.role}</div>
            </div>
            <div className="info-item">
              <div className="label">Trạng thái</div>
              <div className="value">{user.isActive ? '✅ Đang hoạt động' : '🚫 Đã khoá'}</div>
            </div>
            <div className="info-item">
              <div className="label">Email</div>
              <div className="value">{user.email || '—'}</div>
            </div>
            <div className="info-item">
              <div className="label">Số điện thoại</div>
              <div className="value">{user.phone || '—'}</div>
            </div>
            <div className="info-item">
              <div className="label">Ngày tạo tài khoản</div>
              <div className="value">{formatDateTime(user.createdAt)}</div>
            </div>
            <div className="info-item">
              <div className="label">Đăng nhập gần nhất</div>
              <div className="value">{formatDateTime(user.lastLoginAt)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Cập nhật thông tin</h2>

          {formError && <div className="alert alert-error">{formError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group full">
                <label>
                  Họ và tên <span className="required">*</span>
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

export default Profile