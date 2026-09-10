/**
 * RFC 4180 compliant CSV Export utility with UTF-8 BOM for Microsoft Excel / Google Sheets compatibility.
 */

export interface CsvColumn<T> {
  key: keyof T | ((row: T) => string | number | boolean | null | undefined)
  label: string
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }
  const str = String(value)
  // If string contains quotes, commas, or newlines, quote it and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

export function exportToCsv<T>(
  filenameBase: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  if (typeof window === "undefined") return

  const headerRow = columns.map((c) => escapeCsvCell(c.label)).join(",")

  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const val = typeof col.key === "function" ? col.key(row) : row[col.key]
        return escapeCsvCell(val)
      })
      .join(",")
  })

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens it with correct UTF-8 encoding
  const csvContent = "\uFEFF" + [headerRow, ...rows].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `${filenameBase}_${timestamp}.csv`

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
