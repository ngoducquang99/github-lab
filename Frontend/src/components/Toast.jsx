/** Thông báo nổi góc phải màn hình. */
function Toast({ message, type = 'success', onClose }) {
  if (!message) return null

  const icon = type === 'error' ? '⚠️' : type === 'info' ? 'ℹ️' : '✅'

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng">
        ✕
      </button>
    </div>
  )
}

export default Toast