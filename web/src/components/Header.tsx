import React from 'react'

type Props = {
  view: 'budget' | 'me' | 'data'
  onViewChange: (v: 'budget' | 'me' | 'data') => void
  year: number
  onYearChange: (y: number) => void
  salaryNet: number
  onSalaryNetChange: (n: number) => void
}

export function Header({ view, onViewChange, year, onYearChange, salaryNet, onSalaryNetChange }: Props) {
  return (
    <div className="header" role="banner">
      <button
        className="chip back"
        aria-label="Retour"
        title="Retour"
        onClick={() => window.dispatchEvent(new CustomEvent('budget:back'))}
        style={{ marginRight: 8 }}
      >
        ←
      </button>
      <strong className="brand">BudgetExplorer</strong>
      <div className="nav">
        <button
          className={`chip ${view === 'budget' ? 'active' : ''}`}
          onClick={() => onViewChange('budget' as any)}
          aria-pressed={view === 'budget'}
        >
          Vue: Budget total
        </button>
        <button
          className={`chip ${view === 'me' ? 'active' : ''}`}
          onClick={() => onViewChange('me' as any)}
          aria-pressed={view === 'me'}
        >
          Vue: Ma contribution
        </button>
        <button
          className={`chip ${view === 'data' ? 'active' : ''}`}
          onClick={() => onViewChange('data' as any)}
          aria-pressed={view === 'data'}
        >
          Données
        </button>
      </div>
      <div>
        <span className="label">Année</span>{' '}
        <select aria-label="Année" value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
          {[2023, 2024, 2025].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <span className="label">Salaire net mensuel (€)</span>{' '}
        <input
          type="number"
          min={0}
          step={50}
          value={salaryNet}
          onChange={(e) => onSalaryNetChange(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
