import { describe, expect, it } from 'vitest'
import { MockBank, MockBroker } from '../adapters'
import { addMonths } from '../calendar'
import { confirm, propose } from '../engine'
import { CODE_TTL_MS, autoExitFor, mintCode, qtyFromDollars, sleeveRoom, verifyCode } from '../guardrails'
import { seedLedger } from '../seed'
import type { BetSpec, Ledger } from '../types'
import { priceOn, totalValue } from '../valuation'

const T0 = Date.parse('2026-10-18T15:00:00Z')
const fresh = () => seedLedger('2026-10-18')
const spec = (l: Ledger, over: Partial<BetSpec> = {}): BetSpec => ({
  kind: 'bet',
  sentence: 'short coffee, 18mo, $100',
  direction: 'down',
  themeKey: 'coffee',
  deadline: addMonths(l.asOf, 18),
  amount: 100,
  autoExitPct: null,
  ...over,
})
const adapters = (get: () => Ledger) => [new MockBroker(get), new MockBank(get)] as const

function proposeBet(l: Ledger, over: Partial<BetSpec> = {}) {
  const r = propose(l, spec(l, over), T0)
  if (!r.ok) throw new Error(r.message)
  return r
}

describe('1 · codes: valid, unexpired, single-use', () => {
  it('mints six unambiguous characters', () => {
    for (let i = 0; i < 50; i++) expect(mintCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('refuses a wrong code and places nothing', async () => {
    const { ledger, proposal } = proposeBet(fresh())
    const [b, k] = adapters(() => ledger)
    const r = await confirm(ledger, proposal.id, 'WRONG1', T0 + 5_000, b, k)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/doesn't match/)
    expect(r.ledger.bets.length).toBe(ledger.bets.length)
  })

  it('refuses the right code after 120 seconds', async () => {
    const { ledger, proposal } = proposeBet(fresh())
    const [b, k] = adapters(() => ledger)
    const r = await confirm(ledger, proposal.id, proposal.code, T0 + CODE_TTL_MS + 1, b, k)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/expired/)
    expect(r.ledger.proposals.find((p) => p.id === proposal.id)?.status).toBe('expired')
    expect(r.ledger.orders.filter((o) => proposal.orderIds.includes(o.id)).every((o) => o.status === 'expired')).toBe(true)
  })

  it('accepts the right code once, then never again', async () => {
    const { ledger, proposal } = proposeBet(fresh())
    let current = ledger
    const [b, k] = adapters(() => current)
    const first = await confirm(current, proposal.id, proposal.code.toLowerCase(), T0 + 30_000, b, k)
    expect(first.ok).toBe(true)
    current = first.ledger
    expect(current.bets.length).toBe(ledger.bets.length + 1)
    const order = current.orders.find((o) => o.id === proposal.orderIds[0])!
    expect(order).toMatchObject({ status: 'filled', code: proposal.code, side: 'short' })
    const again = await confirm(current, proposal.id, proposal.code, T0 + 40_000, b, k)
    expect(again.ok).toBe(false)
    expect(again.message).toMatch(/already been used/)
    expect(again.ledger.bets.length).toBe(current.bets.length)
  })

  it('verifyCode on its own', () => {
    const { proposal } = proposeBet(fresh())
    expect(verifyCode(proposal, proposal.code, T0).ok).toBe(true)
    expect(verifyCode({ ...proposal, status: 'used' }, proposal.code, T0).ok).toBe(false)
    expect(verifyCode(proposal, proposal.code, T0 + CODE_TTL_MS + 1).ok).toBe(false)
  })
})

describe('2 · quantity comes from dollars', () => {
  it('sizes fractionally from dollars and price', () => {
    expect(qtyFromDollars(100, 40)).toBe(2.5)
    expect(qtyFromDollars(100, 3)).toBeCloseTo(33.333333, 6)
    expect(() => qtyFromDollars(100, 0)).toThrow()
  })

  it('the placed bet holds dollars ÷ price units', async () => {
    const { ledger, proposal } = proposeBet(fresh(), { amount: 137 })
    const [b, k] = adapters(() => ledger)
    const r = await confirm(ledger, proposal.id, proposal.code, T0 + 1_000, b, k)
    if (!r.ok) throw new Error(r.message)
    const bet = r.ledger.bets[r.ledger.bets.length - 1]
    expect(bet.qty).toBeCloseTo(137 / priceOn(ledger, 'JO'), 5)
    expect(bet.dollarsIn).toBe(137)
  })
})

describe('3 · sleeve room', () => {
  it('open thesis dollars + new ≤ sleeve % × total', () => {
    const l = fresh()
    const room = sleeveRoom(l)
    expect(room.used).toBe(700)
    expect(room.limit).toBeCloseTo((20 / 100) * totalValue(l), 6)
    l.settings.sleevePct = 7.5
    const r = propose(l, spec(l), T0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/sleeve has \$\d+ of room/)
  })

  it('is checked again at confirmation', async () => {
    const { ledger, proposal } = proposeBet(fresh())
    const shrunk: Ledger = { ...ledger, settings: { ...ledger.settings, sleevePct: 5 } }
    const [b, k] = adapters(() => shrunk)
    const r = await confirm(shrunk, proposal.id, proposal.code, T0 + 1_000, b, k)
    expect(r.ok).toBe(false)
    expect(r.ledger.bets.length).toBe(ledger.bets.length)
  })

  it('respects the per-bet cap', () => {
    const l = fresh()
    const r = propose(l, spec(l, { amount: 501 }), T0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/per-bet cap/)
  })
})

describe('4 · auto-exit defaults', () => {
  const settings = fresh().settings
  it('down bets get −100% by default', () => expect(autoExitFor({ direction: 'down', autoExitPct: null }, settings)).toBe(-100))
  it('up bets get none unless asked', () => expect(autoExitFor({ direction: 'up', autoExitPct: null }, settings)).toBeNull())
  it('an explicit exit wins, always as a loss', () => expect(autoExitFor({ direction: 'up', autoExitPct: 40 }, settings)).toBe(-40))
  it('the proposal card says so in plain English', () => {
    const { proposal } = proposeBet(fresh())
    const line = (label: string) => proposal.lines.find((x) => x.label === label)?.value
    expect(line('Bet')).toBe('coffee price goes DOWN')
    expect(line('Money in')).toBe('$100')
    expect(line('Auto-exit')).toBe("closes if you've lost $100")
    expect(line('Worst case')).toBe('~$100 (can run a little over in a sharp spike)')
    expect(line('Fee')).toBe('~$0.50/mo')
  })
})

describe('5 · every bet has a deadline', () => {
  it('a bet without a future deadline cannot be proposed', () => {
    const l = fresh()
    for (const deadline of ['', 'soon', l.asOf, '2020-01-01']) {
      const r = propose(l, spec(l, { deadline }), T0)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.message).toMatch(/deadline in the future/)
    }
  })
  /* The tick closing it there is in tick.test.ts. */
})
