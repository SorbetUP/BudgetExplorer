import React from 'react'
import { formatEuro, formatPercent } from '../lib/format'

type Props = {
  total: number
  selectedAmount: number
  selectedPercent: number
  myContribution?: number
}

export function StatsBar({ total, selectedAmount, selectedPercent, myContribution = 0 }: Props) {
  return (
    <div className="statsbar" role="region" aria-label="Résumé">
      <div className="card">
        <div className="label">Budget total (CP)</div>
        <div className="value">{formatEuro(total)}</div>
      </div>
      <div className="card">
        <div className="label">Sélection</div>
        <div className="value">{formatEuro(selectedAmount)}</div>
      </div>
      <div className="card">
        <div className="label">Part du total</div>
        <div className="value">{formatPercent(Number.isFinite(selectedPercent) ? selectedPercent : 0)}</div>
      </div>
      <div className="card">
        <div className="label">Votre contribution</div>
        <div className="value">{formatEuro(myContribution)}</div>
      </div>
    </div>
  )
}

