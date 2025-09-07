import { fetchPagedRecords, type ODSRecord } from './api'

export type PerformanceRecord = {
  code_mission: string
  mission: string  
  code_programme?: string
  programme?: string
  libelle_objectif: string
  libelle_indicateur: string
  unite: string
  exec_2023?: string
  exec_2024?: string
  cible_2025?: string
  atteinte_de_la_cible_2024?: string
}

export type GreenBudgetRecord = {
  mission: string
  numero_programme: number
  programme: string
  action_si_credit_budgetaire?: string
  cotation_globale: string
  execution_2023_cp: number
  lfi_2024_cp_ou_prevision_2024_si_depense_fiscale: number  
  plf_2025_cp_ou_prevision_2025_si_depense_fiscale: number
  categorie_generale: string
  attenuation_climat?: number
  adaptation_climat?: number
  eau?: number
  pollution?: number
  biodiversite?: number
}

export type EnhancedMissionData = {
  code: string
  name: string
  performance?: PerformanceRecord[]
  greenBudget?: GreenBudgetRecord[]
  realAmounts?: {
    execution_2023?: number
    lfi_2024?: number
    plf_2025?: number
  }
}

const PERFORMANCE_DATASET = 'performance-de-la-depense'
const GREEN_BUDGET_DATASET = 'plf25-budget-vert'

/**
 * Fetch performance data for missions and programs
 */
export async function fetchPerformanceData(
  domain: string,
  year: number
): Promise<PerformanceRecord[]> {
  try {
    const records = await fetchPagedRecords<PerformanceRecord>({
      domain,
      dataset: PERFORMANCE_DATASET,
      limit: 100,
      pauseMs: 150
    })
    return records.map(r => r.fields)
  } catch (error) {
    console.warn('Failed to fetch performance data:', error)
    return []
  }
}

/**
 * Fetch green budget data with environmental scoring
 */
export async function fetchGreenBudgetData(
  domain: string, 
  year: number
): Promise<GreenBudgetRecord[]> {
  try {
    const records = await fetchPagedRecords<GreenBudgetRecord>({
      domain,
      dataset: GREEN_BUDGET_DATASET,
      limit: 100,
      pauseMs: 150
    })
    return records.map(r => r.fields)
  } catch (error) {
    console.warn('Failed to fetch green budget data:', error)
    return []
  }
}

/**
 * Enhance mission data with performance indicators and real amounts
 */
export async function enhanceMissionData(
  domain: string,
  year: number,
  missions: Array<{ code?: string; name: string }>
): Promise<EnhancedMissionData[]> {
  const [performanceData, greenBudgetData] = await Promise.all([
    fetchPerformanceData(domain, year),
    fetchGreenBudgetData(domain, year)
  ])

  return missions.map(mission => {
    // Match performance data by mission name
    const missionPerformance = performanceData.filter(p => 
      p.mission && mission.name && 
      normalizeText(p.mission).includes(normalizeText(mission.name).slice(0, 10))
    )

    // Match green budget data by mission name
    const missionGreenBudget = greenBudgetData.filter(g =>
      g.mission && mission.name &&
      normalizeText(g.mission).includes(normalizeText(mission.name).slice(0, 10))
    )

    // Calculate real amounts from green budget data
    const realAmounts = missionGreenBudget.reduce((acc, record) => {
      if (record.execution_2023_cp) acc.execution_2023 = (acc.execution_2023 || 0) + record.execution_2023_cp
      if (record.lfi_2024_cp_ou_prevision_2024_si_depense_fiscale) {
        acc.lfi_2024 = (acc.lfi_2024 || 0) + record.lfi_2024_cp_ou_prevision_2024_si_depense_fiscale
      }
      if (record.plf_2025_cp_ou_prevision_2025_si_depense_fiscale) {
        acc.plf_2025 = (acc.plf_2025 || 0) + record.plf_2025_cp_ou_prevision_2025_si_depense_fiscale
      }
      return acc
    }, {} as { execution_2023?: number; lfi_2024?: number; plf_2025?: number })

    return {
      code: mission.code || '',
      name: mission.name,
      performance: missionPerformance.length > 0 ? missionPerformance : undefined,
      greenBudget: missionGreenBudget.length > 0 ? missionGreenBudget : undefined,
      realAmounts: Object.keys(realAmounts).length > 0 ? realAmounts : undefined
    }
  })
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get proper mission names from official data
 */
export async function getOfficialMissionNames(
  domain: string
): Promise<Array<{ code?: string; name: string; programs?: string[] }>> {
  try {
    const greenBudgetData = await fetchGreenBudgetData(domain, 2025)
    
    // Group by mission and collect programs
    const missionMap = new Map<string, Set<string>>()
    
    greenBudgetData.forEach(record => {
      if (record.mission) {
        if (!missionMap.has(record.mission)) {
          missionMap.set(record.mission, new Set())
        }
        if (record.programme) {
          missionMap.get(record.mission)!.add(record.programme)
        }
      }
    })

    return Array.from(missionMap.entries()).map(([mission, programs]) => ({
      name: mission,
      programs: Array.from(programs)
    }))
  } catch (error) {
    console.warn('Failed to fetch official mission names:', error)
    return []
  }
}