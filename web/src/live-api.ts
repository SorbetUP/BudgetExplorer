// Lightweight browser client to fetch budget data live from public APIs
// and build the LOLF tree at runtime. Falls back to static files elsewhere.

import type { BudgetNode, BudgetTree } from './types'

const ECO_API = 'https://data.economie.gouv.fr/api/explore/v2.1'
const OFGL_API = 'https://data.ofgl.fr/api'

type AnyRec = Record<string, unknown>

// Prefer known dataset IDs when available (reduces ambiguity and thin results)
const KNOWN_IDS: Record<string, Record<number, string>> = {
  depenses_dest: {
    2025: 'plf25-depenses-2025-selon-destination',
    2024: 'plf24-depenses-2024-selon-destination',
    2023: 'plf-2023-depenses-2023-selon-destination',
  },
  dest_nature: {
    2025: 'plf25-depenses-2025-du-bg-et-des-ba-selon-nomenclatures-destination-et-nature',
    2024: 'plf24-depenses-2024-du-bg-et-des-ba-selon-nomenclatures-destination-et-nature',
  },
  recettes: {
    2025: 'plf25-recettes-du-budget-general',
    2024: 'plf-2024-recettes-du-budget-general',
    2023: 'plf-2023-recettes-du-budget-general',
  },
  budget_vert: {
    2025: 'plf25-budget-vert',
    2024: 'budgetvert_plf2024_opendata_vf',
  },
  performance: {
    // Cross-year datasets (filterable by champs année)
    0: 'performance-execution-et-atteinte-de-la-cible-du-budget-de-l-etat-jusqu-au-niveau-sous-indicateur',
  },
}

// Find the best dataset id for a given year and keywords
async function findDatasetIdEco(year: number, keywords: string[]): Promise<string | null> {
  const search = [String(year), ...keywords].join(' ')
  const url = new URL(ECO_API + '/catalog/datasets')
  url.searchParams.set('search', search)
  url.searchParams.set('limit', '100')
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json().catch(() => null) as any
  const canon = (s: string) => (s || '').toLowerCase()
  const kws = keywords.map((k) => k.toLowerCase())
  let best: { id: string; score: number } | null = null
  for (const d of (data?.results ?? [])) {
    const id = d?.dataset_id || ''
    const title = d?.dataset?.metas?.title || ''
    const bag = canon(id) + ' ' + canon(title)
    const hits = kws.reduce((acc, kw) => acc + (bag.includes(kw) ? 1 : 0), 0)
    const prefer = /^plf\d{2}|^lfi\d{2}/.test(id) ? 1 : 0
    const score = hits * 10 + prefer
    if (!best || score > best.score) best = { id, score }
  }
  return best?.id ?? null
}

const cache = new Map<string, AnyRec[]>()

async function fetchAllRecords(datasetId: string): Promise<AnyRec[]> {
  if (cache.has(datasetId)) return cache.get(datasetId) as AnyRec[]
  const limit = 100
  let offset = 0
  const out: AnyRec[] = []
  for (;;) {
    const url = new URL(ECO_API + `/catalog/datasets/${datasetId}/records`)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) break
    const page = await res.json().catch(() => null) as any
    const rows: AnyRec[] = (page?.results ?? []).map((r: any) => r.record ?? r)
    out.push(...rows)
    if (rows.length < limit) break
    offset += limit
  }
  cache.set(datasetId, out)
  return out
}

// Helpers to normalize and aggregate into a tree
const toNum = (v: unknown) => {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/\s/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
const lowerKeys = (obj: AnyRec): AnyRec => {
  const o: AnyRec = {}
  for (const [k, v] of Object.entries(obj || {})) o[k.toLowerCase()] = v
  return o
}

function unwrap(rec: AnyRec): AnyRec {
  // Opendatasoft v2.1 returns { record: { fields: {...} } }
  const r = (rec && (rec as any).fields) ? (rec as any).fields : (rec && (rec as any).record && (rec as any).record.fields) ? (rec as any).record.fields : rec
  return lowerKeys(r as AnyRec)
}

function pick(r: AnyRec, ...keys: string[]): any {
  for (const k of keys) {
    if (r[k] != null && r[k] !== '' && r[k] !== 'NA') return r[k]
  }
  return undefined
}

function addAmounts<T extends AnyRec>(target: T, src: AnyRec): T {
  const add = (key: string, val: number) => {
    ;(target as any)[key] = ((target as any)[key] ?? 0) + val
  }
  // prefer explicit CP/AE; otherwise derive from PLF fields; fallback to montant/value
  let cp = toNum(src['cp'])
  let ae = toNum(src['ae'])
  if (cp === 0) {
    cp += toNum(src['credit_de_paiement'])
    cp += toNum(src['credits_de_paiement'])
    cp += toNum(src['cp_plf'])
    cp += toNum(src['credits_de_paiement_plf'])
    cp += toNum(src['credit_de_paiement_plf'])
    cp += toNum(src['creditspaiement_plf'])
    cp += toNum(src['cp_prev_fdc_adp'])
    cp += toNum(src['credits_de_paiement_prevus_sur_fdc_et_adp'])
  }
  if (ae === 0) {
    ae += toNum(src['autorisation_engagement'])
    ae += toNum(src['autorisations_engagement'])
    ae += toNum(src['ae_plf'])
    ae += toNum(src['autorisations_d_engagement_plf'])
    ae += toNum(src['ae_prev_fdc_adp'])
  }
  if (cp === 0 && ae === 0) {
    const m = toNum(src['montant']) || toNum(src['value'])
    if (m) cp = m
  }
  if (cp) add('cp', cp)
  if (ae) add('ae', ae)
  return target
}

function normalizeLOLF(rec: AnyRec) {
  const r = unwrap(rec)
  const has = (k: string) => k in r && r[k] != null && r[k] !== ''
  const ministere = pick(r, 'ministere', 'intitule_ministere', 'ministere_intitule') ?? null
  const mission = pick(r, 'intitule_mission', 'mission_intitule', 'libelle_mission', 'intitule_de_la_mission', 'mission') ?? null
  const code_mission = pick(r, 'mission_code', 'code_mission', 'code_de_la_mission', 'mission_numero', 'num_mission') ?? null
  const programme_label = pick(r, 'libelle_programme', 'intitule_programme', 'programme_intitule', 'programme_libelle', 'nom_programme')
  const programme_code = pick(r, 'programme_code', 'code_programme', 'programme_numero', 'programme', 'num_programme')
  const action_label = pick(r, 'libelle_action', 'intitule_action', 'action_intitule', 'intitule_de_l_action')
  const action_code = pick(r, 'action_code', 'code_action', 'num_action', 'action')
  const sous_action_label = pick(r, 'libelle_sousaction', 'intitule_sous_action', 'intitule_sousaction', 'sous_action_libelle')
  const sous_action_code = pick(r, 'sous_action_code', 'code_sous_action', 'sousaction_code', 'sous_action')

  let cp = 0
  let ae = 0
  if (has('cp') || has('ae')) { cp = toNum(r.cp); ae = toNum(r.ae) }
  if (cp === 0) {
    cp += toNum(r.credit_de_paiement)
    cp += toNum(r.credits_de_paiement)
    cp += toNum(r.cp_plf)
    cp += toNum(r.credits_de_paiement_plf)
    cp += toNum(r.credit_de_paiement_plf)
    cp += toNum(r.creditspaiement_plf)
    cp += toNum(r.cp_prev_fdc_adp)
    cp += toNum(r.credits_de_paiement_prevus_sur_fdc_et_adp)
  }
  if (ae === 0) {
    ae += toNum(r.autorisation_engagement)
    ae += toNum(r.autorisations_engagement)
    ae += toNum(r.ae_plf)
    ae += toNum(r.autorisations_d_engagement_plf)
    ae += toNum(r.ae_prev_fdc_adp)
  }
  if (cp === 0 && ae === 0) {
    const m = toNum(r.montant) || toNum(r.value)
    if (m) cp = m
  }

  const norm = (s: any) => (s == null ? null : String(s).trim())
  const ncode = (s: any) => (s == null ? null : String(s).trim())

  return {
    ministere,
    mission: norm(mission),
    code_mission: ncode(code_mission),
    programme: norm(programme_label ?? programme_code),
    code_programme: ncode(programme_code),
    action: norm(action_label ?? action_code),
    code_action: ncode(action_code),
    sous_action: norm(sous_action_label ?? sous_action_code),
    code_sous_action: ncode(sous_action_code),
    cp, ae,
  }
}

function buildTree(records: AnyRec[], year: number): BudgetTree {
  const root: BudgetTree = {
    year,
    name: `État`,
    level: 'etat',
    ae: 0,
    cp: 0,
    children: [],
  } as any

  const mMap = new Map<string, BudgetNode>()
  for (const rec of records) {
    const n = normalizeLOLF(rec)
    if (!n.mission || !n.programme) continue
    const mKey = `${n.code_mission || n.mission}`
    const pKey = `${mKey}::${n.code_programme || n.programme}`
    const aKey = `${pKey}::${n.code_action || n.action}`
    let m = mMap.get(mKey)
    if (!m) {
      m = { id: `mission-${mKey}`, name: n.mission!, code: n.code_mission || undefined, level: 'mission', cp: 0, ae: 0, children: [] } as any
      mMap.set(mKey, m)
      root.children!.push(m)
    }
    addAmounts(m as any, n)
    let p = (m.children || []).find((c) => c.id === `programme-${pKey}`)
    if (!p) {
      p = { id: `programme-${pKey}`, name: n.programme!, code: n.code_programme || undefined, level: 'programme', cp: 0, ae: 0, children: [] } as any
      m.children!.push(p)
    }
    addAmounts(p as any, n)
    if (n.action) {
      let a = (p.children || []).find((c) => c.id === `action-${aKey}`)
      if (!a) {
        a = { id: `action-${aKey}`, name: n.action!, code: n.code_action || undefined, level: 'action', cp: 0, ae: 0, children: [] } as any
        p.children!.push(a)
      }
      addAmounts(a as any, n)
      if (n.sous_action) {
        const sKey = `${aKey}::${n.code_sous_action || n.sous_action}`
        let s = (a.children || []).find((c) => c.id === `sousaction-${sKey}`)
        if (!s) {
          s = { id: `sousaction-${sKey}`, name: n.sous_action!, code: n.code_sous_action || undefined, level: 'sous_action', cp: 0, ae: 0 } as any
          a.children = a.children || []
          a.children.push(s)
        }
        addAmounts(s as any, n)
      }
    }
    addAmounts(root as any, n)
  }
  const byCP = (a: BudgetNode, b: BudgetNode) => (b.cp || 0) - (a.cp || 0)
  root.children?.sort(byCP)
  for (const m of root.children || []) {
    m.children?.sort(byCP)
    for (const p of m.children || []) p.children?.sort(byCP)
  }
  return root
}

export async function buildTreeBlobUrl(year: number): Promise<string | null> {
  try {
    const depensesId =
      KNOWN_IDS.depenses_dest[year] ||
      (await findDatasetIdEco(year, ['depenses', 'destination'])) ||
      (await findDatasetIdEco(year, ['depenses', 'lolf'])) ||
      null
    if (!depensesId) return null
    const recs = await fetchAllRecords(depensesId)
    if (!recs.length) return null
    const tree = buildTree(recs, year)
    const blob = new Blob([JSON.stringify(tree)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// ---- Additional live datasets (for DataExplorer) ----
export async function buildDestBlobUrl(year: number): Promise<string | null> {
  try {
    const id = KNOWN_IDS.depenses_dest[year] || (await findDatasetIdEco(year, ['depenses', 'destination'])) || (await findDatasetIdEco(year, ['depenses', 'lolf']))
    if (!id) return null
    const rows = await fetchAllRecords(id)
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export async function buildDestNatureBlobUrl(year: number): Promise<string | null> {
  try {
    const id = KNOWN_IDS.dest_nature[year] || (await findDatasetIdEco(year, ['depenses', 'nature', 'destination']))
    if (!id) return null
    const rows = await fetchAllRecords(id)
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export async function buildPerformanceBlobUrl(year: number): Promise<string | null> {
  try {
    const id = KNOWN_IDS.performance[0] || (await findDatasetIdEco(year, ['performance', 'indicateur'])) || (await findDatasetIdEco(year, ['pap', 'indicateur']))
    if (!id) return null
    const rows = await fetchAllRecords(id)
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export async function buildRevenuesBlobUrl(year: number): Promise<string | null> {
  try {
    const id = KNOWN_IDS.recettes[year] || (await findDatasetIdEco(year, ['recettes', 'budget', 'general'])) || (await findDatasetIdEco(year, ['recettes', 'etat']))
    if (!id) return null
    const rows = (await fetchAllRecords(id)).map(lowerKeys).map((row) => ({
      ...row,
      montant: toNum((row as any).montant ?? (row as any).cp ?? (row as any).ae ?? (row as any).value),
    }))
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export async function buildOfglBlobUrl(year: number): Promise<string | null> {
  try {
    const key = `ofgl:${year}`
    if (cache.has(key)) {
      const blob = new Blob([JSON.stringify(cache.get(key))], { type: 'application/json' })
      return URL.createObjectURL(blob)
    }
    const url = new URL(OFGL_API + '/records/1.0/search/')
    url.searchParams.set('dataset', 'ofgl-base-communes')
    url.searchParams.set('rows', '1000')
    url.searchParams.set('refine.annee', String(year))
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json().catch(() => null) as any
    const rows = (json?.records || []).map((r: any) => r.fields)
    cache.set(key, rows)
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export async function buildBudgetVertBlobUrl(year: number): Promise<string | null> {
  try {
    const id =
      KNOWN_IDS.budget_vert[year] ||
      (await findDatasetIdEco(year, ['budget', 'vert'])) ||
      (await findDatasetIdEco(year, ['budgetvert']))
    if (!id) return null
    const rows = (await fetchAllRecords(id)).map(lowerKeys)
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export function initialLiveApiEnabled(): boolean {
  // Priority: query param > localStorage > env
  const sp = new URLSearchParams(location.search)
  if (sp.has('live')) return ['1', 'true', 'on', 'yes'].includes(sp.get('live')!.toLowerCase())
  const ls = localStorage.getItem('liveApi')
  if (ls != null) return ls === '1' || ls === 'true'
  const env = (import.meta as any).env?.VITE_LIVE_API
  return env === '1' || env === 'true'
}
