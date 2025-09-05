import { describe, it, expect } from 'vitest'
import { computeIR, yearlyNetToTaxable, estimateIRFromNetMonthly, BRACKETS_2025 } from '../src/lib/tax'

describe('tax', () => {
  it('yearlyNetToTaxable is non-negative', () => {
    expect(yearlyNetToTaxable(-1000)).toBe(0)
  })

  it('computeIR at thresholds is monotonic', () => {
    const bases = [0, 11294, 11295, 28797, 28798, 82341, 82342]
    const taxes = bases.map((b) => computeIR(b, 1))
    for (let i = 1; i < taxes.length; i++) expect(taxes[i]).toBeGreaterThanOrEqual(taxes[i - 1])
  })

  it('estimateIRFromNetMonthly returns reasonable amounts', () => {
    const t = estimateIRFromNetMonthly(2500)
    expect(t).toBeGreaterThan(0)
  })
})

