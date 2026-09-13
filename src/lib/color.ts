/**
 * Confidence colour scale. Clay for low, sand for the middle, sage for high.
 * Deliberately desaturated — the gauge should read as a pencil mark, not a
 * traffic light.
 */
const STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0, rgb: [138, 68, 54] },
  { at: 32, rgb: [173, 103, 74] },
  { at: 46, rgb: [196, 156, 86] },
  { at: 56, rgb: [161, 160, 95] },
  { at: 66, rgb: [107, 141, 100] },
  { at: 80, rgb: [72, 116, 85] },
  { at: 100, rgb: [48, 94, 70] },
]

export function confidenceColor(value: number): string {
  const v = Math.max(0, Math.min(100, value))
  let lo = STOPS[0]
  let hi = STOPS[STOPS.length - 1]
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (v >= STOPS[i].at && v <= STOPS[i + 1].at) {
      lo = STOPS[i]
      hi = STOPS[i + 1]
      break
    }
  }
  const span = hi.at - lo.at || 1
  const t = (v - lo.at) / span
  const mix = lo.rgb.map((c, i) => Math.round(c + (hi.rgb[i] - c) * t))
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`
}

/** Plain words for a number, so the page never relies on colour alone. */
export function confidenceWord(value: number): string {
  if (value >= 75) return 'Well supported'
  if (value >= 62) return 'Supported'
  if (value >= 48) return 'Mixed'
  if (value >= 34) return 'Weak'
  return 'Contradicted'
}

export const KIND_LABEL: Record<string, string> = {
  pillar: 'Pillar',
  thesis: 'Thesis',
  category: 'Category',
  company: 'Company',
}
