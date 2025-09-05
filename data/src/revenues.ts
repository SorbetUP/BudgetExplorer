export type Revenue = { source: string; montant: number }

import { parseNumberFR } from './normalize'

export function normalizeRevenues(records: Record<string, unknown>[]): Revenue[] {
  const out: Revenue[] = []
  for (const r of records) {
    const label =
      (r['source'] as string) ||
      (r['titre'] as string) ||
      (r['intitule'] as string) ||
      (r['label'] as string)

    const maybe =
      (r['montant'] as any) ??
      (r['value'] as any) ??
      (r['cp'] as any) ??
      (r['amount'] as any)

    const montant =
      typeof maybe === 'number' ? maybe : parseNumberFR(typeof maybe === 'string' ? maybe : undefined) || 0

    if (label && montant) out.push({ source: label, montant })
  }
  return out
}
