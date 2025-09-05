import type { NormalizedRow } from './normalize'

export type LOLFNode = {
  code?: string
  name: string
  level: 'etat' | 'mission' | 'programme' | 'action' | 'sous_action'
  ae: number
  cp: number
  children?: LOLFNode[]
}

function ensureChild(parent: LOLFNode, code: string | undefined, name: string, level: LOLFNode['level']): LOLFNode {
  parent.children ||= []
  let node = parent.children.find((c) => c.code === code && c.level === level)
  if (!node) {
    node = { code, name, level, ae: 0, cp: 0, children: [] }
    parent.children.push(node)
  }
  return node
}

export function buildTree(rows: NormalizedRow[], year: number): LOLFNode & { year: number; sources?: any } {
  const root: LOLFNode & { year: number; sources?: any } = {
    name: 'État',
    level: 'etat',
    ae: 0,
    cp: 0,
    children: [],
    year,
  }
  for (const r of rows) {
    const mission = ensureChild(root, r.mission_code, r.mission || `Mission ${r.mission_code || '?'}`, 'mission')
    const programme = ensureChild(
      mission,
      r.programme_code,
      r.programme || `Programme ${r.programme_code || '?'}`,
      'programme'
    )
    const action = ensureChild(
      programme,
      r.action_code,
      r.action || `Action ${r.action_code || '?'}`,
      'action'
    )
    const leaf = r.sous_action_code || r.sous_action ? ensureChild(
      action,
      r.sous_action_code,
      r.sous_action || `Sous-action ${r.sous_action_code || '?'}`,
      'sous_action'
    ) : action

    leaf.ae += r.ae || 0
    leaf.cp += r.cp || 0
  }

  // Aggregate sums upwards and sort children by CP desc
  const aggregate = (node: LOLFNode): { ae: number; cp: number } => {
    if (!node.children || node.children.length === 0) return { ae: node.ae, cp: node.cp }
    let sumAE = node.ae
    let sumCP = node.cp
    for (const c of node.children) {
      const s = aggregate(c)
      sumAE += s.ae
      sumCP += s.cp
    }
    node.ae = sumAE
    node.cp = sumCP
    node.children.sort((a, b) => b.cp - a.cp)
    return { ae: node.ae, cp: node.cp }
  }
  aggregate(root)
  return root
}

