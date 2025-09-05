// Barème IR 2025 (revenus 2024), célibataire 1 part (MVP)
// Tranches et taux applicables par part
export const BRACKETS_2025 = [
  { upTo: 11294, rate: 0 },
  { upTo: 28797, rate: 0.11 },
  { upTo: 82341, rate: 0.30 },
  { upTo: 177106, rate: 0.41 },
  { upTo: Infinity, rate: 0.45 },
]

export function yearlyNetToTaxable(netMonthly: number): number {
  // Approximation simple: net -> imposable ~ net * 1.25 (ajuste charges déductibles de façon grossière)
  // MVP: on reste conservateur via coef 1.0 pour éviter la surestimation.
  return Math.max(0, netMonthly * 12)
}

export function computeIR(amountTaxable: number, parts = 1): number {
  const qf = amountTaxable / parts
  let taxPerPart = 0
  let prev = 0
  for (const b of BRACKETS_2025) {
    const slice = Math.min(qf, b.upTo) - prev
    if (slice > 0) taxPerPart += slice * b.rate
    prev = b.upTo
    if (qf <= b.upTo) break
  }
  return taxPerPart * parts
}

export function estimateIRFromNetMonthly(netMonthly: number, parts = 1): number {
  const taxable = yearlyNetToTaxable(netMonthly)
  return computeIR(taxable, parts)
}

