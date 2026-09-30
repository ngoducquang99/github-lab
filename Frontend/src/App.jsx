import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'

import Login from './pages/Login'
import Home from './pages/Home'
import RoomList from './pages/RoomList'
import AddRoom from './pages/AddRoom'
import RoomTypes from './pages/RoomTypes'
import Customers from './pages/Customers'
import RentRoom from './pages/RentRoom'
import Checkout from './pages/Checkout'
import BookingHistory from './pages/BookingHistory'
import Statistics from './pages/Statistics'
import Income from './pages/Income'
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'
import Users from './pages/Users'
import NotFound from './pages/NotFound'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Trang đăng nhập (không cần xác thực) */}
          <Route path="/login" element={<Login />} />

          {/* Các trang trong hệ thống (yêu cầu đăng nhập) */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />

            <Route path="/rooms" element={<RoomList />} />
            <Route path="/rooms/add" element={<AddRoom />} />
            <Route path="/room-types" element={<RoomTypes />} />
            <Route path="/customers" element={<Customers />} />

            <Route path="/rent-room" element={<RentRoom />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/bookings" element={<BookingHistory />} />

            <Route path="/statistics" element={<Statistics />} />
            <Route path="/income" element={<Income />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/users" element={<Users />} />

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App