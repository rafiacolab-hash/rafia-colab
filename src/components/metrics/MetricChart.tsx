'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Gráfico SVG leve (linha, área ou barras) com tooltip — sem dependências.
// Cores de texto/grade vêm dos tokens de tema (--t-*), então segue claro/escuro.

type Props = {
  labels: string[]
  values: (number | null)[]
  kind: 'area' | 'line' | 'bar'
  color: string
  seriesLabel: string
  format: (n: number) => string
  height?: number
  zeroBased?: boolean
}

const PAD = { top: 12, right: 10, bottom: 24, left: 46 }

function niceStep(range: number, ticks: number) {
  const raw = range / ticks
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return step * mag
}

export default function MetricChart({ labels, values, kind, color, seriesLabel, format, height = 230, zeroBased = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId().replace(/:/g, '')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(Math.max(240, Math.floor(w)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const nums = values.filter((v): v is number => v != null)
    let lo = zeroBased || !nums.length ? 0 : Math.min(...nums)
    let hi = nums.length ? Math.max(...nums) : 1
    if (!zeroBased && nums.length) {
      const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.02 || 1
      lo = lo - pad
      hi = hi + pad
    }
    if (hi === lo) hi = lo + 1
    const step = niceStep(hi - lo, 4)
    const yMin = Math.floor(lo / step) * step
    const yMax = Math.ceil(hi / step) * step
    const ticks: number[] = []
    for (let t = yMin; t <= yMax + step / 2; t += step) ticks.push(t)

    const iw = width - PAD.left - PAD.right
    const ih = height - PAD.top - PAD.bottom
    const n = Math.max(values.length, 1)
    const band = iw / n
    const x = (i: number) => (kind === 'bar' ? PAD.left + band * i + band / 2 : PAD.left + (n === 1 ? iw / 2 : (iw * i) / (n - 1)))
    const y = (v: number) => PAD.top + ih - ((v - yMin) / (yMax - yMin || 1)) * ih
    return { ticks, x, y, iw, ih, band, yMin }
  }, [values, width, height, kind, zeroBased])

  // Segmentos contínuos (null quebra a linha)
  const segments = useMemo(() => {
    const segs: { i: number; v: number }[][] = []
    let cur: { i: number; v: number }[] = []
    values.forEach((v, i) => {
      if (v == null) { if (cur.length) segs.push(cur); cur = [] }
      else cur.push({ i, v })
    })
    if (cur.length) segs.push(cur)
    return segs
  }, [values])

  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(width / 70))))
  const baseY = geo.y(Math.max(geo.yMin, 0))

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < values.length; i++) {
      const d = Math.abs(geo.x(i) - px)
      if (d < bestD) { bestD = d; best = i }
    }
    setHover(best)
  }

  const hv = hover != null ? values[hover] : null
  const tipLeft = hover != null ? Math.min(Math.max(geo.x(hover), 70), width - 70) : 0

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="block" role="img" aria-label={seriesLabel}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {geo.ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)}
              stroke="rgb(var(--t-border))" strokeWidth={1} />
            <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={11}
              fill="rgb(var(--t-muted))">{format(t)}</text>
          </g>
        ))}

        {labels.map((l, i) => (i % labelEvery === 0 ? (
          <text key={i} x={geo.x(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="rgb(var(--t-muted))">{l}</text>
        ) : null))}

        {kind === 'bar' && values.map((v, i) => {
          if (v == null) return null
          const w = Math.max(2, Math.min(18, geo.band * 0.7))
          const top = geo.y(Math.max(v, 0))
          const h = Math.max(1, Math.abs(geo.y(v) - baseY))
          return (
            <rect key={i} x={geo.x(i) - w / 2} y={v >= 0 ? top : baseY} width={w} height={h} rx={Math.min(4, w / 2)}
              fill={color} opacity={hover == null || hover === i ? 1 : 0.55} />
          )
        })}

        {kind !== 'bar' && segments.map((seg, si) => {
          const line = seg.map((p, k) => `${k ? 'L' : 'M'}${geo.x(p.i)},${geo.y(p.v)}`).join(' ')
          const area = `${line} L${geo.x(seg[seg.length - 1].i)},${baseY} L${geo.x(seg[0].i)},${baseY} Z`
          return (
            <g key={si}>
              {kind === 'area' && <path d={area} fill={`url(#${gradId})`} />}
              <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {seg.length === 1 && <circle cx={geo.x(seg[0].i)} cy={geo.y(seg[0].v)} r={3} fill={color} />}
            </g>
          )
        })}

        {hover != null && kind !== 'bar' && (
          <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={PAD.top + geo.ih}
            stroke="rgb(var(--t-border-strong))" strokeDasharray="3 3" />
        )}
        {hover != null && kind !== 'bar' && hv != null && (
          <circle cx={geo.x(hover)} cy={geo.y(hv)} r={4.5} fill={color} stroke="rgb(var(--t-card))" strokeWidth={2} />
        )}

        <rect x={PAD.left} y={PAD.top} width={geo.iw} height={geo.ih} fill="transparent"
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      {hover != null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-theme-border bg-theme-card px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: tipLeft, top: 0 }}>
          <div className="text-theme-muted">{labels[hover]}</div>
          <div className="font-semibold text-theme-primary tabular-nums">
            {seriesLabel}: {hv == null ? 'sem dado' : format(hv)}
          </div>
        </div>
      )}
    </div>
  )
}
