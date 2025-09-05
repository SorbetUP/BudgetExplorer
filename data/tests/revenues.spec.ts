import { describe, it, expect } from 'vitest'
import { normalizeRevenues } from '../src/revenues'

describe('revenues.normalizeRevenues', () => {
  it('parses numbers from strings and picks labels', () => {
    const rows = [
      { source: 'TVA', montant: '180 000 000 000' },
      { titre: 'IR', value: '100000000000' },
      { intitule: 'IS', amount: 70000000000 },
    ]
    const res = normalizeRevenues(rows as any)
    expect(res.length).toBe(3)
    expect(res[0].montant).toBe(180000000000)
    expect(res[1].source).toBe('IR')
  })
})

