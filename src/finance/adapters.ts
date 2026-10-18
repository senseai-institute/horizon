import { qtyFromDollars } from './guardrails'
import { availableCash, coreValue, priceOn } from './valuation'
import type { Bucket, Day, Ledger, OrderSide, Txn } from './types'

/**
 * The swap points. The UI and the engine only ever talk to a Broker and a
 * Bank. Today both are mocks that read and write the ledger's own price table
 * and cash; AlpacaBroker and PlaidBank are the same plugs, not yet wired.
 *
 * The server's BROKER and BANK variables pick which one runs (served on
 * /api/status). A real broker never runs in the browser — its adapter will be
 * a thin HTTP client to the server, which holds the keys and re-checks the
 * guardrails before sending anything.
 */

export interface OrderRequest {
  symbol: string
  side: OrderSide
  /** Exactly one of dollars or qty. Dollars are turned into a quantity here, never typed. */
  dollars?: number
  qty?: number
  bucket: Bucket
}

export interface OrderResult {
  status: 'filled' | 'rejected'
  qty: number
  price: number
  day: Day
  reason?: string
}

export interface Position {
  symbol: string
  qty: number
  bucket: Bucket
  /** Signed: negative for a down bet. */
  side: 'long' | 'short'
  betId?: string
}

export interface Broker {
  readonly name: 'mock' | 'alpaca'
  getPrice(symbol: string): Promise<number>
  placeOrder(o: OrderRequest): Promise<OrderResult>
  getPositions(): Promise<Position[]>
}

export interface DepositResult {
  status: 'settled' | 'pending' | 'failed'
  amount: number
  day: Day
}

export interface Bank {
  readonly name: 'mock' | 'plaid'
  deposit(amount: number): Promise<DepositResult>
  balance(): Promise<number>
  /** Recent money out, for spotting subscriptions. */
  transactions(sinceDay: Day): Promise<Txn[]>
}

/** Fills at the last simulated close. No slippage, no commission. */
export class MockBroker implements Broker {
  readonly name = 'mock' as const
  constructor(private ledger: () => Ledger) {}

  async getPrice(symbol: string): Promise<number> {
    return priceOn(this.ledger(), symbol)
  }

  async placeOrder(o: OrderRequest): Promise<OrderResult> {
    const l = this.ledger()
    const price = priceOn(l, o.symbol)
    const qty = o.qty ?? qtyFromDollars(o.dollars ?? 0, price)
    if (!(qty > 0)) return { status: 'rejected', qty: 0, price, day: l.asOf, reason: 'Nothing to fill.' }
    return { status: 'filled', qty, price, day: l.asOf }
  }

  async getPositions(): Promise<Position[]> {
    const l = this.ledger()
    return [
      ...l.holdings.map((h) => ({ symbol: h.symbol, qty: h.qty, bucket: h.bucket, side: 'long' as const })),
      ...l.bets.filter((b) => b.status === 'open').map((b) => ({ symbol: b.symbol, qty: b.direction === 'up' ? b.qty : -b.qty, bucket: 'thesis' as const, side: b.direction === 'up' ? ('long' as const) : ('short' as const), betId: b.id })),
    ]
  }
}

/** A checking account that always says yes, instantly. */
export class MockBank implements Bank {
  readonly name = 'mock' as const
  constructor(private ledger: () => Ledger) {}

  async deposit(amount: number): Promise<DepositResult> {
    if (!(amount > 0)) return { status: 'failed', amount, day: this.ledger().asOf }
    return { status: 'settled', amount, day: this.ledger().asOf }
  }

  async balance(): Promise<number> {
    return availableCash(this.ledger())
  }

  async transactions(sinceDay: Day): Promise<Txn[]> {
    return this.ledger().transactions.filter((t) => t.date >= sinceDay)
  }
}

const notWired = (what: string) => new Error(`${what} is not wired yet. Set it back to mock, or finish the adapter in src/finance/adapters.ts.`)

/** Next: paper trading first, fractional shares, server-side keys. */
export class AlpacaBroker implements Broker {
  readonly name = 'alpaca' as const
  async getPrice(): Promise<number> {
    throw notWired('AlpacaBroker')
  }
  async placeOrder(): Promise<OrderResult> {
    throw notWired('AlpacaBroker')
  }
  async getPositions(): Promise<Position[]> {
    throw notWired('AlpacaBroker')
  }
}

/** After that: deposits from checking, and the transactions feed for subscriptions. */
export class PlaidBank implements Bank {
  readonly name = 'plaid' as const
  async deposit(): Promise<DepositResult> {
    throw notWired('PlaidBank')
  }
  async balance(): Promise<number> {
    throw notWired('PlaidBank')
  }
  async transactions(): Promise<Txn[]> {
    throw notWired('PlaidBank')
  }
}

export type BrokerName = Broker['name']
export type BankName = Bank['name']

export function makeBroker(name: BrokerName, ledger: () => Ledger): Broker {
  return name === 'alpaca' ? new AlpacaBroker() : new MockBroker(ledger)
}

export function makeBank(name: BankName, ledger: () => Ledger): Bank {
  return name === 'plaid' ? new PlaidBank() : new MockBank(ledger)
}

/** Used by the Core screen and the rebalance card. */
export function coreWeights(l: Ledger): { symbol: string; label: string; value: number; pct: number; target: number; drift: number }[] {
  const total = coreValue(l)
  return l.settings.coreTargets.map((t) => {
    const h = l.holdings.find((x) => x.bucket === 'core' && x.symbol === t.symbol)
    const value = h ? h.qty * priceOn(l, t.symbol) : 0
    const pct = total > 0 ? (value / total) * 100 : 0
    return { symbol: t.symbol, label: t.label, value, pct, target: t.weight, drift: pct - t.weight }
  })
}
