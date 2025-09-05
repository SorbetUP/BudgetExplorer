import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { BudgetNode } from '../types'

type Props = {
  data: BudgetNode
  onSelect?: (node: BudgetNode) => void
  onBack?: () => void
}

export function CirclePacking({ data, onSelect, onBack }: Props) {
  const ref = useRef<SVGSVGElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()
    const width = ref.current.clientWidth || 800
    const height = ref.current.clientHeight || 600

    const root = d3
      .pack<BudgetNode>()
      .size([width, height])
      .padding(3)(
        d3.hierarchy(data as any).sum((d) => Math.max(0.0001, d.cp || 0))
      )

    const nodes = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    let focus = root
    let view: [number, number, number]

    const color = d3.scaleSequential(d3.interpolateCool).domain([0, root.height])

    // Tooltip container
    const container = d3.select(svg.node()?.parentElement as HTMLElement)
    const tooltip = container
      .selectAll<HTMLDivElement, unknown>('div.tooltip')
      .data([null])
      .join('div')
      .attr('class', 'tooltip')

    const circle = nodes
      .selectAll('circle')
      .data(root.descendants())
      .join('circle')
      .attr('fill', (d) => (d.children ? color(d.depth) : '#0ea5e9'))
      .attr('pointer-events', (d) => (!d.children ? 'none' : null))
      .on('click', (event, d) => {
        if (focus !== d) {
          zoom(d)
          onSelect?.(d.data as any)
        }
        event.stopPropagation()
      })
      .on('mousemove', (event, d) => {
        const cp = d.data.cp || 0
        const total = root.data.cp || cp || 1
        const pct = ((cp / total) * 100).toFixed(2)
        tooltip.html(`<div class='title'>${d.data.name}</div><div class='meta'>${pct}% • ${formatEuro(cp)}</div>`)
        tooltip.style('left', `${event.offsetX}px`).style('top', `${event.offsetY}px`).style('opacity', 1)
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', 0)
      })

    const label = nodes
      .selectAll('text')
      .data(root.descendants())
      .join('text')
      .style('fill', '#e5e7eb')
      .style('font-size', '12px')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('opacity', (d) => (d.parent === root ? 1 : 0))
      .text((d) => (d.r > 40 ? d.data.name : ''))

    const zoomTo = (v: [number, number, number]) => {
      const k = width / v[2]
      view = v
      label.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
      circle.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
      circle.attr('r', (d) => (d.r * k))
    }

    const zoom = (d: any) => {
      const focus0 = focus
      focus = d
      const transition = svg.transition().duration(600)
      transition.tween('zoom', () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2])
        return (t) => zoomTo(i(t))
      })
      label
        .filter(function (l) {
          return l.parent === focus || this.style.opacity === '1'
        })
        .transition(transition as any)
        .style('opacity', (l) => (l.parent === focus ? 1 : 0))
        .on('end', function (l) {
          (this as SVGTextElement).style.display = l.parent === focus ? 'inline' : 'none'
        })
    }

    svg.on('click', () => {
      if (focus !== root) {
        zoom(root)
        onSelect?.(root.data as any)
      } else {
        onBack?.()
      }
    })

    zoomTo([root.x, root.y, root.r * 2])
  }, [data, onBack])

  return <svg ref={ref} role="img" aria-label="Budget circle packing" />
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
