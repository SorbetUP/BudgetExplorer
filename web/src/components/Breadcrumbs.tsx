import React from 'react'

type Props = { items: string[]; onBack?: () => void }

export function Breadcrumbs({ items, onBack }: Props) {
  return (
    <div className="breadcrumbs" aria-label="Fil d'Ariane">
      <a onClick={onBack} tabIndex={0} role="button" aria-label="Remonter">←</a>
      {items.map((x, i) => (
        <span key={i}>{x}{i < items.length - 1 ? ' > ' : ''}</span>
      ))}
    </div>
  )
}

