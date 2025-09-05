import { fetchPagedRecords } from './api'

export async function probeFields(domain: string, dataset: string): Promise<string[]> {
  try {
    const recs = await fetchPagedRecords<{ [k: string]: unknown }>({ domain, dataset, limit: 1 })
    const fields = Object.keys(recs[0]?.fields || {})
    return fields.map((f) => f.toLowerCase())
  } catch {
    return []
  }
}

export function buildYearWhere(year: number, fields: string[]): string | undefined {
  const candidates = ['annee', 'exercice', 'annee_budgetaire', 'year']
  const found = candidates.find((k) => fields.includes(k))
  if (!found) return undefined
  // Opendatasoft SQL dialect expects quoting for strings; years are numbers
  return `${found} = ${year}`
}

