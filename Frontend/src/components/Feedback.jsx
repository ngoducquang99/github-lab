/** Trạng thái đang tải / trống / lỗi dùng chung cho các trang. */
export function Loading({ text = 'Đang tải dữ liệu...' }) {
  return (
    <div className="page-loading">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

export function EmptyState({ icon = '📭', title = 'Chưa có dữ liệu', description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null

  return (
    <div className="alert alert-error">
      <span>⚠️ {message}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  )
}

/** Huy hiệu thể hiện trạng thái phòng / lượt thuê. */
export function StatusBadge({ status, text }) {
  return <span className={`badge badge-${status?.toLowerCase()}`}>{text || status}</span>
}