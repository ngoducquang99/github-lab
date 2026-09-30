import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Trang bạn tìm không tồn tại trong hệ thống.</p>
      <Link to="/" className="btn">
        ← Về sơ đồ phòng
      </Link>
    </div>
  )
}

export default NotFound