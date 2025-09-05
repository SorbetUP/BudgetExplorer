import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { BudgetNode } from '../types'

type Props = {
  data: BudgetNode
  onSelect?: (node: BudgetNode) => void
  onBack?: () => void
}

export function Continents({ data, onSelect, onBack }: Props) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const width = ref.current.clientWidth || 1000
    const height = ref.current.clientHeight || 700

    type SimNode = { node: BudgetNode; r: number; x: number; y: number }

    // Deterministic and compact: circle packing (no randomness)
    let items: SimNode[]
    if (data.children && data.children.length) {
      const h = d3
        .hierarchy<BudgetNode>({ name: 'root', level: 'etat', ae: 0, cp: 0, children: data.children } as any)
        .sum((d) => Math.max(0.0001, d.cp || 0))
        .sort((a, b) => (b.value || 0) - (a.value || 0))
      const packed = d3.pack<BudgetNode>().size([width, height]).padding(6)(h)
      items = (packed.children || []).map((c) => ({ node: c.data, r: c.r, x: c.x, y: c.y }))
    } else {
      items = [{ node: data, r: Math.min(width, height) * 0.18, x: width / 2, y: height / 2 }]
    }

    // Ensure hull is under islands
    const hullG = svg.append('g')
    const g = svg.append('g')

    const container = d3.select(svg.node()?.parentElement as HTMLElement)
    const tooltip = container
      .selectAll<HTMLDivElement, unknown>('div.tooltip')
      .data([null])
      .join('div')
      .attr('class', 'tooltip')

    // Color scale (absolu par rapport aux enfants visibles):
    // petites dépenses => vert clair ; grandes => brun/ noir
    const color = d3
      .scaleLinear<string>()
      .domain([0, 0.25, 0.5, 0.75, 1])
      .range(['#58d27f', '#e4df5c', '#c36a3b', '#3a2611', '#000000'])
      .clamp(true)

    // Draw group hull (outline around all continents) when expanded (many items)
    if (items.length > 1) {
      const pathD = hullPath(items)
      if (pathD) {
        // soft glow stroke + inner bright stroke
        hullG
          .append('path')
          .attr('d', pathD)
          .attr('fill', 'rgba(74, 209, 255, 0.06)')
          .attr('stroke', 'rgba(74, 209, 255, 0.35)')
          .attr('stroke-width', 10)
          .style('pointer-events', 'none')
        hullG
          .append('path')
          .attr('d', pathD)
          .attr('fill', 'rgba(74, 209, 255, 0.06)')
          .attr('stroke', 'rgba(97, 250, 142, 0.8)')
          .attr('stroke-width', 2)
          .style('pointer-events', 'none')

        // group label deliberately hidden to avoid showing higher-level name after zoom
      }
    }

    const values = items.map((it) => Math.max(0, it.node.cp || 0))
    const minCp = values.length ? Math.min(...values) : 0
    const maxCp = values.length ? Math.max(...values) : 1
    const denom = Math.max(1e-9, maxCp - minCp)

    const island = g
      .selectAll('path.island')
      .data(items)
      .join('path')
      .attr('class', 'island')
      .attr('fill', (d) => {
        const v = Math.max(0, d.node.cp || 0)
        const t = (v - minCp) / denom // 0..1: plus c'est grand, plus c'est foncé
        return color(Math.max(0, Math.min(1, t))) as string
      })
      .attr('stroke', '#0b1422')
      .attr('stroke-width', 2)
      .attr('opacity', 0.95)
      .attr('d', (d) => blobPath(d.x, d.y, d.r, seedFor(d.node)))
      .style('cursor', (d) => ((d.node.children && d.node.children.length) ? 'pointer' : 'default'))
      .on('mousemove', (event, d) => {
        const total = (data.cp || d.node.cp || 1)
        const pct = ((d.node.cp / total) * 100).toFixed(2)
        const title = d.node.code ? `[${d.node.code}] ${d.node.name}` : d.node.name
        tooltip.html(`<div class='title'>${title}</div><div class='meta'>${pct}% • ${formatEuro(d.node.cp)}</div>`)

        // Compute smart position around cursor with side switch
        const rect = (container.node() as HTMLElement).getBoundingClientRect()
        const tw = (tooltip.node() as HTMLDivElement).offsetWidth || 160
        const th = (tooltip.node() as HTMLDivElement).offsetHeight || 40
        const gap = 14
        const cx = event.clientX - rect.left
        const cy = event.clientY - rect.top
        const placeRight = cx + gap + tw <= rect.width
        let left = placeRight ? cx + gap : cx - gap - tw
        let top = cy - th / 2
        // Clamp within container
        left = Math.max(4, Math.min(left, rect.width - tw - 4))
        top = Math.max(4, Math.min(top, rect.height - th - 4))

        tooltip
          .style('left', `${left}px`)
          .style('top', `${top}px`)
          .style('opacity', 1)
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (event, d) => {
        event.stopPropagation()
        if (d.node.children && d.node.children.length) onSelect?.(d.node)
      })

    // Labels
    const labels = g
      .selectAll('text.label')
      .data(items)
      .join('text')
      .attr('class', 'label')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#f0f6ff')
      .style('font-weight', 700)
      .style('paint-order', 'stroke')
      .style('stroke', '#0b1422')
      .style('stroke-width', 4)
      .style('pointer-events', 'none')
      .text((d) => d.node.name)

    // Fit labels: shrink then ellipsize to fit within the island width
    labels.each(function (d) {
      const el = this as SVGTextElement
      const r = d.r
      if (r < 18) {
        el.textContent = ''
        return
      }
      const maxWidth = Math.max(24, 2 * r - 16)
      let fontSize = Math.max(12, Math.min(28, Math.floor(r / 5)))
      el.style.fontSize = fontSize + 'px'
      // shrink if needed
      while (fontSize > 10 && el.getComputedTextLength() > maxWidth) {
        fontSize -= 1
        el.style.fontSize = fontSize + 'px'
      }
      // ellipsize if still too long
      if (el.getComputedTextLength() > maxWidth) {
        const full = d.node.name
        let low = 1
        let high = full.length
        let best = 0
        // binary search max chars that fit with ellipsis
        while (low <= high) {
          const mid = Math.floor((low + high) / 2)
          el.textContent = full.slice(0, mid) + '…'
          if (el.getComputedTextLength() <= maxWidth) {
            best = mid
            low = mid + 1
          } else {
            high = mid - 1
          }
        }
        el.textContent = best > 0 ? full.slice(0, best) + '…' : ''
      }
    })

    svg.on('click', (event) => {
      const [px, py] = d3.pointer(event as any, ref.current as any)
      // Find island under cursor (circle hit-test)
      const hit = items.find((it) => {
        const dx = px - it.x
        const dy = py - it.y
        return dx * dx + dy * dy <= it.r * it.r
      })
      if (hit) onSelect?.(hit.node)
      else onBack?.()
    })
  }, [data, onBack])

  return <svg ref={ref} role="img" aria-label="Budget continents" />
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// Deterministic seed from node
function seedFor(n: BudgetNode): number {
  const s = `${n.level}-${n.code ?? ''}-${n.name}`
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function blobPath(cx: number, cy: number, r: number, seed: number): string {
  const rand = mulberry32(seed)
  const points: [number, number][] = []
  const N = 48
  const wobble = 0.28
  const pinch = 0.1 + rand() * 0.05
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2
    // radial variation: base + per-angle noise + low-frequency modulation
    const n = (rand() - 0.5) * wobble + Math.sin(t * (2 + rand() * 1.5)) * 0.08
    const rr = r * (1 - pinch) * (1 + n)
    points.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr])
  }
  const line = d3.line().curve(d3.curveCardinalClosed.tension(0.7))
  return line(points as any) || ''
}

function hullPoints(items: { x: number; y: number; r: number }[]): [number, number][] {
  const pts: [number, number][] = []
  const pad = 18
  const K = 18
  for (const it of items) {
    for (let i = 0; i < K; i++) {
      const t = (i / K) * Math.PI * 2
      pts.push([it.x + Math.cos(t) * (it.r + pad), it.y + Math.sin(t) * (it.r + pad)])
    }
  }
  return pts
}

function hullPath(items: { x: number; y: number; r: number }[]): string | null {
  const pts = hullPoints(items)
  const hull = d3.polygonHull(pts)
  if (!hull) return null
  const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.7))
  return line(hull as any) || null
}
