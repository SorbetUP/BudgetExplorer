export type NormalizedRow = {
  mission_code?: string
  mission?: string
  programme_code?: string
  programme?: string
  action_code?: string
  action?: string
  sous_action_code?: string
  sous_action?: string
  ae?: number
  cp?: number
}

const alias = {
  mission_code: ['mission_code', 'code_mission', 'mission', 'missionid', 'mission_numero'],
  mission: ['intitule_mission', 'mission_libelle', 'mission_label', 'mission_nom'],
  programme_code: ['programme_code', 'code_programme', 'programme', 'programme_numero'],
  programme: ['intitule_programme', 'programme_libelle', 'programme_label', 'programme_nom'],
  action_code: ['action_code', 'code_action', 'action', 'action_numero'],
  action: ['intitule_action', 'action_libelle', 'action_label', 'action_nom'],
  sous_action_code: ['sous_action_code', 'code_sous_action', 'sous_action', 'sousaction'],
  sous_action: ['intitule_sous_action', 'sous_action_libelle', 'sous_action_label'],
  ae: ['ae', 'autorisations_engagement', 'montant_ae', 'mnt_ae'],
  cp: ['cp', 'credits_paiement', 'montant_cp', 'mnt_cp'],
} as const

export function lowerKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj || {})) out[k.toLowerCase()] = v
  return out
}

export function parseNumberFR(v: unknown): number | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return undefined
  const s = v
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/\.(?=.*\.)/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k]
    if (v != null) return v
  }
  return undefined
}

export function normalizeRow(row: Record<string, unknown>): NormalizedRow {
  const r = lowerKeys(row)
  const nr: NormalizedRow = {}
  nr.mission_code = (pick(r, alias.mission_code) as string | undefined)?.toString()
  nr.mission = (pick(r, alias.mission) as string | undefined) || undefined
  nr.programme_code = (pick(r, alias.programme_code) as string | undefined)?.toString()
  nr.programme = (pick(r, alias.programme) as string | undefined) || undefined
  nr.action_code = (pick(r, alias.action_code) as string | undefined)?.toString()
  nr.action = (pick(r, alias.action) as string | undefined) || undefined
  nr.sous_action_code = (pick(r, alias.sous_action_code) as string | undefined)?.toString()
  nr.sous_action = (pick(r, alias.sous_action) as string | undefined) || undefined
  nr.ae = parseNumberFR(pick(r, alias.ae)) || 0
  nr.cp = parseNumberFR(pick(r, alias.cp)) || 0
  return nr
}

