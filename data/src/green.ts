export type GreenRecord = {
  domaine?: string
  objectif?: string
  note?: string
  montant?: number
}

// Placeholder for future support. The pipeline treats this as optional.
export function normalizeGreen(records: Record<string, unknown>[]): GreenRecord[] {
  return records.map((r) => ({
    domaine: (r['domaine'] as string) || undefined,
    objectif: (r['objectif'] as string) || undefined,
    note: (r['note'] as string) || undefined,
    montant: typeof r['montant'] === 'number' ? (r['montant'] as number) : undefined,
  }))
}

