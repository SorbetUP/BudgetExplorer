import React, { useMemo } from 'react'
import { formatMd } from '../lib/format'

type Props = {
  min: number
  max: number
}

export function Legend({ min, max }: Props) {
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min)), [min, max])
  return (
    <div className="legend-panel" role="region" aria-label="Légende des couleurs">
      <div className="legend-title">Dépense (CP)</div>
      <div className="legend-bar" />
      <div className="legend-ticks">
        {ticks.map((v, i) => (
          <span key={i}>{formatMd(v)}</span>
        ))}
      </div>
    </div>
  )
}

