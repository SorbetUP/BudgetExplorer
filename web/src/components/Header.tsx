import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  view: 'me' | 'data'
  onViewChange: (v: 'me' | 'data') => void
  year: number
  onYearChange: (y: number) => void
  salaryNet: number
  onSalaryNetChange: (n: number) => void
  liveApi: boolean
  onToggleLiveApi: (v: boolean) => void
}

type SearchItem = { name: string; code?: string; level: string }

function norm(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function Header({ view, onViewChange, year, onYearChange, salaryNet, onSalaryNetChange, liveApi, onToggleLiveApi }: Props) {
  const [index, setIndex] = useState<SearchItem[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const onIndex = (e: any) => {
      const items = (e?.detail?.items ?? []) as SearchItem[]
      if (Array.isArray(items)) setIndex(items)
    }
    // @ts-ignore
    window.addEventListener('budget:index', onIndex as EventListener)
    return () => {
      // @ts-ignore
      window.removeEventListener('budget:index', onIndex as EventListener)
    }
  }, [])

  const suggestions = useMemo(() => {
    const nq = norm(q.trim())
    if (!nq) return [] as SearchItem[]
    const scored = index.map((it) => {
      const nc = norm(it.code || '')
      const nn = norm(it.name)
      let score = 0
      if (nc === nq) score = 100
      else if (nc.startsWith(nq)) score = 85
      else if (nn.startsWith(nq)) score = 70
      else if (nc.includes(nq)) score = 55
      else if (nn.includes(nq)) score = 40
      return { it, score }
    }).filter((x) => x.score > 0)
    scored.sort((a, b) => b.score - a.score || (a.it.name.length - b.it.name.length))
    return scored.slice(0, 8).map((x) => x.it)
  }, [q, index])

  useEffect(() => { setActive(0) }, [suggestions.length])
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
      <div className="brand" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          ref={boxRef}
          type="search"
          placeholder="Rechercher mission / programme / code…"
          aria-label="Rechercher"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min((suggestions.length || 1) - 1, i + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
            else if (e.key === 'Enter') {
              // Try suggestion first, fallback to raw query
              const pick = suggestions[active]
              let query = pick?.name || pick?.code || q.trim()
              
              // If no suggestion selected and we have suggestions, use the first one
              if (!pick && suggestions.length > 0) {
                query = suggestions[0].name || suggestions[0].code || q.trim()
              }
              
              if (query) {
                setQ(query)
                if (boxRef.current) boxRef.current.value = query
                ;(window as any).__pendingSearchQuery = query
                if (view === 'me') {
                  window.dispatchEvent(new CustomEvent('budget:search', { detail: { query } }))
                } else {
                  onViewChange('me' as any)
                }
              }
              setOpen(false)
              ;(e.currentTarget as HTMLInputElement).blur()
            }
          }}
          style={{ minWidth: 260, width: 'clamp(240px, 32vw, 420px)' }}
        />
        {open && suggestions.length > 0 && (
          <div className="suggest" role="listbox" aria-label="Suggestions">
            {suggestions.map((s, i) => (
              <div
                key={`${s.code ?? ''}-${s.name}-${i}`}
                className={`item ${i === active ? 'active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); }}
                onClick={() => {
                  const query = s.name || s.code || ''
                  setQ(query)
                  if (boxRef.current) boxRef.current.value = query
                  ;(window as any).__pendingSearchQuery = query
                  if (view === 'me') {
                    window.dispatchEvent(new CustomEvent('budget:search', { detail: { query } }))
                  } else {
                    onViewChange('me' as any)
                  }
                  setOpen(false)
                  boxRef.current?.blur()
                }}
              >
                <span className="code">{s.code ? `[${s.code}]` : ''}</span> {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="nav">
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
      <button
        className={`chip source ${liveApi ? 'active' : ''}`}
        aria-pressed={liveApi}
        title="Basculer source des données (API live / JSON statique)"
        onClick={() => onToggleLiveApi(!liveApi)}
      >
        Source: {liveApi ? 'API live' : 'JSON'}
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {view === 'me' && (
          <div className="salary">
            <span className="label">Contribution estimée</span>{' '}
            <input
              type="number"
              min={0}
              step={50}
              value={salaryNet}
              onChange={(e) => onSalaryNetChange(Number(e.target.value))}
            />
          </div>
        )}
        <div className="year">
          <span className="label">Année</span>{' '}
          <select aria-label="Année" value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
            {[2023, 2024, 2025].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
