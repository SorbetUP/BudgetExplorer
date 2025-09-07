import { fetchCatalog, type ODSCatalogDataset } from './api'

export type CatalogTrace = {
  year: number
  domain: string
  searched: string[]
  candidates: Array<{ id: string; title?: string; score: number }>
  chosen: {
    spending?: string
    revenues?: string
    green?: string
  }
}

const DEFAULT_DOMAIN = 'https://data.economie.gouv.fr'

function wordHits(text: string, words: string[]): number {
  const hay = text.toLowerCase()
  let score = 0
  for (const w of words) {
    const re = new RegExp(`\\b${w.toLowerCase()}\\b`, 'g')
    score += hay.match(re)?.length || 0
  }
  return score
}

function idYearScore(id: string, yearYY: string): number {
  const m = id.match(/\b(plf|lfi)(\d{2})\b/i)
  if (!m) return 0
  const yy = m[2]
  return yy === yearYY ? 20 : -30
}

function scoreDataset(ds: ODSCatalogDataset, year: number, keywords: string[]): number {
  const id = ds.dataset_id || ''
  const title = (ds.title || '').toLowerCase()
  const yy = String(year % 100).padStart(2, '0')
  const hay = (id + ' ' + title).toLowerCase()

  let score = 0
  // strong preference for the target year
  if (hay.includes(String(year))) score += 12
  if (new RegExp(`(^|\b|[-_])${yy}(\b|[-_])`).test(hay)) score += 6
  score += idYearScore(id.toLowerCase(), yy)

  // domain-specific signals
  if (/depens/.test(hay)) score += 6
  if (/destination/.test(hay)) score += 6
  if (/lolf/.test(hay)) score += 4
  if (/mission|programme|action/.test(hay)) score += 3

  // general keyword hits
  score += wordHits(hay, keywords)

  // penalize obviously wrong years
  const otherYear = hay.match(/\b(20\d{2})\b/)
  if (otherYear && otherYear[1] !== String(year)) score -= 8

  return score
}

export async function discoverDatasets(
  year: number,
  domain = DEFAULT_DOMAIN
): Promise<{ spending?: string; revenues?: string; green?: string; trace: CatalogTrace }> {
  const searched: string[] = []
  const keywordsBase = ['depenses', 'destination', 'budget', 'lolf', 'mission', 'programme']
  const queries = [
    `${year} depenses destination`,
    `${year} budget lolf`,
    `${year} recettes`,
    `${year} budget vert`,
    `plf${year % 100} budget vert`,  // PLF25 format
    `plf-${year}-budget-vert`,       // plf-2025-budget-vert format
    `performance-de-la-depense`,     // Performance data
  ]

  const candidates: Array<{ id: string; title?: string; score: number }> = []
  for (const q of queries) {
    searched.push(q)
    const res = await fetchCatalog(domain, { search: q })
    for (const ds of res.results) {
      const score = scoreDataset(ds, year, keywordsBase)
      if (score > 0) {
        candidates.push({ id: ds.dataset_id, title: ds.title, score })
      }
    }
  }

  // Deduplicate by id keeping highest score
  const byId = new Map<string, { id: string; title?: string; score: number }>()
  for (const c of candidates) {
    const prev = byId.get(c.id)
    if (!prev || c.score > prev.score) byId.set(c.id, c)
  }
  const uniq = [...byId.values()].sort((a, b) => b.score - a.score)

  const choose = (predicate: (c: { id: string; title?: string }) => boolean) =>
    uniq.find(predicate)?.id

  let spending = choose((c) => {
    const hay = (c.id + ' ' + (c.title || '')).toLowerCase()
    if (!/(depens|destination)/.test(hay)) return false
    // must look like the requested year
    const yy = String(year % 100).padStart(2, '0')
    const hasYear = hay.includes(String(year)) || new RegExp(`(^|\b|[-_])${yy}(\b|[-_])`).test(hay)
    return hasYear
  })
  // Relaxed fallback: if nothing, pick best depenses/destination regardless of year
  if (!spending) spending = choose((c) => /(depens|destination|lolf)/i.test((c.id + ' ' + (c.title || '')).toLowerCase()))
  const revenues = choose((c) => /recett|revenu|fiscal|impo/i.test(c.id + ' ' + (c.title || '')))
  // Enhanced green budget detection - prefer PLF datasets
  let green = choose((c) => {
    const hay = (c.id + ' ' + (c.title || '')).toLowerCase()
    if (/plf.*budget.*vert/i.test(hay)) return true
    return /vert|green/i.test(hay)
  })
  if (!green) green = choose((c) => /vert|green/i.test(c.id + ' ' + (c.title || '')))

  const trace: CatalogTrace = {
    year,
    domain,
    searched,
    candidates: uniq,
    chosen: { spending, revenues, green },
  }

  return { spending, revenues, green, trace }
}
