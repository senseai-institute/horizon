import type { Bet, Day, Ledger } from './types'

/** Close for a symbol on a day (default: the last day priced). */
export function priceOn(l: Ledger, symbol: string, day: Day = l.asOf): number {
  const s = l.prices[symbol]
  if (!s || s.length === 0) throw new Error(`No prices for ${symbol}`)
  let i = l.days.indexOf(day)
  if (i < 0) {
    /* Not a market day: the last close before it. */
    i = 0
    for (let j = l.days.length - 1; j >= 0; j--) if (l.days[j] <= day) { i = j; break }
  }
  return s[Math.min(i, s.length - 1)]
}

/** What a bet is worth right now: money in plus its gain or loss (fees aside). */
export function betValueAt(b: Bet, price: number): number {
  return b.direction === 'up' ? b.qty * price : b.dollarsIn - b.qty * (price - b.entryPrice)
}

export function betValue(l: Ledger, b: Bet, day: Day = l.asOf): number {
  if (b.status === 'closed') return 0
  return betValueAt(b, priceOn(l, b.symbol, day))
}

/** Gain or loss including fees, in dollars. */
export function betPnl(l: Ledger, b: Bet, day: Day = l.asOf): number {
  if (b.status === 'closed') return b.realizedPnl ?? 0
  return betValue(l, b, day) - b.dollarsIn - b.feesPaid
}

export function coreValue(l: Ledger, day: Day = l.asOf): number {
  return l.holdings.filter((h) => h.bucket === 'core').reduce((a, h) => a + h.qty * priceOn(l, h.symbol, day), 0)
}

export function coreCost(l: Ledger): number {
  return l.holdings.filter((h) => h.bucket === 'core').reduce((a, h) => a + h.qty * h.avgCost, 0)
}

export function openBets(l: Ledger): Bet[] {
  return l.bets.filter((b) => b.status === 'open')
}

export function sleeveValue(l: Ledger, day: Day = l.asOf): number {
  return openBets(l).reduce((a, b) => a + betValue(l, b, day), 0)
}

export function sleeveCost(l: Ledger): number {
  return openBets(l).reduce((a, b) => a + b.dollarsIn, 0)
}

/** Money set aside for planned purchases. Still cash, not spendable. */
export function setAside(l: Ledger): number {
  return l.purchases.filter((p) => p.status === 'planned').reduce((a, p) => a + p.saved, 0)
}

export function availableCash(l: Ledger): number {
  return l.account.cash - setAside(l)
}

export function totalValue(l: Ledger, day: Day = l.asOf): number {
  return l.account.cash + coreValue(l, day) + sleeveValue(l, day)
}

export function realizedCum(l: Ledger): number {
  return l.bets.filter((b) => b.status === 'closed').reduce((a, b) => a + (b.realizedPnl ?? 0), 0)
}

/** Recurring money out, per month. */
export function monthlySubscriptions(l: Ledger, statuses: ('active' | 'cancelling' | 'cancelled')[] = ['active']): number {
  return l.subscriptions.filter((s) => statuses.includes(s.status)).reduce((a, s) => a + (s.cadence === 'yearly' ? s.amount / 12 : s.amount), 0)
}

export const round2 = (n: number) => Math.round(n * 100) / 100
