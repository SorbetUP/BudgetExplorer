import type { BudgetNode } from '../types'

export function withPercents(root: BudgetNode): BudgetNode & { percent?: number } {
  const total = root.cp || 1
  const walk = (n: BudgetNode): any => ({
    ...n,
    percent: n.cp / total,
    children: n.children?.map(walk) || [],
  })
  return walk(root)
}

export function findPath(root: BudgetNode, target: BudgetNode): BudgetNode[] {
  const path: BudgetNode[] = []
  const dfs = (node: BudgetNode): boolean => {
    path.push(node)
    if (node === target) return true
    for (const c of node.children || []) if (dfs(c)) return true
    path.pop()
    return false
  }
  dfs(root)
  return path
}

// Collapse chains where a node has exactly one child.
// Returns the deepest descendant with 0 or >1 children.
export function collapseSingleChild<T extends BudgetNode | null | undefined>(node: T): T {
  let cur: any = node as any
  while (cur && Array.isArray(cur.children) && cur.children.length === 1) {
    cur = cur.children[0]
  }
  return cur as T
}

// Find path to first node matching a textual query (code or name contains query)
function norm(s: string): string {
  // Lowercase, strip diacritics, normalize punctuation to spaces, collapse spaces
  const noAccents = (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return noAccents.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

const STOP = new Set([
  'd','de','des','du','le','la','les','l','au','aux','et','a','à','en','pour','sur','dans','par','avec','sans','sous','selon','ou','ou/ou'
])

function tokens(s: string): string[] {
  const n = norm(s)
  if (!n) return []
  return n.split(' ').filter((t) => t && t.length > 1 && !STOP.has(t))
}

export function findPathByQuery(root: BudgetNode, query: string): BudgetNode[] | null {
  const q = norm((query || '').trim())
  if (!q) return null
  
  const path: BudgetNode[] = []
  let found: BudgetNode | null = null
  
  const dfs = (node: BudgetNode): boolean => {
    path.push(node)
    const name = norm(node.name || '')
    
    // Simple contains match
    if (name.includes(q)) {
      found = node
      return true
    }
    
    for (const c of node.children || []) {
      if (dfs(c)) return true
    }
    path.pop()
    return false
  }
  
  const result = dfs(root)
  return result && found ? [...path] : null
}

export function flattenNodes(root: BudgetNode): Array<{ name: string; code?: string; level: string }> {
  const out: Array<{ name: string; code?: string; level: string }> = []
  const dfs = (n: BudgetNode) => {
    out.push({ name: n.name, code: n.code, level: n.level })
    for (const c of n.children || []) dfs(c)
  }
  dfs(root)
  return out
}
