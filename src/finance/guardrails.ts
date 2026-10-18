import { availableCash, openBets, sleeveCost, totalValue } from './valuation'
import type { BetSpec, Ledger, Proposal, Settings } from './types'

/**
 * The rules nothing gets past. Each is a plain function so it can be tested
 * on its own and run again at the moment of confirming — the world may have
 * moved in the two minutes since the card was shown.
 *
 *   1. Nothing places without a valid, unexpired, single-use code.
 *   2. Quantity is computed from dollars, never typed.
 *   3. Open thesis dollars + the new bet ≤ sleeve % × the whole account.
 *   4. Down bets get an auto-exit at −100% of money in by default.
 *   5. Every bet has a deadline; the tick closes it there (engine.ts).
 */

export const CODE_TTL_MS = 120_000
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Six characters with no 0/O or 1/I/L to confuse. */
export function mintCode(random: () => number = secureRandom): string {
  let out = ''
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)]
  return out
}

function secureRandom(): number {
  const c = globalThis.crypto
  if (c?.getRandomValues) {
    const a = new Uint32Array(1)
    c.getRandomValues(a)
    return a[0] / 4294967296
  }
  return Math.random()
}

export type CodeCheck = { ok: true } | { ok: false; reason: 'mismatch' | 'expired' | 'used' | 'dismissed'; message: string }

export function verifyCode(p: Proposal, typed: string, nowMs: number): CodeCheck {
  if (p.status === 'used') return { ok: false, reason: 'used', message: 'That code has already been used. Ask again for a new card.' }
  if (p.status === 'dismissed') return { ok: false, reason: 'dismissed', message: 'That card was dismissed.' }
  if (p.status === 'expired' || nowMs > Date.parse(p.expiresAt)) return { ok: false, reason: 'expired', message: 'That code has expired. Codes last two minutes — ask again.' }
  if (typed.trim().toUpperCase().replace(/\s+/g, '') !== p.code) return { ok: false, reason: 'mismatch', message: "That code doesn't match." }
  return { ok: true }
}

/** Guardrail 2. Fractional units are fine. */
export function qtyFromDollars(dollars: number, price: number): number {
  if (!(price > 0)) throw new Error('No price to size the order against.')
  if (!(dollars > 0)) throw new Error('The amount has to be more than $0.')
  return Math.floor((dollars / price) * 1e6) / 1e6
}

export interface SleeveRoom {
  limit: number
  used: number
  room: number
}

/** Guardrail 3. */
export function sleeveRoom(l: Ledger): SleeveRoom {
  const limit = (l.settings.sleevePct / 100) * totalValue(l)
  const used = sleeveCost(l)
  return { limit, used, room: Math.max(0, limit - used) }
}

/** Guardrail 4. Up bets run to their deadline unless an exit was asked for. */
export function autoExitFor(spec: Pick<BetSpec, 'direction' | 'autoExitPct'>, settings: Settings): number | null {
  if (spec.autoExitPct !== null && spec.autoExitPct !== undefined) return -Math.abs(spec.autoExitPct)
  return spec.direction === 'down' ? settings.defaultAutoExitPct : null
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/** Every reason a bet cannot be placed right now. Empty means it can. */
export function betProblems(l: Ledger, spec: Pick<BetSpec, 'amount'> & Partial<Pick<BetSpec, 'deadline'>>): string[] {
  const out: string[] = []
  if (spec.deadline !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(spec.deadline) || spec.deadline <= l.asOf)) out.push('Every bet needs a deadline in the future.')
  if (spec.amount > l.settings.perBetCap) out.push(`That's over your ${usd(l.settings.perBetCap)} per-bet cap (Settings).`)
  const room = sleeveRoom(l)
  if (spec.amount > room.room + 0.005)
    out.push(`The thesis sleeve has ${usd(room.room)} of room left: ${usd(room.used)} is in open bets against a ${usd(room.limit)} limit (${l.settings.sleevePct}% of the account).`)
  const cash = availableCash(l)
  if (spec.amount > cash + 0.005) out.push(`Only ${usd(cash)} of cash is available (the rest is set aside for purchases or invested).`)
  if (openBets(l).length >= 25) out.push('Twenty-five open bets is the most the sleeve holds. Close one first.')
  return out
}
