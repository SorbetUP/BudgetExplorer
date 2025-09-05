import React, { useEffect, useMemo, useState } from 'react'
import type { BudgetTree, BudgetNode } from '../types'
import { Continents } from '../components/Continents'
import { Legend } from '../components/Legend'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { withPercents, collapseSingleChild } from '../lib/tree-utils'
import { estimateIRFromNetMonthly } from '../lib/tax'
import { StatsBar } from '../components/StatsBar'

type Props = { treeUrl: string; salaryNetMonthly: number }

export function MyContributionView({ treeUrl, salaryNetMonthly }: Props) {
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

  useEffect(() => {
    const handler = () => setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))
    // @ts-ignore custom event name
    window.addEventListener('budget:back', handler as EventListener)
    return () => {
      // @ts-ignore
      window.removeEventListener('budget:back', handler as EventListener)
    }
  }, [])

  const annotated = tree
  const focusAnnotated = collapseSingleChild((path.length ? path[path.length - 1] : tree) as BudgetNode | null)
  const myIR = useMemo(() => estimateIRFromNetMonthly(salaryNetMonthly, 1), [salaryNetMonthly])

  const breadcrumbs = useMemo(() => (path.length ? path.map((n) => n.name) : ['État']), [path])

  if (!annotated || !focusAnnotated) return <div>Chargement…</div>

  const percent = annotated && focusAnnotated ? focusAnnotated.cp / annotated.cp : 0
  const myContribution = myIR * percent
  const children = (focusAnnotated.children || []).filter((c) => (c.cp || 0) > 0)
  const minCp = children.length ? Math.min(...children.map((c) => c.cp || 0)) : focusAnnotated.cp || 0
  const maxCp = children.length ? Math.max(...children.map((c) => c.cp || 0)) : focusAnnotated.cp || 0

  useEffect(() => {
    const exploring = (path.length > 1)
    document.body.classList.toggle('exploring', exploring)
    return () => document.body.classList.remove('exploring')
  }, [path.length])

  return (
    <div className="content">
      <div className="graph">
        <Breadcrumbs items={breadcrumbs} onBack={() => setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))} />
        <StatsBar total={annotated!.cp} selectedAmount={focusAnnotated.cp} selectedPercent={percent} myContribution={myContribution} />
        {focusAnnotated && (
          <Continents
            data={focusAnnotated as BudgetNode}
            onSelect={(n) => setPath((p)=>[...p, n])}
            onBack={() => setPath((p)=> (p.length>1? p.slice(0,-1): p))}
          />
        )}
        <Legend min={minCp} max={maxCp} />
      </div>
    </div>
  )
}
