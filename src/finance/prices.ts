import { CORE_ENGINE } from './themes'
import type { Theme } from './types'

/**
 * The mock price engine. Each symbol walks randomly with its own drift and
 * volatility. The noise is a pure function of (symbol, day index), so a
 * series is the same however many times it is generated — tests are stable
 * and a symbol added late lines up with one added early.
 */

const TRADING_DAYS = 252

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 on a seed. */
function uniform(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A standard normal draw for one symbol on one day (Box–Muller). */
export function noise(symbol: string, index: number): number {
  const h = hash(symbol)
  const u1 = Math.max(1e-9, uniform(h ^ Math.imul(index + 1, 0x9e3779b1)))
  const u2 = uniform((h + 0x85ebca6b) ^ Math.imul(index + 7, 0xc2b2ae35))
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export interface EngineParams {
  drift: number
  vol: number
  base: number
}

export function engineFor(symbol: string, themes: Theme[]): EngineParams {
  const core = CORE_ENGINE[symbol]
  if (core) return core
  const th = themes.find((x) => x.symbol === symbol)
  if (th) return { drift: th.drift, vol: th.vol, base: th.base }
  /* Something typed into the table by hand: a plain, middling walk. */
  return { drift: 0.05, vol: 0.25, base: 20 + (hash(symbol) % 80) }
}

/**
 * How hard a price is pulled back toward its trend line each day. Pure random
 * walks wander so far over a few years that the drift — the thing a thesis is
 * about — gets lost; this keeps a symbol within roughly ±25% of its trend.
 */
const REVERSION = 0.004

/** The next close after `prev`, on day `index`. */
export function step(symbol: string, prev: number, index: number, p: EngineParams): number {
  const sigma = p.vol / Math.sqrt(TRADING_DAYS)
  const mu = p.drift / TRADING_DAYS - (sigma * sigma) / 2
  const trend = (i: number) => Math.log(p.base) + mu * i
  const deviation = Math.log(prev) - trend(index - 1)
  const next = Math.exp(trend(index) + deviation * (1 - REVERSION) + sigma * noise(symbol, index))
  return Math.round(next * 100) / 100
}

/** A whole series of n closes. */
export function series(symbol: string, n: number, p: EngineParams): number[] {
  const out: number[] = [p.base]
  for (let i = 1; i < n; i++) out.push(step(symbol, out[i - 1], i, p))
  return out
}
