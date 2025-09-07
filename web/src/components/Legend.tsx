import React, { useMemo } from 'react'
import { formatMd, formatEuro, formatPercent } from '../lib/format'

type Props = {
  min: number
  max: number
  contribution?: number
  editable?: boolean
  onContributionChange?: (n: number) => void
  percent?: number
}

export function Legend({ min, max, contribution, editable = false, onContributionChange, percent }: Props) {
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min)), [min, max])
  return (
    <div className="legend-panel" role="region" aria-label="Légende des couleurs">
      <div className="legend-title">Dépense (CP)</div>
      {typeof contribution === 'number' && Number.isFinite(contribution) && (
        <div style={{ margin: '4px 0 6px 0', fontSize: 12, color: '#c8cfda', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label">Contribution estimée</span>
          {editable ? (
            <input
              type="number"
              min={0}
              step={50}
              value={Number.isFinite(contribution || 0) ? Math.round(contribution || 0) : 0}
              onChange={(e) => onContributionChange?.(Number(e.target.value))}
              style={{ width: 120 }}
            />
          ) : (
            <strong style={{ color: '#e6eaf2' }}>{formatEuro(contribution)}</strong>
          )}
          {!editable && typeof percent === 'number' && Number.isFinite(percent) && (
            <span>• soit {formatPercent(percent)}</span>
          )}
        </div>
      )}
      <div className="legend-bar" />
      {/* Tick labels intentionally removed for a cleaner look */}
    </div>
  )
}
