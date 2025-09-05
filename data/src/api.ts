export type ODSCatalogDataset = {
  dataset_id: string
  title?: string
  description?: string
  metadata?: Record<string, unknown>
}

export type ODSRecord<T = any> = {
  id: string
  fields: T
}

export type FetchPagedOptions = {
  domain: string
  dataset: string
  select?: string
  where?: string
  orderBy?: string
  limit?: number
  pauseMs?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchCatalog(
  domain: string,
  params: Record<string, string>
): Promise<{ results: ODSCatalogDataset[] }> {
  const searchParams = new URLSearchParams(params)
  const url = `${domain.replace(/\/$/, '')}/api/explore/v2.1/catalog/datasets?${searchParams.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`)
  return res.json()
}

export async function fetchPagedRecords<T = any>({
  domain,
  dataset,
  select,
  where,
  orderBy,
  limit = 100,
  pauseMs = 120,
}: FetchPagedOptions): Promise<ODSRecord<T>[]> {
  const results: ODSRecord<T>[] = []
  let offset = 0
  for (;;) {
    const sp = new URLSearchParams()
    sp.set('limit', String(limit))
    sp.set('offset', String(offset))
    if (select) sp.set('select', select)
    if (where) sp.set('where', where)
    if (orderBy) sp.set('order_by', orderBy)
    const url = `${domain.replace(/\/$/, '')}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(
      dataset
    )}/records?${sp.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Records fetch failed: ${res.status}`)
    const json = (await res.json()) as { results: ODSRecord<T>[] }
    const batch = json.results || []
    results.push(...batch)
    if (batch.length < limit) break
    offset += limit
    if (pauseMs) await sleep(pauseMs)
  }
  return results
}

export async function downloadCSV(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CSV download failed: ${res.status}`)
  return res.text()
}

