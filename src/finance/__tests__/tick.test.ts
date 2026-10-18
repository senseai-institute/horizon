import { describe, expect, it } from 'vitest'
import { nextMarketDay } from '../calendar'
import { advance, catchUp, openBetDirect, scorecard, tick } from '../engine'
import { seedLedger } from '../seed'
import type { Ledger } from '../types'
import { priceOn } from '../valuation'

const fresh = () => seedLedger('2026-10-18')

function withBet(l: Ledger, over: { direction?: 'up' | 'down'; deadline?: string; autoExitPct?: number | null } = {}) {
  const bet = openBetDirect(l, {
    kind: 'bet',
    sentence: 'test',
    direction: over.direction ?? 'down',
    themeKey: 'coffee',
    deadline: over.deadline ?? '2028-04-18',
    amount: 100,
    autoExitPct: over.autoExitPct ?? null,
  })
  return bet.id
}

describe('the daily tick', () => {
  it('advances every price one market day and writes a snapshot', () => {
    const l = fresh()
    const before = l.snapshots.length
    const next = tick(l)
    expect(next.asOf).toBe(nextMarketDay(l.asOf))
    expect(next.days.length).toBe(l.days.length + 1)
    for (const s of Object.keys(l.prices)) expect(next.prices[s].length).toBe(l.prices[s].length + 1)
    expect(next.snapshots.length).toBe(before + 1)
    expect(next.snapshots.at(-1)!.date).toBe(next.asOf)
    /* The original is untouched. */
    expect(l.snapshots.length).toBe(before)
  })

  it('fires the auto-exit on a sharp spike against a down bet', () => {
    const l = fresh()
    const id = withBet(l)
    const bet = l.bets.find((b) => b.id === id)!
    /* Pretend it was entered far lower: the price is now ~2.5× entry. */
    bet.entryPrice = priceOn(l, 'JO') / 2.5
    bet.qty = 100 / bet.entryPrice
    const next = tick(l)
    const closed = next.bets.find((b) => b.id === id)!
    expect(closed.status).toBe('closed')
    expect(closed.closeReason).toBe('auto-exit')
    expect(closed.verdict).toBe('loss')
    /* "Can run a little over": the loss is past $100 here. */
    expect(closed.realizedPnl!).toBeLessThan(-100)
    expect(next.journal.filter((j) => j.betId === id).at(-1)!.note).toMatch(/^Auto-exit fired/)
  })

  it('closes a bet at its deadline, with a verdict and a system journal line', () => {
    const l = fresh()
    const id = withBet(l, { direction: 'up', deadline: nextMarketDay(l.asOf) })
    const next = tick(l)
    const closed = next.bets.find((b) => b.id === id)!
    expect(closed).toMatchObject({ status: 'closed', closeReason: 'deadline', closeDate: next.asOf })
    expect(['win', 'loss', 'flat']).toContain(closed.verdict)
    const last = next.journal.filter((j) => j.betId === id).at(-1)!
    expect(last.source).toBe('system')
    expect(last.note).toMatch(/^Closed at deadline: (win|loss|flat)/)
  })

  it('charges down bets their borrow fee every day', () => {
    const l = fresh()
    const id = withBet(l)
    const next = advance(l, 21)
    expect(next.bets.find((b) => b.id === id)!.feesPaid).toBeCloseTo(0.5, 1)
  })

  it('charges subscriptions and stops a cancelled one at the period end', () => {
    const l = fresh()
    const sub = l.subscriptions.find((s) => s.name === 'Netflix')!
    sub.status = 'cancelling'
    const next = advance(l, 15)
    expect(next.subscriptions.find((s) => s.id === sub.id)!.status).toBe('cancelled')
    expect(next.transactions.filter((t) => t.kind === 'subscription' && t.label === 'Spotify' && t.date > l.asOf).length).toBe(1)
    expect(next.transactions.some((t) => t.label === 'Netflix' && t.date > l.asOf)).toBe(false)
  })

  it('fast-forwards thirty days and catches up to the wall clock', () => {
    const l = fresh()
    expect(advance(l, 30).snapshots.length).toBe(l.snapshots.length + 30)
    const caught = catchUp(l, '2026-10-25')
    expect(caught.days).toBe(5)
    expect(catchUp(caught.ledger, '2026-10-25').days).toBe(0)
  })
})

describe('the seed', () => {
  it('has four open theses and two closed — one win, one loss — with lessons', () => {
    const l = fresh()
    expect(l.bets.filter((b) => b.status === 'open')).toHaveLength(4)
    const closed = l.bets.filter((b) => b.status === 'closed')
    expect(closed.map((b) => b.verdict).sort()).toEqual(['loss', 'win'])
    const card = scorecard(l)
    expect(card.wins).toBe(1)
    expect(card.losses).toBe(1)
    expect(card.lessons.every((x) => x.note?.note.startsWith('Lesson'))).toBe(true)
    expect(l.snapshots.length).toBeGreaterThan(250)
    expect(JSON.stringify(l).length).toBeLessThan(400_000)
  })
})

describe('cancelling a subscription', () => {
  it('sends the money to a committed plan, not one still cooling off', async () => {
    const { propose } = await import('../engine')
    const l = fresh()
    const r = propose(l, { kind: 'cancel', query: 'adobe' }, Date.parse('2026-10-18T15:00:00Z'))
    if (!r.ok) throw new Error(r.message)
    const p = r.proposal.payload
    const to = p.kind === 'cancel' ? p.redirect : undefined
    const target = to?.kind === 'purchase' ? l.purchases.find((x) => x.id === to.purchaseId) : undefined
    expect(target?.title).toBeDefined()
    expect(target?.title).not.toMatch(/headphones/i)
  })
})
