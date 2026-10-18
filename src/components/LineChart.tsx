import { useMemo, useState } from 'react'

export interface Series {
  label: string
  color: string
  values: number[]
}

/**
 * Money over time. One y-axis, 2px lines, a recessive grid, a crosshair with
 * every series' value on hover. One series needs no legend (the heading names
 * it); two or more get one. `marker` draws a dashed horizontal reference —
 * an entry price, a starting balance.
 */
export default function LineChart({
  dates,
  series,
  height = 180,
  format,
  marker,
  label,
}: {
  dates: string[]
  series: Series[]
  height?: number
  format: (n: number) => string
  marker?: { value: number; label: string }
  label: string
}) {
  const W = 640
  const H = height
  const PAD = { l: 8, r: 8, t: 12, b: 22 }
  const [hover, setHover] = useState<number | null>(null)
  const n = dates.length

  const { lo, hi } = useMemo(() => {
    const all = series.flatMap((s) => s.values).concat(marker ? [marker.value] : [])
    let lo = Math.min(...all)
    let hi = Math.max(...all)
    if (!Number.isFinite(lo)) return { lo: 0, hi: 1 }
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02 || 1
    lo -= pad
    hi += pad
    return { lo, hi }
  }, [series, marker])

  const xs = (i: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r))
  const ys = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join('')
  const ticks = [lo + (hi - lo) * 0.2, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.8]
  const short = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="linechart">
      {series.length > 1 && (
        <div className="linechart-legend">
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: H, display: 'block', touchAction: 'pan-y' }}
          role="img"
          aria-label={label}
          onPointerMove={(ev) => {
            const r = ev.currentTarget.getBoundingClientRect()
            const x = ((ev.clientX - r.left) / r.width) * W
            const i = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1))
            setHover(Math.max(0, Math.min(n - 1, i)))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <line key={t} x1={PAD.l} x2={W - PAD.r} y1={ys(t)} y2={ys(t)} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {marker && (
            <line x1={PAD.l} x2={W - PAD.r} y1={ys(marker.value)} y2={ys(marker.value)} stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          )}
          {series.map((s) => (
            <path key={s.label} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
          {hover !== null && (
            <line x1={xs(hover)} x2={xs(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {hover !== null &&
          series.map((s) => (
            <span
              key={s.label}
              className="linechart-dot"
              style={{ left: `${(xs(hover) / W) * 100}%`, top: ys(s.values[hover]), background: s.color }}
            />
          ))}
        <div className="linechart-axis">
          <span>{n ? short(dates[0]) : ''}</span>
          {marker && <span className="meta">– – {marker.label} {format(marker.value)}</span>}
          <span>{n ? short(dates[n - 1]) : ''}</span>
        </div>
        {hover !== null && (
          <div className="linechart-tip" style={{ left: `${Math.min(78, Math.max(4, (xs(hover) / W) * 100))}%` }}>
            <div className="meta">{short(dates[hover])}</div>
            {series.map((s) => (
              <div key={s.label} className="row" style={{ gap: 6 }}>
                {series.length > 1 && <i style={{ background: s.color }} />}
                <span className="num">{format(s.values[hover])}</span>
                {series.length > 1 && <span className="meta">{s.label}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
