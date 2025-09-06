import React, { useEffect, useMemo, useState } from 'react'

type Paths = {
  destUrl: string
  destNatureUrl: string
  performanceUrl: string
  ofglUrl: string
  revenuesUrl?: string
  greenUrl?: string
}

type AnyRow = Record<string, unknown>

export function DataExplorerView({ destUrl, destNatureUrl, performanceUrl, ofglUrl, revenuesUrl, greenUrl }: Paths) {
  const [dest, setDest] = useState<AnyRow[] | null>(null)
  const [destNature, setDestNature] = useState<AnyRow[] | null>(null)
  const [performance, setPerformance] = useState<AnyRow[] | null>(null)
  const [ofgl, setOfgl] = useState<AnyRow[] | null>(null)
  const [revenues, setRevenues] = useState<AnyRow[] | null>(null)
  const [green, setGreen] = useState<AnyRow[] | null>(null)

  // Ensure header nav is visible when entering Data view
  useEffect(() => {
    document.body.classList.remove('exploring')
    document.body.classList.remove('me-root')
  }, [])

  useEffect(() => {
    let cancel = false
    const load = async () => {
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url)
          if (!res.ok) return null
          const json = await res.json()
          return Array.isArray(json) ? json : null
        } catch {
          return null
        }
      }
      const [a, b, c, d, e, f] = await Promise.all([
        safeFetch(destUrl),
        safeFetch(destNatureUrl),
        safeFetch(performanceUrl),
        safeFetch(ofglUrl),
        revenuesUrl ? safeFetch(revenuesUrl) : Promise.resolve(null),
        greenUrl ? safeFetch(greenUrl) : Promise.resolve(null),
      ])
      if (!cancel) {
        setDest(a)
        setDestNature(b)
        setPerformance(c)
        setOfgl(d)
        setRevenues(e)
        setGreen(f)
      }
    }
    load()
    return () => { cancel = true }
  }, [destUrl, destNatureUrl, performanceUrl, ofglUrl, revenuesUrl, greenUrl])

  const sections = useMemo(() => ([
    { key: 'dest', title: 'Dépenses (destination)', data: dest, href: destUrl },
    { key: 'destNature', title: 'Destination × nature', data: destNature, href: destNatureUrl },
    { key: 'performance', title: 'Performance (indicateurs)', data: performance, href: performanceUrl },
    { key: 'ofgl', title: 'Finances locales (communes OFGL)', data: ofgl, href: ofglUrl },
    { key: 'revenues', title: 'Recettes du budget général', data: revenues, href: revenuesUrl || '' },
    { key: 'green', title: 'Budget vert', data: green, href: greenUrl || '' },
  ]), [dest, destNature, performance, ofgl, revenues, green, destUrl, destNatureUrl, performanceUrl, ofglUrl, revenuesUrl, greenUrl])

  return (
    <div className="content">
      <div className="graph">
        <div className="statsbar" role="region" aria-label="Jeux de données">
          {sections.map((s) => (
            <div className="card" key={s.key}>
              <div className="label">{s.title}</div>
              <div className="value">{s.data ? `${s.data.length.toLocaleString('fr-FR')} lignes` : 'Chargement…'}</div>
              <div style={{ marginTop: 6 }}>
                <a href={s.href} target="_blank" rel="noreferrer">Télécharger JSON</a>
              </div>
            </div>
          ))}
        </div>

        {sections.map((s) => (
          <div key={s.key} style={{ padding: '12px 12px 0' }}>
            <div className="label" style={{ display: 'block', marginBottom: 6 }}>{s.title} — aperçu (max 15)</div>
            {s.data ? <MiniTable rows={s.data.slice(0, 15)} /> : <div>Chargement…</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTable({ rows }: { rows: AnyRow[] }) {
  if (!rows.length) return <div style={{ color: 'var(--muted)' }}>Aucune donnée</div>
  // Collect columns by union of keys from sample
  const sampleCols = Array.from(rows.reduce<Set<string>>((acc, r) => {
    Object.keys(r || {}).forEach((k) => acc.add(k))
    return acc
  }, new Set<string>())).slice(0, 8) // keep it readable

  return (
    <div className="tablelike">
      <div className="tr th">
        {sampleCols.map((c) => (
          <div className="td" key={c} title={c}>{c}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div className="tr" key={i}>
          {sampleCols.map((c) => (
            <div className="td" key={c} title={formatCell(r[c])}>{formatCell(r[c])}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v)
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80)
  const s = String(v)
  return s.length > 80 ? s.slice(0, 77) + '…' : s
}
