import React, { useEffect, useMemo, useState } from 'react'
import type { BudgetTree, BudgetNode } from '../types'
import { Continents } from '../components/Continents'
import { Legend } from '../components/Legend'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { withPercents, collapseSingleChild, findPathByQuery, flattenNodes } from '../lib/tree-utils'
import { estimateIRFromNetMonthly } from '../lib/tax'
// import { StatsBar } from '../components/StatsBar'

type Props = { treeUrl: string; salaryNetMonthly: number; onSalaryNetChange: (n: number) => void }

export function MyContributionView({ treeUrl, salaryNetMonthly, onSalaryNetChange }: Props) {
  const [tree, setTree] = useState<BudgetTree | null>(null)
  const [path, setPath] = useState<BudgetNode[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(treeUrl)
        if (!res.ok) throw new Error('not ok')
        const json = await res.json()
        if (!cancelled) {
          const ann = withPercents(json as any) as any
          setTree(ann)
          setPath([ann as unknown as BudgetNode])
        }
      } catch {
        try {
          const res2 = await fetch('data/sample_state_budget_tree_2025.json')
          if (!res2.ok) return
          const json2 = await res2.json()
          if (!cancelled) {
            const ann = withPercents(json2 as any) as any
            setTree(ann)
            setPath([ann as unknown as BudgetNode])
          }
        } catch {}
      }
    }
    load()
    return () => { cancelled = true }
  }, [treeUrl])

  // Provide search index to the header when tree is ready
  useEffect(() => {
    if (!tree) return
    const items = flattenNodes(tree).map((x) => ({ name: x.name, code: x.code, level: x.level }))
    // @ts-ignore
    window.dispatchEvent(new CustomEvent('budget:index', { detail: { items } }))
  }, [tree])

  // Process any pending search query set before switching to this view or while data was loading
  useEffect(() => {
    if (!tree) return
    const anyWin: any = window as any
    const pending = (anyWin.__pendingSearchQuery || '').trim()
    if (pending) {
      const p = findPathByQuery(tree, pending)
      if (p && p.length) {
        // Zoom on parent so we can see the found element among its siblings
        const parentPath = p.length > 1 ? p.slice(0, -1) : p
        setPath(parentPath)
      }
      anyWin.__pendingSearchQuery = ''
    }
  }, [tree])

  useEffect(() => {
    const handler = () => setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))
    // @ts-ignore custom event name
    window.addEventListener('budget:back', handler as EventListener)
    const onSearch = (e: any) => {
      const q = (e?.detail?.query ?? '').trim()
      
      if (!tree) {
        // Save the search query to be executed once data is loaded
        ;(window as any).__pendingSearchQuery = q
        return
      }
      
      const p = findPathByQuery(tree, q)
      if (p && p.length) {
        // Zoom on parent so we can see the found element among its siblings
        const parentPath = p.length > 1 ? p.slice(0, -1) : p
        setPath(parentPath)
      }
    }
    // @ts-ignore
    window.addEventListener('budget:search', onSearch as EventListener)
    return () => {
      // @ts-ignore
      window.removeEventListener('budget:back', handler as EventListener)
      // @ts-ignore
      window.removeEventListener('budget:search', onSearch as EventListener)
    }
  }, [tree])

  const annotated = tree
  const focusAnnotated = collapseSingleChild((path.length ? path[path.length - 1] : tree) as BudgetNode | null)
  const myIR = useMemo(() => estimateIRFromNetMonthly(salaryNetMonthly, 1), [salaryNetMonthly])

  // Hide root label from breadcrumbs; only show deeper path
  const breadcrumbs = useMemo(() => (path.length > 1 ? path.slice(1).map((n) => n.name) : []), [path])

  // Keep hook order consistent across renders and compute breadcrumbs position
  useEffect(() => {
    const exploring = (path.length > 1)
    document.body.classList.toggle('exploring', exploring)
    document.body.classList.toggle('me-root', !exploring)
    const updateCrumbsPos = () => {
      const header = document.querySelector('.header') as HTMLElement | null
      const brand = document.querySelector('.header .brand') as HTMLElement | null
      const nav = document.querySelector('.header .nav') as HTMLElement | null
      const source = document.querySelector('.header .source') as HTMLElement | null
      const year = document.querySelector('.header .year') as HTMLElement | null
      if (!header || !brand) return
      const hr = header.getBoundingClientRect()
      const br = brand.getBoundingClientRect()
      const nr = nav?.offsetWidth ? nav.getBoundingClientRect() : null
      const sr = source?.offsetWidth ? source.getBoundingClientRect() : null
      const yr = year?.getBoundingClientRect()
      const GAP = 12
      const MIN = 180
      let left = Math.max(8, Math.max(br.right, nr ? nr.right : br.right, sr ? sr.right : br.right) + GAP)
      let rightBound: number
      if (yr) rightBound = yr.left - 8
      else rightBound = hr.right - 200
      const available = rightBound - left
      if (available < MIN) left = Math.max(8, rightBound - MIN)
      const max = Math.max(60, rightBound - left)
      document.body.style.setProperty('--crumbs-left', left + 'px')
      document.body.style.setProperty('--crumbs-top', '10px')
      document.body.style.setProperty('--crumbs-max', `${Math.max(100, Math.floor(max))}px`)
    }
    updateCrumbsPos()
    window.addEventListener('resize', updateCrumbsPos)
    return () => {
      document.body.classList.remove('exploring')
      document.body.classList.remove('me-root')
      window.removeEventListener('resize', updateCrumbsPos)
    }
  }, [path.length])

  if (!annotated || !focusAnnotated) return <div>Chargement…</div>

  const percent = annotated && focusAnnotated ? focusAnnotated.cp / annotated.cp : 0
  const myContribution = myIR * percent
  const children = (focusAnnotated.children || []).filter((c) => (c.cp || 0) > 0)
  const minCp = children.length ? Math.min(...children.map((c) => c.cp || 0)) : focusAnnotated.cp || 0
  const maxCp = children.length ? Math.max(...children.map((c) => c.cp || 0)) : focusAnnotated.cp || 0


  return (
    <div className="content">
      <div className="graph">
        {breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        {focusAnnotated && (
          <Continents
            data={focusAnnotated as BudgetNode}
            onSelect={(n) => setPath((p)=>[...p, n])}
            onBack={() => setPath((p)=> (p.length>1? p.slice(0,-1): p))}
          />
        )}
        <Legend
          min={minCp}
          max={maxCp}
          contribution={path.length > 1 ? myContribution : salaryNetMonthly}
          percent={path.length > 1 ? percent : undefined}
          editable={path.length === 1}
          onContributionChange={onSalaryNetChange}
        />
      </div>
    </div>
  )
}
