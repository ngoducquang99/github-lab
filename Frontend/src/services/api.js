// Địa chỉ API backend.
// - Khi chạy `npm run dev` (Vite ở cổng 5173): gọi thẳng backend 5097.
// - Khi chạy bản build được phục vụ từ backend (cùng cổng 5097): dùng đường dẫn tương đối.
const API_BASE =
  typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5097/api'
    : '/api'

const TOKEN_KEY = 'hotel_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Hãy chắc chắn backend đang chạy.', 0)
  }

  if (response.status === 204) return null

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    let message = 'Đã xảy ra lỗi, vui lòng thử lại.'
    if (response.status === 401) message = 'Sai tài khoản hoặc mật khẩu / phiên đăng nhập đã hết hạn.'
    else if (response.status === 403) message = 'Bạn không có quyền thực hiện chức năng này.'

    if (data && typeof data === 'object') {
      message = data.message || data.title || message
      if (data.errors) {
        const first = Object.values(data.errors).flat()[0]
        if (first) message = first
      }
    }

    if (response.status === 401 && auth) {
      setToken(null)
      window.dispatchEvent(new Event('hotel:unauthorized'))
    }

    throw new ApiError(message, response.status)
  }

  return data
}

export const api = {
  // ===== XÁC THỰC =====
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: payload }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  // ===== PHÒNG =====
  getRooms: (params = {}) => request(`/rooms${toQuery(params)}`),
  getRoom: (id) => request(`/rooms/${id}`),
  getAvailableRooms: () => request('/rooms/available'),
  createRoom: (payload) => request('/rooms', { method: 'POST', body: payload }),
  updateRoom: (id, payload) => request(`/rooms/${id}`, { method: 'PUT', body: payload }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // ===== THỂ LOẠI PHÒNG =====
  getRoomTypes: () => request('/room-types'),
  createRoomType: (payload) => request('/room-types', { method: 'POST', body: payload }),
  updateRoomType: (id, payload) => request(`/room-types/${id}`, { method: 'PUT', body: payload }),
  deleteRoomType: (id) => request(`/room-types/${id}`, { method: 'DELETE' }),

  // ===== KHÁCH HÀNG =====
  getCustomers: (params = {}) => request(`/customers${toQuery(params)}`),
  createCustomer: (payload) => request('/customers', { method: 'POST', body: payload }),
  updateCustomer: (id, payload) => request(`/customers/${id}`, { method: 'PUT', body: payload }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // ===== THUÊ / TRẢ PHÒNG =====
  getBookings: (params = {}) => request(`/bookings${toQuery(params)}`),
  getActiveBookings: () => request('/bookings/active'),
  getBooking: (id) => request(`/bookings/${id}`),
  rentRoom: (payload) => request('/bookings', { method: 'POST', body: payload }),
  addService: (bookingId, payload) =>
    request(`/bookings/${bookingId}/services`, { method: 'POST', body: payload }),
  removeService: (serviceId) => request(`/bookings/services/${serviceId}`, { method: 'DELETE' }),
  checkout: (bookingId, payload) =>
    request(`/bookings/${bookingId}/checkout`, { method: 'POST', body: payload }),
  cancelBooking: (id) => request(`/bookings/${id}`, { method: 'DELETE' }),

  // ===== HOÁ ĐƠN =====
  getInvoices: () => request('/invoices'),

  // ===== THỐNG KÊ =====
  getDashboard: () => request('/statistics/dashboard'),
  getRoomStatus: () => request('/statistics/status'),
  getRevenue: (params = {}) => request(`/statistics/revenue${toQuery(params)}`),

  // ===== NGƯỜI DÙNG =====
  getUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  toggleUser: (id) => request(`/users/${id}/toggle`, { method: 'PUT' }),
  resetPassword: (id, newPassword) =>
    request(`/users/${id}/reset-password`, { method: 'PUT', body: { currentPassword: '', newPassword } }),
}

function toQuery(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  )
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

export function formatMoney(value) {
  const number = Number(value || 0)
  return number.toLocaleString('vi-VN') + ' đ'
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function toInputDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}