/** Nút xuất danh sách ra file CSV (mở được bằng Excel). */
function ExportButton({ filename, headers, rows, label = 'Xuất CSV' }) {
  function handleExport() {
    const escape = (value) => {
      const text = value === null || value === undefined ? '' : String(value)
      return `"${text.replace(/"/g, '""')}"`
    }

    const lines = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ]

    // \uFEFF giúp Excel nhận đúng tiếng Việt
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={handleExport} disabled={!rows?.length}>
      ⬇️ {label}
    </button>
  )
}

export default ExportButton