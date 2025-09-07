export type HistoricalData = {
  execution_2023?: number
  lfi_2024?: number
  plf_2025?: number
}

export type PerformanceIndicator = {
  name: string
  target2025?: string
  execution2024?: string
  execution2023?: string
  unit?: string
}

export type PerformanceData = {
  objectives?: string[]
  indicators?: PerformanceIndicator[]
}

export type BudgetMetadata = {
  [key: string]: number | string | boolean
}

export type BudgetNode = {
  code?: string
  name: string
  level: 'etat' | 'mission' | 'programme' | 'action' | 'sous_action'
  ae: number
  cp: number
  description?: string
  historical?: HistoricalData
  performance?: PerformanceData
  metadata?: BudgetMetadata
  children?: BudgetNode[]
}

export type BudgetSources = {
  spendingDatasetId: string
  license: string
  dataAccuracy?: string
  enhancedFeatures?: string[]
  dataSources?: string[]
  historicalDataSource?: string
  totalRecords?: number
  coverage?: string
  lastUpdated?: string
}

export type BudgetTreeMetadata = {
  totalMissions?: number
  totalPrograms?: number
  budgetDeficit?: number
  publicDebtPercent?: number
  publicEmployees?: number
}

export type BudgetTree = BudgetNode & { 
  year: number
  sources?: BudgetSources
  metadata?: BudgetTreeMetadata
}

