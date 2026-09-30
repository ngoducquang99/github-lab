import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatDate, formatMoney, toInputDate } from '../services/api'
import { EmptyState, ErrorBox, Loading } from '../components/Feedback'
import ExportButton from '../components/ExportButton'

function firstDayOfMonth() {
  const now = new Date()
  return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1))
}

function Income() {
  const [from, setFrom] = useState(firstDayOfMonth())
  const [to, setTo] = useState(toInputDate(new Date()))

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setReport(await api.getRevenue({ from, to }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const maxDayRevenue = useMemo(
    () => Math.max(...(report?.byDay || []).map((d) => d.revenue), 1),
    [report]
  )

  const maxMonthRevenue = useMemo(
    () => Math.max(...(report?.byMonth || []).map((d) => d.revenue), 1),
    [report]
  )

  function quickRange(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (days - 1))
    setFrom(toInputDate(start))
    setTo(toInputDate(end))
  }

  function quickMonth() {
    setFrom(firstDayOfMonth())
    setTo(toInputDate(new Date()))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Báo cáo thu nhập</h1>
          <p>
            Doanh thu từ {formatDate(from)} đến {formatDate(to)}
          </p>
        </div>
        <div className="page-actions">
          <ExportButton
            filename="bao-cao-thu-nhap"
            headers={['Mã hoá đơn', 'Phòng', 'Khách hàng', 'Số ngày', 'Tiền phòng', 'Tiền dịch vụ', 'Giảm giá', 'Tổng', 'Ngày lập']}
            rows={(report?.invoices || []).map((i) => [
              i.code,
              i.roomNumber,
              i.customerName,
              i.nights,
              i.roomAmount,
              i.serviceAmount,
              i.discount,
              i.totalAmount,
              formatDate(i.createdAt),
            ])}
          />
        </div>
      </div>

      {/* ===== BỘ LỌC THỜI GIAN ===== */}
      <div className="card">
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <label>Từ ngày</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Đến ngày</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="form-group">
            <label>&nbsp;</label>
            <div className="page-actions">
              <button type="button" className="btn" onClick={load}>
                🔍 Xem báo cáo
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickRange(7)}>
                7 ngày
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => quickRange(30)}>
                30 ngày
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={quickMonth}>
                Tháng này
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading text="Đang tổng hợp doanh thu..." />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : (
        report && (
          <>
            <div className="stat-grid" style={{ marginTop: 20 }}>
              <div className="stat-card">
                <div className="stat-icon teal">💰</div>
                <div>
                  <p className="stat-label">Tổng doanh thu</p>
                  <p className="stat-value">{formatMoney(report.totalRevenue)}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🧾</div>
                <div>
                  <p className="stat-label">Số hoá đơn</p>
                  <p className="stat-value">{report.totalInvoices}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏠</div>
                <div>
                  <p className="stat-label">Doanh thu tiền phòng</p>
                  <p className="stat-value">{formatMoney(report.roomRevenue)}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🛎️</div>
                <div>
                  <p className="stat-label">Doanh thu dịch vụ</p>
                  <p className="stat-value">{formatMoney(report.serviceRevenue)}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon amber">📊</div>
                <div>
                  <p className="stat-label">Trung bình mỗi hoá đơn</p>
                  <p className="stat-value">{formatMoney(report.averagePerInvoice)}</p>
                </div>
              </div>
            </div>

            {/* ===== BIỂU ĐỒ THEO NGÀY ===== */}
            <div className="card">
              <h2 className="card-title">Doanh thu theo ngày</h2>

              {report.byDay.length === 0 ? (
                <EmptyState
                  icon="📉"
                  title="Không có hoá đơn nào trong khoảng thời gian này"
                  description="Thử chọn khoảng thời gian khác."
                />
              ) : (
                <div className="bar-chart">
                  {report.byDay.map((d) => (
                    <div className="bar-item" key={d.period}>
                      <span className="bar-value">{formatMoney(d.revenue)}</span>
                      <div
                        className="bar"
                        style={{ height: `${Math.max(4, (d.revenue / maxDayRevenue) * 130)}px` }}
                        title={`${d.period}: ${formatMoney(d.revenue)} (${d.invoices} hoá đơn)`}
                      />
                      <span className="bar-label">{d.period.slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== BIỂU ĐỒ THEO THÁNG ===== */}
            {report.byMonth.length > 0 && (
              <div className="card">
                <h2 className="card-title">Doanh thu theo tháng</h2>

                <div className="bar-chart">
                  {report.byMonth.map((m) => (
                    <div className="bar-item" key={m.period}>
                      <span className="bar-value">{formatMoney(m.revenue)}</span>
                      <div
                        className="bar"
                        style={{ height: `${Math.max(4, (m.revenue / maxMonthRevenue) * 130)}px` }}
                        title={`${m.period}: ${formatMoney(m.revenue)}`}
                      />
                      <span className="bar-label">{m.period}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== DANH SÁCH HOÁ ĐƠN ===== */}
            <div className="card">
              <h2 className="card-title">Chi tiết hoá đơn ({report.invoices.length})</h2>

              {report.invoices.length === 0 ? (
                <EmptyState icon="🧾" title="Chưa có hoá đơn nào" />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã HĐ</th>
                        <th>Phòng</th>
                        <th>Khách hàng</th>
                        <th className="text-center">Số ngày</th>
                        <th className="text-right">Tiền phòng</th>
                        <th className="text-right">Dịch vụ</th>
                        <th className="text-right">Giảm giá</th>
                        <th className="text-right">Tổng</th>
                        <th>Ngày lập</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.invoices.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.code}</strong>
                          </td>
                          <td>{i.roomNumber}</td>
                          <td>{i.customerName}</td>
                          <td className="text-center">{i.nights}</td>
                          <td className="text-right">{formatMoney(i.roomAmount)}</td>
                          <td className="text-right">{formatMoney(i.serviceAmount)}</td>
                          <td className="text-right">{formatMoney(i.discount)}</td>
                          <td className="text-right money">{formatMoney(i.totalAmount)}</td>
                          <td>{formatDate(i.createdAt)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan="7">TỔNG CỘNG</td>
                        <td className="text-right money">{formatMoney(report.totalRevenue)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  )
}

export default Income