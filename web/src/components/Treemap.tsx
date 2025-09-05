import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { BudgetNode } from '../types'

type Props = {
  data: BudgetNode
  onSelect?: (node: BudgetNode) => void
  onBack?: () => void
}

export function Treemap({ data, onSelect, onBack }: Props) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const width = ref.current.clientWidth || 800
    const height = ref.current.clientHeight || 600

    const root = d3
      .hierarchy<BudgetNode>(data as any)
      .sum((d) => Math.max(0.0001, d.cp || 0))
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    d3.treemap<BudgetNode>()
      .size([width, height])
      .paddingInner(2)
      .round(true)
      .tile(d3.treemapSquarify.ratio(1.35))(root)

    const x = d3.scaleLinear().domain([0, width]).range([0, width])
    const y = d3.scaleLinear().domain([0, height]).range([0, height])

    const container = d3.select(svg.node()?.parentElement as HTMLElement)
    const tooltip = container
      .selectAll<HTMLDivElement, unknown>('div.tooltip')
      .data([null])
      .join('div')
      .attr('class', 'tooltip')

    const g = svg.append('g')

    let focus: d3.HierarchyRectangularNode<BudgetNode> = root

    const color = d3.scaleSequential(d3.interpolatePuBuGn).domain([0, root.height])

    const nodes = g
      .selectAll('g.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)

    const rect = nodes
      .append('rect')
      .attr('fill', (d) => (d.children ? color(d.depth) : '#4ad1ff'))
      .attr('stroke', '#1f2a3a')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0))
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'))
      .on('click', (event, d) => {
        if (focus !== d && (d.children && d.children.length)) {
          zoom(d)
          onSelect?.(d.data as any)
          event.stopPropagation()
        }
      })
      .on('mousemove', (event, d) => {
        const cp = d.data.cp || 0
        const total = root.data.cp || cp || 1
        const pct = ((cp / total) * 100).toFixed(2)
        tooltip
          .html(`<div class='title'>${d.data.name}</div><div class='meta'>${pct}% • ${formatEuro(cp)}</div>`)
          .style('left', `${event.offsetX}px`)
          .style('top', `${event.offsetY}px`)
          .style('opacity', 1)
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))

    const label = nodes
      .append('text')
      .attr('fill', '#e6eaf2')
      .attr('font-size', 12)
      .attr('pointer-events', 'none')
      .attr('x', 6)
      .attr('y', 16)
      .text((d) => (shouldShowLabel(d) ? d.data.name : ''))

    svg.on('click', () => {
      if (focus !== root) {
        zoom(root)
        onSelect?.(root.data as any)
      } else {
        onBack?.()
      }
    })

    function zoom(d: d3.HierarchyRectangularNode<BudgetNode>) {
      focus = d
      const i = d3.interpolateZoom(
        [x.invert(0), y.invert(0), width],
        [d.x0 + (d.x1 - d.x0) / 2, d.y0 + (d.y1 - d.y0) / 2, Math.max(d.x1 - d.x0, d.y1 - d.y0)]
      )
      const t = svg.transition().duration(600)
      t.tween('zoom', () => (t) => {
        const v = i(t)
        const kx = width / v[2]
        const ky = height / v[2]
        const cx = v[0] - width / (2 * kx)
        const cy = v[1] - height / (2 * ky)
        x.domain([cx, cx + width / kx])
        y.domain([cy, cy + height / ky])
        nodes.attr('transform', (d) => `translate(${x(d.x0)},${y(d.y0)})`)
        rect
          .attr('width', (d) => Math.max(0, x(d.x1) - x(d.x0)))
          .attr('height', (d) => Math.max(0, y(d.y1) - y(d.y0)))
        label.text((d) => (shouldShowLabel(d) ? d.data.name : ''))
      })
    }

    function shouldShowLabel(d: d3.HierarchyRectangularNode<BudgetNode>): boolean {
      const w = d.x1 - d.x0
      const h = d.y1 - d.y0
      return w > 80 && h > 22
    }

    // initial fit to root
    zoom(root)
  }, [data, onBack])

  return <svg ref={ref} role="img" aria-label="Budget treemap" />
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

