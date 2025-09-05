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
