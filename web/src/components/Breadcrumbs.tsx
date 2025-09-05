import React from 'react'

type Props = { items: string[]; onBack?: () => void }

export function Breadcrumbs({ items }: Props) {
  return (
    <div className="breadcrumbs" aria-label="Fil d'Ariane">
      {items.map((x, i) => (
        <span key={i}>{x}{i < items.length - 1 ? ' > ' : ''}</span>
      ))}
    </div>
  )
}
