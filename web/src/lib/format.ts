export function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export function formatMd(n: number): string {
  return `${(n / 1_000_000_000).toFixed(1)} Md€`
}

export function formatPercent(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function breadcrumbs(names: string[]): string {
  return names.join(' > ')
}

