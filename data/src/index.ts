import { fetchPagedRecords } from './api'
import { discoverDatasets, type CatalogTrace } from './catalog'
import { normalizeRow, type NormalizedRow } from './normalize'
import { buildTree } from './lolf'
import { normalizeRevenues } from './revenues'
import { normalizeGreen } from './green'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseCSV } from './csv'
import { probeFields, buildYearWhere } from './probe'

export type RunOptions = {
  year: number
  outDir: string
  domain?: string
}

export async function run({ year, outDir, domain }: RunOptions) {
  const { spending, revenues, green, trace } = await discoverDatasets(year, domain)

  const outputs: string[] = []
  const base = resolve(outDir)
  await mkdir(base, { recursive: true })

  // Write catalog trace
  await writeJSON(resolve(base, `catalog_${year}.json`), trace)
  outputs.push(`catalog_${year}.json`)

  let wroteTree = false
  if (spending) {
    try {
      const fields = await probeFields(trace.domain, spending)
      const where = buildYearWhere(year, fields)
      const recs = await fetchPagedRecords<{ [k: string]: unknown }>({
        domain: trace.domain,
        dataset: spending,
        limit: 100,
        where,
      })
      const normalized: NormalizedRow[] = recs.map((r) => normalizeRow(r.fields))
      if (normalized.length > 0) {
        const tree = buildTree(normalized, year)
        tree.sources = { spendingDatasetId: spending, license: 'Licence Ouverte 2.0' }
        await writeJSON(resolve(base, `state_budget_tree_${year}.json`), tree)
        outputs.push(`state_budget_tree_${year}.json`)
        wroteTree = true
      }
    } catch {}
  }

  if (!wroteTree) {
    // CSV fallback (committed sample or official mirror)
    const csvPath = resolve(process.cwd(), `assets/fallback/state_spending_${year}.csv`)
    try {
      const txt = await readFile(csvPath, 'utf8')
      const rows = parseCSV(txt)
      const normalized: NormalizedRow[] = rows.map((r) => normalizeRow(r))
      const tree = buildTree(normalized, year)
      tree.sources = { spendingDatasetId: 'fallback_csv', license: 'Licence Ouverte 2.0' }
      await writeJSON(resolve(base, `state_budget_tree_${year}.json`), tree)
      outputs.push(`state_budget_tree_${year}.json`)
      wroteTree = true
    } catch {}
  }

  let wroteRev = false
  if (revenues) {
    try {
      const fields = await probeFields(trace.domain, revenues)
      const where = buildYearWhere(year, fields)
      const recs = await fetchPagedRecords<Record<string, unknown>>({
        domain: trace.domain,
        dataset: revenues,
        limit: 100,
        where,
      })
      const rows = recs.map((r) => r.fields)
      const list = normalizeRevenues(rows)
      if (list.length > 0) {
        await writeJSON(resolve(base, `state_revenues_${year}.json`), list)
        outputs.push(`state_revenues_${year}.json`)
        wroteRev = true
      }
    } catch {}
  }
  if (!wroteRev) {
    try {
      const txt = await readFile(resolve(process.cwd(), `assets/fallback/state_revenues_${year}.csv`), 'utf8')
      const rows = parseCSV(txt)
      const list = normalizeRevenues(rows as any)
      await writeJSON(resolve(base, `state_revenues_${year}.json`), list)
      outputs.push(`state_revenues_${year}.json`)
      wroteRev = true
    } catch {}
  }

  if (green) {
    const recs = await fetchPagedRecords<Record<string, unknown>>({
      domain: trace.domain,
      dataset: green,
      limit: 100,
    })
    const rows = recs.map((r) => r.fields)
    const list = normalizeGreen(rows)
    await writeJSON(resolve(base, `budget_vert_${year}.json`), list)
    outputs.push(`budget_vert_${year}.json`)
  }

  // Fallbacks (CSV/XLS) intentionally omitted for brevity; hooks could be added here.

  return { outputs, trace }
}

async function writeJSON(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8')
}
