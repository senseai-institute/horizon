import { useEffect, useRef, useState, type ReactNode } from 'react'
import { confidenceColor, confidenceWord, KIND_LABEL } from '../lib/color'
import type { GraphNode, Stance } from '../lib/types'

/* ---------------- Confidence ---------------- */

export function ConfidenceBar({
  value,
  width = 120,
  marker,
}: {
  value: number
  width?: number | string
  /** A threshold to draw as a tick, e.g. a sleeve's exit rule. */
  marker?: number
}) {
  return (
    <div className="bar" style={{ width }}>
      <div
        className="bar-fill"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: confidenceColor(value) }}
      />
      {marker !== undefined && <div className="bar-tick" style={{ left: `${Math.min(100, marker)}%` }} />}
    </div>
  )
}

export function ConfidenceGauge({
  value,
  size = 'md',
  marker,
  label = 'Confidence',
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  marker?: number
  label?: string
}) {
  const fontSize = size === 'lg' ? 40 : size === 'md' ? 22 : 15
  return (
    <div className="stack stack-xs">
      <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
        <span
          className="gauge-readout"
          style={{ fontSize, color: confidenceColor(value), lineHeight: 1.05 }}
        >
          {value.toFixed(0)}
        </span>
        {size !== 'sm' && (
          <span className="meta" style={{ color: 'var(--ink-3)' }}>
            {confidenceWord(value)}
          </span>
        )}
      </div>
      <ConfidenceBar value={value} width={size === 'lg' ? 240 : size === 'md' ? 160 : 90} marker={marker} />
      {size === 'lg' && (
        <div className="label" style={{ marginTop: 4 }}>
          {label} · computed from evidence
        </div>
      )}
    </div>
  )
}

export function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 0.05) return <span className="num muted">—</span>
  const down = value < 0
  return (
    <span className="num" style={{ color: down ? 'var(--contradict)' : 'var(--support)' }}>
      {down ? '−' : '+'}
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  )
}

/* ---------------- Node chrome ---------------- */

export function KindDot({ kind }: { kind: GraphNode['kind'] }) {
  const color = kind === 'pillar' ? '#2c4a45' : kind === 'thesis' ? '#5f7068' : kind === 'category' ? '#8d8778' : '#b2ada1'
  return <span className={`kind-dot ${kind}`} style={{ background: color }} aria-hidden="true" />
}

export function KindChip({ kind }: { kind: GraphNode['kind'] }) {
  return (
    <span className="chip chip-outline">
      <KindDot kind={kind} />
      {KIND_LABEL[kind]}
    </span>
  )
}

export function StanceChip({ stance, strength }: { stance: Stance; strength?: number }) {
  return (
    <span className={stance === 'supports' ? 'chip chip-support' : 'chip chip-contradict'}>
      {stance === 'supports' ? 'Supports' : 'Contradicts'}
      {strength !== undefined && <span className="num" style={{ opacity: 0.7 }}>·{strength}</span>}
    </span>
  )
}

export function StanceToggle({
  stance,
  onChange,
  size = 'md',
}: {
  stance: Stance
  onChange: (s: Stance) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="segmented" role="group" aria-label="Does this passage support or contradict the belief?">
      <button
        type="button"
        className="is-support"
        aria-pressed={stance === 'supports'}
        onClick={() => onChange('supports')}
        style={size === 'sm' ? { padding: '3px 9px', fontSize: 12 } : undefined}
      >
        Supports
      </button>
      <button
        type="button"
        className="is-contradict"
        aria-pressed={stance === 'contradicts'}
        onClick={() => onChange('contradicts')}
        style={size === 'sm' ? { padding: '3px 9px', fontSize: 12 } : undefined}
      >
        Contradicts
      </button>
    </div>
  )
}

/* ---------------- Layout helpers ---------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="meta">{hint}</span>}
    </label>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h4>{title}</h4>
      {children && <div className="prose-sm" style={{ maxWidth: '48ch', margin: '0 auto' }}>{children}</div>}
    </div>
  )
}

export function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="card-head" style={{ marginBottom: 12 }}>
      <h3>{title}</h3>
      {aside}
    </div>
  )
}

/** A value with a small caption under it. Used for the portfolio numbers. */
export function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  color?: string
}) {
  return (
    <div className="stack stack-xs">
      <span className="label">{label}</span>
      <span className="num" style={{ fontSize: 24, lineHeight: 1.15, color: color ?? 'var(--ink)' }}>
        {value}
      </span>
      {sub && <span className="meta">{sub}</span>}
    </div>
  )
}

/** Marks the highlighted phrase inside a filing excerpt. */
export function Highlighted({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight) return <>{text}</>
  const at = text.indexOf(highlight)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark>{highlight}</mark>
      {text.slice(at + highlight.length)}
    </>
  )
}

/* ---------------- Number input that commits as you drag ---------------- */

export function PercentSlider({
  value,
  min,
  max,
  step = 0.5,
  onChange,
  suffix = '%',
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="row" style={{ gap: 14 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, minWidth: 120 }}
      />
      <span className="num" style={{ width: 62, textAlign: 'right', fontSize: 15 }}>
        {value.toFixed(1)}
        {suffix}
      </span>
    </div>
  )
}

/* ---------------- Dates ---------------- */

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts })
}
export function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
export function formatUsd(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(n) >= 1000)
    return `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`
  return `$${Math.round(n).toLocaleString('en-US')}`
}
export function relativeTime(iso: string) {
  const diff = Date.now() - Date.parse(iso)
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = (days / 365).toFixed(1)
  return `${years} years ago`
}

/* ---------------- Drawer ---------------- */

export function Drawer({
  onClose,
  children,
  labelledBy,
}: {
  onClose: () => void
  children: ReactNode
  labelledBy?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref} tabIndex={-1}>
        {children}
      </div>
    </>
  )
}

/** Confirms a destructive action in place rather than in a modal. */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  className = 'btn btn-sm btn-danger',
}: {
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  if (armed)
    return (
      <span className="row" style={{ gap: 6 }}>
        <button type="button" className={className} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setArmed(false)}>
          Cancel
        </button>
      </span>
    )
  return (
    <button type="button" className={className} onClick={() => setArmed(true)}>
      {children}
    </button>
  )
}
