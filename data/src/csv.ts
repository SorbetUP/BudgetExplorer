export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  // Detect delimiter
  const first = lines[0]
  const delim = first.includes(';') && (!first.includes(',') || first.split(';').length > first.split(',').length) ? ';' : ','
  const rows: string[][] = []
  for (const line of lines) rows.push(splitLine(line, delim))
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cols) => {
    const o: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) o[headers[i]] = cols[i] ?? ''
    return o
  })
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ
    } else if (!inQ && ch === delim) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

