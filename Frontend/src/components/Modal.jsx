import { useEffect } from 'react'

/**
 * Hộp thoại dùng chung.
 *
 * Khi truyền `onSubmit`, toàn bộ nội dung hộp thoại (kể cả phần footer) được bọc
 * trong một thẻ <form>. Nhờ vậy nút "Lưu" ở footer có thể đặt `type="submit"`
 * và submit đúng form của hộp thoại.
 */
function Modal({ title, children, onClose, footer, size = 'md', onSubmit }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const body = (
    <>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {onSubmit ? (
          <form className="modal-form" onSubmit={onSubmit} noValidate>
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>
  )
}

export default Modal