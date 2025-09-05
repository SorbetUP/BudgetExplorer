export type BudgetNode = {
  code?: string
  name: string
  level: 'etat' | 'mission' | 'programme' | 'action' | 'sous_action'
  ae: number
  cp: number
  children?: BudgetNode[]
}

export type BudgetTree = BudgetNode & { year: number; sources?: any }

