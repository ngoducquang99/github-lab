import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Khôi phục phiên đăng nhập khi tải lại trang
  useEffect(() => {
    let active = true

    async function restore() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await api.me()
        if (active) setUser(me)
      } catch {
        setToken(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    restore()
    return () => {
      active = false
    }
  }, [])

  // Tự đăng xuất khi token hết hạn
  useEffect(() => {
    function onUnauthorized() {
      setUser(null)
    }
    window.addEventListener('hotel:unauthorized', onUnauthorized)
    return () => window.removeEventListener('hotel:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (username, password) => {
    const result = await api.login(username, password)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'Admin',
      setUser,
    }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return ctx
}

export const ROLE_LABEL = {
  Admin: 'Quản trị viên',
  Receptionist: 'Lễ tân',
  Accountant: 'Kế toán',
}