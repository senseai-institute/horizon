import { describe, expect, it } from 'vitest'
import { parseCommand } from '../parser'
import { seedThemes } from '../themes'
import type { BetSpec } from '../types'

const ctx = { themes: seedThemes, today: '2026-10-18' }
const bet = (s: string) => {
  const r = parseCommand(s, ctx)
  if (!r.ok || r.command.kind !== 'bet') throw new Error(`not a bet: ${s} → ${JSON.stringify(r)}`)
  return r.command as BetSpec
}

describe('bet sentences', () => {
  const cases: [string, Partial<BetSpec>][] = [
    ['short coffee, 18mo, $100', { direction: 'down', themeKey: 'coffee', deadline: '2028-04-18', amount: 100 }],
    ['long nuclear, 2y, $250', { direction: 'up', themeKey: 'nuclear', deadline: '2028-10-18', amount: 250 }],
    ['long copper, 2028, 1k', { direction: 'up', themeKey: 'copper', deadline: '2028-12-31', amount: 1000 }],
    ['bet against office real estate, 6mo, 250', { direction: 'down', themeKey: 'office real estate', deadline: '2027-04-18', amount: 250 }],
    ['bet on AI chips, 1y, $1.5k', { direction: 'up', themeKey: 'ai chips', deadline: '2027-10-18', amount: 1500 }],
    ['up Japan, 9 months, $300', { direction: 'up', themeKey: 'japan', deadline: '2027-07-18', amount: 300 }],
    ['down oil, 90d, $75', { direction: 'down', themeKey: 'oil', deadline: '2027-01-16', amount: 75 }],
    ['short coffee 18mo $100', { direction: 'down', themeKey: 'coffee', deadline: '2028-04-18', amount: 100 }],
    ['long uranium, jun 2027, $200', { themeKey: 'nuclear', deadline: '2027-06-30', amount: 200 }],
    ['long nuclear 2y 250 exit -40%', { themeKey: 'nuclear', amount: 250, autoExitPct: -40 }],
    ['Short the office REITs, 1 year, $1,000', { direction: 'down', themeKey: 'office real estate', amount: 1000, deadline: '2027-10-18' }],
    ['gold goes up, 2y, $400', { direction: 'up', themeKey: 'gold', amount: 400 }],
    ['long semiconductors, 18 months, 200 dollars', { themeKey: 'ai chips', amount: 200, deadline: '2028-04-18' }],
    ['bet against bitcoin, 6w, $50', { direction: 'down', themeKey: 'bitcoin', amount: 50, deadline: '2026-11-29' }],
    ['long india, end of 2027, $150', { themeKey: 'india', deadline: '2027-12-31', amount: 150 }],
  ]
  for (const [sentence, want] of cases) it(sentence, () => expect(bet(sentence)).toMatchObject(want))

  it('keeps the original sentence and leaves the auto-exit to the guardrail', () => {
    const b = bet('short coffee, 18mo, $100')
    expect(b.sentence).toBe('short coffee, 18mo, $100')
    expect(b.autoExitPct).toBeNull()
  })
})

describe('malformed sentences', () => {
  const bad: [string, RegExp][] = [
    ['short coffee, 18mo', /how much/i],
    ['long nuclear, $250', /by when/i],
    ['short coffee, 18mo, $0', /more than \$0/i],
    ['long copper, 2025, $100', /already past/i],
    ['coffee is overrated', /didn't follow/i],
  ]
  for (const [sentence, msg] of bad)
    it(sentence, () => {
      const r = parseCommand(sentence, ctx)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.message).toMatch(msg)
    })

  it('never guesses an unknown theme — it offers the three closest', () => {
    const r = parseCommand('long uranium miners in kazakhstan, 2y, $100', ctx)
    expect(r.ok).toBe(false)
    if (!r.ok && r.reason === 'unknown-theme') {
      expect(r.suggestions).toHaveLength(3)
      expect(r.message).toMatch(/closest I have is/i)
    } else throw new Error('expected unknown-theme')
  })

  it('suggests something sensible for a near miss', () => {
    const r = parseCommand('short cofee futures, 1y, $100', ctx)
    expect(!r.ok && r.reason === 'unknown-theme' && r.suggestions.map((s) => s.key)).toContain('coffee')
  })
})

describe('the other horizons', () => {
  it('cancel', () => expect(parseCommand('cancel netflix', ctx)).toMatchObject({ ok: true, command: { kind: 'cancel', query: 'netflix' } }))
  it('plan', () =>
    expect(parseCommand('save for a road bike, $1400, by april 2027', ctx)).toMatchObject({ ok: true, command: { kind: 'plan', title: 'Road bike', price: 1400, wantBy: '2027-04-30' } }))
  it('plan with a monthly', () => expect(parseCommand('plan headphones $350 3mo $100/mo', ctx)).toMatchObject({ ok: true, command: { kind: 'plan', price: 350, monthly: 100 } }))
  it('buy', () => expect(parseCommand('buy the road bike', ctx)).toMatchObject({ ok: true, command: { kind: 'buy', query: 'road bike' } }))
  it('deposit', () => expect(parseCommand('add $500', ctx)).toMatchObject({ ok: true, command: { kind: 'deposit', amount: 500 } }))
  it('rebalance', () => expect(parseCommand('rebalance', ctx)).toMatchObject({ ok: true, command: { kind: 'rebalance' } }))
  it('close', () => expect(parseCommand('close coffee', ctx)).toMatchObject({ ok: true, command: { kind: 'close', query: 'coffee' } }))
  it('fast-forward', () => expect(parseCommand('ff 30', ctx)).toMatchObject({ ok: true, command: { kind: 'forward', days: 30 } }))
})
