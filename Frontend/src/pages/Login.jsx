import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ username: 'admin', password: 'admin123' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to={location.state?.from || '/'} replace />
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.username.trim() || !form.password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.')
      return
    }

    setSubmitting(true)
    try {
      await login(form.username.trim(), form.password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  function quickFill(username, password) {
    setForm({ username, password })
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">H</div>
          <h1>HOTEL MANAGER</h1>
          <p>Hệ thống quản lý phòng cho thuê</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="admin"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="••••••"
            />
          </div>

          <button type="submit" className="btn btn-block" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-hint">
          <div>
            <b>Tài khoản mẫu:</b>
          </div>
          <div>
            admin / admin123{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickFill('admin', 'admin123')}>
              Dùng
            </button>
          </div>
          <div>
            letan / staff123{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickFill('letan', 'staff123')}>
              Dùng
            </button>
          </div>
          <div>
            ketoan / ketoan123{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickFill('ketoan', 'ketoan123')}>
              Dùng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login