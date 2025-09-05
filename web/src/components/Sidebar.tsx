import React from 'react'
import { formatEuro, formatMd, formatPercent } from '../lib/format'

type Props = {
  title: string
  cp: number
  percent: number
  myContribution?: number
  sources?: { spendingDatasetId?: string; license?: string }
  rootTotal?: number
  childrenBreakdown?: Array<{ code?: string; name: string; cp: number }>
}

export function Sidebar({ title, cp, percent, myContribution = 0, sources, rootTotal, childrenBreakdown }: Props) {
  const total = rootTotal || cp || 1
  return (
    <aside className="sidebar" aria-label="Détails">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div>
        <div><span className="label">Montant</span><div>{formatMd(cp || 0)}</div></div>
        <div><span className="label">Part du total</span><div>{formatPercent(Number.isFinite(percent) ? percent : 0)}</div></div>
        <div><span className="label">Votre contribution</span><div>{formatEuro(myContribution)}</div></div>
      </div>
      {childrenBreakdown && childrenBreakdown.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="label" style={{ marginBottom: 6 }}>Principaux postes</div>
          {childrenBreakdown.slice(0, 12).map((c, i) => {
            const p = (c.cp || 0) / total
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{c.code ? `[${c.code}] ` : ''}{c.name}</span>
                  <span>{formatPercent(p)} • {formatEuro(c.cp)}</span>
                </div>
                <div style={{ height: 6, background: '#1f2937', borderRadius: 4 }}>
                  <div style={{ width: `${Math.min(100, p * 100)}%`, height: '100%', background: '#38bdf8', borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {(sources?.spendingDatasetId || sources?.license) && (
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sources?.spendingDatasetId && (
            <span className="badge">
              <span>Source</span>
              <a href={`https://data.economie.gouv.fr/explore/dataset/${sources.spendingDatasetId}/information/`} target="_blank" rel="noreferrer">
                {sources.spendingDatasetId}
              </a>
            </span>
          )}
          {sources?.license && <span className="badge">Licence: {sources.license}</span>}
        </div>
      )}
      <p className="label">Astuce: clic long pour remonter.</p>
    </aside>
  )
}
