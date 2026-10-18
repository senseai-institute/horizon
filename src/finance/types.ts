/**
 * The money model: one ledger that holds the core, the thesis sleeve, cash,
 * subscriptions and planned purchases, so that every horizon draws on the same
 * balance. Cancelling a subscription frees money a purchase can use; a
 * purchase takes cash a bet would have used; the sleeve is sized against the
 * whole.
 *
 * Nothing here touches React or the DOM. Today it runs in the browser against
 * mock adapters; the same module can run behind a server once a real broker
 * and bank are wired in.
 */

/** YYYY-MM-DD, a market day on the simulated calendar. */
export type Day = string

export type Direction = 'up' | 'down'
export type Bucket = 'core' | 'thesis'

export interface Theme {
  /** Lower-case key, also the canonical word used in sentences. */
  key: string
  label: string
  symbol: string
  /** Other ways of saying it. */
  aliases: string[]
  /** Mock price engine: yearly drift and volatility, and a starting price. */
  drift: number
  vol: number
  base: number
}

export interface CoreTarget {
  symbol: string
  label: string
  /** Percent of the core, summing to 100. */
  weight: number
}

export interface Settings {
  /** Share of the whole account the thesis sleeve may use. */
  sleevePct: number
  corePct: number
  /** Largest single bet, in dollars. */
  perBetCap: number
  /** Auto-exit for down bets, as % of money in. −100 means "closes once you have lost what you put in". */
  defaultAutoExitPct: number
  /** Yearly borrow fee charged on down bets, percent. */
  borrowFeePct: number
  /** Purchases above this wait thirty days before they can be bought. */
  coolOffAboveUsd: number
  coolOffDays: number
  /** Automatic transfer in from checking on the first market day of each month. */
  monthlyDepositUsd: number
  monthlyEmail: boolean
  coreTargets: CoreTarget[]
  themes: Theme[]
}

export interface Account {
  cash: number
}

/** Core holdings. Thesis positions live on their bet. */
export interface Holding {
  id: string
  symbol: string
  qty: number
  avgCost: number
  bucket: Bucket
}

export type BetStatus = 'open' | 'closed'
export type CloseReason = 'deadline' | 'auto-exit' | 'manual'
export type Verdict = 'win' | 'loss' | 'flat'

/** A thesis: one sentence, one direction, one deadline. */
export interface Bet {
  id: string
  sentence: string
  direction: Direction
  themeKey: string
  themeLabel: string
  symbol: string
  dollarsIn: number
  /** Always positive; a down bet is short this many units. */
  qty: number
  entryPrice: number
  entryDate: Day
  deadline: Day
  /** Close when the loss reaches this % of money in. null = runs to the deadline. */
  autoExitPct: number | null
  borrowFeePct: number
  feesPaid: number
  status: BetStatus
  closeReason?: CloseReason
  closePrice?: number
  closeDate?: Day
  realizedPnl?: number
  verdict?: Verdict
  /** What the core returned over the same days, for the lesson. */
  coreReturnPct?: number
  /** A belief on the map this bet expresses, if any. */
  beliefId?: string
}

export interface JournalNote {
  id: string
  betId: string
  date: Day
  at: string
  note: string
  source: 'user' | 'system'
}

export type OrderSide = 'buy' | 'sell' | 'short' | 'cover'
export type OrderStatus = 'proposed' | 'filled' | 'expired' | 'cancelled' | 'rejected'

export interface Order {
  id: string
  betId?: string
  proposalId: string
  symbol: string
  side: OrderSide
  qty: number
  price: number
  dollars: number
  bucket: Bucket
  status: OrderStatus
  code: string
  createdAt: string
  filledAt?: string
  filledDay?: Day
}

export interface Deposit {
  id: string
  amount: number
  date: Day
  source: 'mock' | 'plaid'
}

export interface Snapshot {
  date: Day
  totalValue: number
  coreValue: number
  coreCost: number
  sleeveValue: number
  sleeveCost: number
  realizedCum: number
  cash: number
}

export type SubscriptionStatus = 'active' | 'cancelling' | 'cancelled'

export interface Subscription {
  id: string
  name: string
  category: string
  amount: number
  cadence: 'monthly' | 'yearly'
  nextCharge: Day
  /** Days since you last used it, from whatever signal is available. */
  lastUsedDaysAgo: number | null
  cancelHow: string
  status: SubscriptionStatus
  /** Where the freed money goes once it is cancelled. */
  redirectTo?: { kind: 'purchase'; purchaseId: string } | { kind: 'cash' }
  cancelledOn?: Day
  detectedFrom: 'bank' | 'manual'
}

export type PurchaseStatus = 'planned' | 'bought' | 'dropped'

export interface Purchase {
  id: string
  title: string
  price: number
  /** Set aside out of cash for this. Still cash, but not available. */
  saved: number
  monthly: number
  wantBy: Day
  createdOn: Day
  /** Before this day it cannot be bought. */
  coolOffUntil?: Day
  status: PurchaseStatus
  note?: string
  boughtOn?: Day
}

export type TxnKind = 'deposit' | 'subscription' | 'purchase' | 'fee' | 'bet-open' | 'bet-close' | 'core-buy' | 'core-sell'

export interface Txn {
  id: string
  date: Day
  kind: TxnKind
  label: string
  /** Signed effect on cash. */
  amount: number
}

/* ------------------------------------------------------------------ */
/* Commands, proposals, codes                                          */
/* ------------------------------------------------------------------ */

export interface BetSpec {
  kind: 'bet'
  sentence: string
  direction: Direction
  themeKey: string
  deadline: Day
  amount: number
  autoExitPct: number | null
}

export type Command =
  | BetSpec
  | { kind: 'cancel'; query: string }
  | { kind: 'plan'; title: string; price: number; wantBy: Day; monthly?: number }
  | { kind: 'buy'; query: string }
  | { kind: 'deposit'; amount: number }
  | { kind: 'rebalance' }
  | { kind: 'close'; query: string; betId?: string }
  | { kind: 'forward'; days: number }

export type ParseResult =
  | { ok: true; command: Command }
  | { ok: false; reason: 'unknown-theme'; message: string; thing: string; suggestions: Theme[]; partial: Omit<BetSpec, 'themeKey'> }
  | { ok: false; reason: 'malformed'; message: string }

export type ProposalKind = 'bet' | 'close' | 'rebalance' | 'deposit' | 'cancel' | 'plan' | 'buy'
export type ProposalStatus = 'pending' | 'used' | 'expired' | 'dismissed'

export interface CardLine {
  label: string
  value: string
}

export interface Proposal {
  id: string
  kind: ProposalKind
  title: string
  lines: CardLine[]
  /** Six characters. Empty when nothing moves money (a plan). */
  code: string
  createdAt: string
  expiresAt: string
  status: ProposalStatus
  orderIds: string[]
  payload:
    | { kind: 'bet'; spec: BetSpec; symbol: string; price: number; qty: number }
    | { kind: 'close'; betId: string }
    | { kind: 'rebalance' }
    | { kind: 'deposit'; amount: number }
    | { kind: 'cancel'; subscriptionId: string; redirect: Subscription['redirectTo'] }
    | { kind: 'plan'; title: string; price: number; wantBy: Day; monthly: number }
    | { kind: 'buy'; purchaseId: string }
}

export interface Ledger {
  version: 1
  /** The last market day priced. Fast-forward moves it past today. */
  asOf: Day
  days: Day[]
  prices: Record<string, number[]>
  account: Account
  settings: Settings
  holdings: Holding[]
  bets: Bet[]
  journal: JournalNote[]
  orders: Order[]
  deposits: Deposit[]
  snapshots: Snapshot[]
  subscriptions: Subscription[]
  purchases: Purchase[]
  transactions: Txn[]
  proposals: Proposal[]
}
