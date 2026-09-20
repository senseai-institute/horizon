import { seedOfLife } from '../os/geometry'

/**
 * The seed of life — seven circles — as a mark. Agents get one with their own
 * hue; the OS gets the neutral one. Drawn with lines, not fills, so it reads
 * as a diagram rather than a logo.
 */
export default function Glyph({ size = 20, hue, active = false, title }: { size?: number; hue?: number; active?: boolean; title?: string }) {
  const r = size * 0.22
  const pts = seedOfLife(r)
  const stroke = hue === undefined ? 'var(--ink-2)' : `hsl(${hue} 32% 42%)`
  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={r} fill={active && i === 0 ? stroke : 'none'} fillOpacity={0.18} stroke={stroke} strokeWidth={size > 28 ? 1 : 0.9} opacity={i === 0 ? 1 : 0.75} />
      ))}
    </svg>
  )
}
