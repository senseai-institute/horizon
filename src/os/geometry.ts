/**
 * Sacred geometry, used as structure rather than decoration.
 *
 * - The golden ratio sets the spacing scale and window proportions.
 * - The seed of life (seven circles) is the brand mark and the agent glyphs.
 * - The flower of life's hexagonal packing lays out the journey map.
 * - The vesica piscis paces breathing on the Flow screen.
 */

export const PHI = (1 + Math.sqrt(5)) / 2

/** Spacing steps that grow by phi. */
export const PHI_SCALE = [4, 6, 10, 16, 26, 42, 68, 110].map((n) => Math.round(n))

/** Centres of the seven seed-of-life circles for a given radius. */
export function seedOfLife(r: number): { x: number; y: number }[] {
  const pts = [{ x: 0, y: 0 }]
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return pts
}

/**
 * Hexagonal ring coordinates: ring 0 is the centre, ring 1 the six around
 * it, ring 2 the twelve after that, and so on — the flower of life's packing.
 * Returns axial (q, r) pairs in spiral order.
 */
export function hexSpiral(count: number): { q: number; r: number }[] {
  const out: { q: number; r: number }[] = [{ q: 0, r: 0 }]
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ]
  let ring = 1
  while (out.length < count) {
    // Start at the cell `ring` steps in direction 4, then walk each side.
    let q = dirs[4][0] * ring
    let r = dirs[4][1] * ring
    for (let side = 0; side < 6 && out.length < count; side++) {
      for (let step = 0; step < ring && out.length < count; step++) {
        out.push({ q, r })
        q += dirs[side][0]
        r += dirs[side][1]
      }
    }
    ring++
  }
  return out.slice(0, count)
}

/** Axial hex → pixel, pointy-top. */
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r,
  }
}

/** Corners of a pointy-top hexagon at (cx, cy). */
export function hexPath(cx: number, cy: number, size: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

/** The flower of life as an SVG pattern body — circles on a hex lattice. */
export function flowerOfLifeCircles(radius: number, rings: number): { cx: number; cy: number }[] {
  const out: { cx: number; cy: number }[] = []
  const cells = hexSpiral(1 + 3 * rings * (rings + 1))
  for (const c of cells) {
    const p = hexToPixel(c.q, c.r, radius / Math.sqrt(3))
    out.push({ cx: p.x, cy: p.y })
  }
  return out
}

/** Breathing pattern: in for a, hold for b, out for a·phi. Returns 0–1 lung fill at t seconds. */
export function breathAt(t: number, inhale = 4, hold = 2): number {
  const exhale = inhale * PHI
  const total = inhale + hold + exhale
  const u = ((t % total) + total) % total
  if (u < inhale) return easeInOut(u / inhale)
  if (u < inhale + hold) return 1
  return 1 - easeInOut((u - inhale - hold) / exhale)
}

function easeInOut(x: number) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}
